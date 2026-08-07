// =============================================================================
//  Data access for per-booking deliverable documents (report, quote, etc.).
// =============================================================================
import client, { type Querier } from "../db/client.ts";

const db = (q?: Querier): Querier => q ?? client.query;

const documentRepo = {
  async add(
    { bookingId, kind, url, uploadedBy }: { bookingId: number; kind: string; url: string; uploadedBy: number | null },
    q?: Querier,
  ): Promise<number> {
    const res = await db(q)(
      `INSERT INTO documents (booking_id, kind, url, uploaded_by) VALUES (?, ?, ?, ?)`,
      [bookingId, kind, url, uploadedBy],
    );
    return res.insertId as number;
  },

  byBooking(bookingId: number, q?: Querier) {
    return db(q)(
      `SELECT id, kind, url, uploaded_by, created_at FROM documents WHERE booking_id = ? ORDER BY created_at DESC`,
      [bookingId],
    );
  },

  /** Report-gate: a final payout may only release once a report exists. */
  async hasReport(bookingId: number, q?: Querier): Promise<boolean> {
    const rows = await db(q)(`SELECT 1 FROM documents WHERE booking_id = ? AND kind = 'report' LIMIT 1`, [bookingId]);
    return rows.length > 0;
  },

  /** True if a document of the given kind exists for the booking (e.g. etims_invoice). */
  async hasKind(bookingId: number, kind: string, q?: Querier): Promise<boolean> {
    const rows = await db(q)(`SELECT 1 FROM documents WHERE booking_id = ? AND kind = ? LIMIT 1`, [bookingId, kind]);
    return rows.length > 0;
  },
};

export default documentRepo;
