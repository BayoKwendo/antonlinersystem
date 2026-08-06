// =============================================================================
//  Data access for provider escrow payouts (advance/final per booking).
//  Lifecycle: held -> released (job milestone reached) -> paid (finance).
// =============================================================================
import client, { type Querier } from "../db/client.ts";

const db = (q?: Querier): Querier => q ?? client.query;

const payoutRepo = {
  /** Idempotently create the advance+final pair (held). Safe to re-run. */
  async ensurePair(
    { bookingId, providerId, advance, final }: { bookingId: number; providerId: number; advance: number; final: number },
    q?: Querier,
  ): Promise<void> {
    const query = db(q);
    await query(
      `INSERT INTO provider_payouts (booking_id, provider_id, kind, amount, status)
       VALUES (?, ?, 'advance', ?, 'held')
       ON DUPLICATE KEY UPDATE provider_id = VALUES(provider_id), amount = VALUES(amount)`,
      [bookingId, providerId, advance],
    );
    await query(
      `INSERT INTO provider_payouts (booking_id, provider_id, kind, amount, status)
       VALUES (?, ?, 'final', ?, 'held')
       ON DUPLICATE KEY UPDATE provider_id = VALUES(provider_id), amount = VALUES(amount)`,
      [bookingId, providerId, final],
    );
  },

  /** Move a held payout to released. Returns affected row count. */
  async release(bookingId: number, kind: "advance" | "final", q?: Querier): Promise<number> {
    const res = await db(q)(
      `UPDATE provider_payouts SET status = 'released' WHERE booking_id = ? AND kind = ? AND status = 'held'`,
      [bookingId, kind],
    );
    return res.affectedRows as number;
  },

  async markPaid(payoutId: number, ref: string | null, q?: Querier): Promise<number> {
    const res = await db(q)(
      `UPDATE provider_payouts SET status = 'paid', paid_ref = ? WHERE id = ? AND status = 'released'`,
      [ref, payoutId],
    );
    return res.affectedRows as number;
  },

  async voidForBooking(bookingId: number, q?: Querier): Promise<void> {
    await db(q)(`UPDATE provider_payouts SET status = 'released' WHERE booking_id = ? AND status = 'held'`, [bookingId]);
  },

  byBooking(bookingId: number, q?: Querier) {
    return db(q)(`SELECT id, kind, amount, status, paid_ref, created_at FROM provider_payouts WHERE booking_id = ? ORDER BY kind`, [bookingId]);
  },

  list(status?: string) {
    const where = status ? "WHERE pp.status = ?" : "";
    const params = status ? [status] : [];
    return client.query(
      `SELECT pp.id, pp.kind, pp.amount, pp.status, pp.paid_ref, pp.created_at,
              b.request_no, p.display_name AS provider_name, p.phone AS provider_phone
         FROM provider_payouts pp
         JOIN bookings b ON b.id = pp.booking_id
         LEFT JOIN users p ON p.id = pp.provider_id
         ${where}
        ORDER BY pp.id DESC LIMIT 200`,
      params,
    );
  },
};

export default payoutRepo;
