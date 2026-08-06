// =============================================================================
//  Data access for invoices. Two per booking in the provider journey:
//    party='customer' — SMART Drill → customer, 100% (number INVxxxxx)
//    party='provider' — provider → SMART Drill pro-forma, 90% (number PIxxxxx)
//  Numbers are sequential per prefix, minted inside the caller's transaction.
// =============================================================================
import client, { type Querier } from "../db/client.ts";

const db = (q?: Querier): Querier => q ?? client.query;

const invoiceRepo = {
  /** Mint the next <prefix>xxxxx and insert an issued invoice for a party. */
  async issue(
    { bookingId, amount, party, prefix }: { bookingId: number; amount: number; party: "customer" | "provider"; prefix: string },
    q?: Querier,
  ): Promise<{ id: number; number: string }> {
    const query = db(q);
    const seq = await query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(number, ?) AS UNSIGNED)), 0) AS m
         FROM invoices WHERE number LIKE CONCAT(?, '%')`,
      [prefix.length + 1, prefix],
    );
    const number = prefix + String(Number(seq[0]?.m ?? 0) + 1).padStart(5, "0");
    const res = await query(
      `INSERT INTO invoices (booking_id, party, number, amount, status) VALUES (?, ?, ?, ?, 'issued')`,
      [bookingId, party, number, amount],
    );
    return { id: res.insertId as number, number };
  },

  async byBooking(bookingId: number, party: "customer" | "provider" = "customer", q?: Querier) {
    const rows = await db(q)(
      `SELECT * FROM invoices WHERE booking_id = ? AND party = ? ORDER BY id DESC LIMIT 1`,
      [bookingId, party],
    );
    return rows[0];
  },

  allForBooking(bookingId: number, q?: Querier) {
    return db(q)(`SELECT id, party, number, amount, status, paid_at FROM invoices WHERE booking_id = ? ORDER BY id`, [bookingId]);
  },

  /** Mark the customer invoice paid (called when payment confirms). */
  async markPaidByBooking(bookingId: number, q?: Querier): Promise<void> {
    await db(q)(`UPDATE invoices SET status = 'paid', paid_at = NOW() WHERE booking_id = ? AND party = 'customer' AND status = 'issued'`, [bookingId]);
  },

  async voidForBooking(bookingId: number, q?: Querier): Promise<void> {
    await db(q)(`UPDATE invoices SET status = 'void' WHERE booking_id = ? AND status = 'issued'`, [bookingId]);
  },

  list(status?: string) {
    const where = status ? "WHERE i.status = ?" : "";
    const params = status ? [status] : [];
    return client.query(
      `SELECT i.id, i.party, i.number, i.amount, i.status, i.paid_at, i.created_at,
              b.request_no, sc.name AS service_name, c.display_name AS customer_name, c.phone AS customer_phone
         FROM invoices i
         JOIN bookings b ON b.id = i.booking_id
         JOIN service_categories sc ON sc.id = b.category_id
         JOIN users c ON c.id = b.customer_id
         ${where}
        ORDER BY i.id DESC LIMIT 200`,
      params,
    );
  },
};

export default invoiceRepo;
