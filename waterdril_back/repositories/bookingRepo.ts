// =============================================================================
//  Data access for bookings, booking_events and payments.
//  Transactional callers pass a `Querier`; others use the pool.
// =============================================================================
import client, { type Querier } from "../db/client.ts";

const db = (q?: Querier): Querier => q ?? client.query;

export interface BookingRow {
  id: number;
  uuid: string;
  customer_id: number;
  provider_id: number;
  category_id: number;
  status: string;
  deposit_amount: string;
  total_amount: string;
  amount_paid: string;
}

const bookingRepo = {
  /** Provider snapshot used when creating a booking. */
  async providerSnapshot(providerId: number) {
    const rows = await client.query(
      `SELECT pp.user_id, pp.category_id, pp.base_price, pp.availability,
              u.status AS user_status
         FROM provider_profiles pp
         JOIN users u ON u.id = pp.user_id
        WHERE pp.user_id = ? LIMIT 1`,
      [providerId],
    );
    return rows[0];
  },

  async create(
    { customerId, providerId, categoryId, depositAmount, totalAmount, address, lat, lng }: {
      customerId: number;
      providerId: number;
      categoryId: number;
      depositAmount: number;
      totalAmount: number;
      address: string | null;
      lat: number | null;
      lng: number | null;
    },
  ): Promise<{ id: number; uuid: string }> {
    return await client.withTransaction(async (query) => {
      const uuid = crypto.randomUUID();
      const res = await query(
        `INSERT INTO bookings
           (uuid, customer_id, provider_id, category_id, status,
            deposit_amount, total_amount, address, lat, lng)
         VALUES (?, ?, ?, ?, 'pending_payment', ?, ?, ?, ?, ?)`,
        [uuid, customerId, providerId, categoryId, depositAmount, totalAmount, address, lat, lng],
      );
      const id = res.insertId as number;
      await query(
        `INSERT INTO booking_events (booking_id, status, actor_id, note)
         VALUES (?, 'pending_payment', ?, 'created')`,
        [id, customerId],
      );
      return { id, uuid };
    });
  },

  byId(id: number, q?: Querier): Promise<BookingRow[]> {
    return db(q)(`SELECT * FROM bookings WHERE id = ? LIMIT 1`, [id]);
  },

  async byUuid(uuid: string): Promise<BookingRow | undefined> {
    const rows = await client.query(`SELECT * FROM bookings WHERE uuid = ? LIMIT 1`, [uuid]);
    return rows[0];
  },

  /** Lightweight parties lookup for realtime authorization. */
  async parties(id: number): Promise<{ customer_id: number; provider_id: number; status: string } | undefined> {
    const rows = await client.query(
      `SELECT customer_id, provider_id, status FROM bookings WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows[0];
  },

  setStatus(id: number, status: string, q?: Querier) {
    return db(q)(`UPDATE bookings SET status = ? WHERE id = ?`, [status, id]);
  },

  addPaid(id: number, amount: number, q?: Querier) {
    return db(q)(`UPDATE bookings SET amount_paid = amount_paid + ? WHERE id = ?`, [amount, id]);
  },

  addEvent(id: number, status: string, actorId: number | null, note: string, q?: Querier) {
    return db(q)(
      `INSERT INTO booking_events (booking_id, status, actor_id, note) VALUES (?, ?, ?, ?)`,
      [id, status, actorId, note],
    );
  },

  events(bookingId: number) {
    return client.query(
      `SELECT status, actor_id, note, created_at FROM booking_events
        WHERE booking_id = ? ORDER BY id ASC`,
      [bookingId],
    );
  },

  paymentsOf(bookingId: number) {
    return client.query(
      `SELECT id, mpesa_receipt, amount, kind, source, status, created_at
         FROM payments WHERE booking_id = ? ORDER BY id ASC`,
      [bookingId],
    );
  },

  // --- listing (with provider/customer display info) -------------------------
  listForCustomer(customerId: number) {
    return client.query(`${LIST_SELECT} WHERE b.customer_id = ? ORDER BY b.id DESC`, [customerId]);
  },
  listForProvider(providerId: number) {
    return client.query(`${LIST_SELECT} WHERE b.provider_id = ? ORDER BY b.id DESC`, [providerId]);
  },
  listAll(status?: string) {
    if (status) return client.query(`${LIST_SELECT} WHERE b.status = ? ORDER BY b.id DESC`, [status]);
    return client.query(`${LIST_SELECT} ORDER BY b.id DESC LIMIT 500`);
  },

  // --- payments --------------------------------------------------------------
  async insertPendingPayment(
    { bookingId, phone, amount, kind, checkoutId }: {
      bookingId: number;
      phone: string;
      amount: number;
      kind: "deposit" | "balance";
      checkoutId: string;
    },
  ): Promise<number> {
    const res = await client.query(
      `INSERT INTO payments (booking_id, checkout_id, phone, amount, kind, source, status)
       VALUES (?, ?, ?, ?, ?, 'stk', 'pending')`,
      [bookingId, checkoutId, phone, amount, kind],
    );
    return res.insertId as number;
  },

  async paymentByCheckout(checkoutId: string, q?: Querier) {
    const rows = await db(q)(
      `SELECT * FROM payments WHERE checkout_id = ? ORDER BY id DESC LIMIT 1`,
      [checkoutId],
    );
    return rows[0];
  },

  async paymentByReceipt(receipt: string, q?: Querier) {
    const rows = await db(q)(`SELECT * FROM payments WHERE mpesa_receipt = ? LIMIT 1`, [receipt]);
    return rows[0];
  },
};

const LIST_SELECT = `
  SELECT b.id, b.uuid, b.status, b.deposit_amount, b.total_amount, b.amount_paid,
         b.address, b.created_at,
         c.display_name AS customer_name, c.phone AS customer_phone,
         p.display_name AS provider_name, p.phone AS provider_phone,
         sc.\`key\` AS category
    FROM bookings b
    JOIN users c ON c.id = b.customer_id
    JOIN users p ON p.id = b.provider_id
    JOIN service_categories sc ON sc.id = b.category_id`;

export default bookingRepo;
