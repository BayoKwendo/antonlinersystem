// =============================================================================
//  Data access for bookings, booking_events and payments.
//  Transactional callers pass a `Querier`; others use the pool.
// =============================================================================
import client, { type Querier } from "../db/client.ts";
import { randomToken } from "../utils/crypto.ts";

const db = (q?: Querier): Querier => q ?? client.query;

export interface BookingRow {
  id: number;
  uuid: string;
  request_no: string | null;
  tracking_token: string | null;
  customer_id: number;
  provider_id: number; // NULL only for unassigned public requests; assigned bookings (all bookings.ts paths) are non-null
  category_id: number;
  pricing_mode: "fixed" | "quote";
  status: string;
  deposit_amount: string;
  total_amount: string;
  quoted_amount: string | null;
  amount_paid: string;
}

const bookingRepo = {
  /** Provider listing snapshot for a specific category, used when booking. */
  async providerSnapshot(providerId: number, categoryKey: string) {
    const rows = await client.query(
      `SELECT pp.user_id, pp.category_id, pp.base_price, pp.availability,
              u.status AS user_status
         FROM provider_profiles pp
         JOIN users u ON u.id = pp.user_id
         JOIN service_categories sc ON sc.id = pp.category_id
        WHERE pp.user_id = ? AND sc.\`key\` = ? LIMIT 1`,
      [providerId, categoryKey],
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

  /**
   * Frictionless public request: no provider yet. Mints a sequential request_no
   * (SR00001, SR00002, …) + a random tracking_token inside the transaction so
   * the read+insert are atomic (backed by the UNIQUE keys). `details` is a JSON
   * blob of the per-service form fields.
   */
  async createPublicRequest(
    { customerId, categoryId, code, pricingMode, totalAmount, address, lat, lng, details }: {
      customerId: number;
      categoryId: number;
      code: string; // per-service short code, e.g. HGS
      pricingMode: "fixed" | "quote";
      totalAmount: number;
      address: string | null;
      lat: number | null;
      lng: number | null;
      details: unknown;
    },
  ): Promise<{ id: number; uuid: string; requestNo: string; trackingToken: string }> {
    return await client.withTransaction(async (query) => {
      const uuid = crypto.randomUUID();
      const trackingToken = randomToken(32);
      // New requests are broadcast to providers first; a provider accepts + proposes
      // a date, then the customer is invoiced and pays. So all start at 'submitted'.
      const status = "submitted";
      // request_no = <PREFIX>-<YYMMDD>-<NNNNN>, using the service's provider code
      // prefix (e.g. SDGE) with a per-prefix sequence — matches the provider-code scheme.
      const now = new Date();
      const ymd = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      const seqRows = await query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(request_no, '-', -1) AS UNSIGNED)), 0) AS maxseq
           FROM bookings WHERE request_no LIKE CONCAT(?, '-%')`,
        [code],
      );
      const requestNo = `${code}-${ymd}-${String(Number(seqRows[0]?.maxseq ?? 0) + 1).padStart(5, "0")}`;
      const res = await query(
        `INSERT INTO bookings
           (uuid, request_no, tracking_token, customer_id, provider_id, category_id,
            pricing_mode, status, total_amount, address, lat, lng, details)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuid, requestNo, trackingToken, customerId, categoryId, pricingMode, status,
         totalAmount, address, lat, lng, JSON.stringify(details ?? {})],
      );
      const id = res.insertId as number;
      await query(
        `INSERT INTO booking_events (booking_id, status, actor_id, note)
         VALUES (?, ?, ?, 'request submitted')`,
        [id, status, customerId],
      );
      return { id, uuid, requestNo, trackingToken };
    });
  },

  async byRequestNo(requestNo: string, q?: Querier) {
    const rows = await db(q)(`SELECT * FROM bookings WHERE request_no = ? LIMIT 1`, [requestNo]);
    return rows[0];
  },

  /** Resolve the tracking token from an order number + the customer's phone. */
  async trackingTokenByRequestNoPhone(requestNo: string, phone: string, q?: Querier) {
    const rows = await db(q)(
      `SELECT b.tracking_token
         FROM bookings b
         JOIN users u ON u.id = b.customer_id
        WHERE b.request_no = ? AND u.phone = ?
        LIMIT 1`,
      [requestNo, phone],
    );
    return rows[0]?.tracking_token as string | undefined;
  },

  /**
   * Lean resolve for the WebSocket ?track= viewer path: a tracking token maps to
   * exactly one booking. Returns its id + current status so the socket can bind
   * an anonymous, subscribe-only viewer to that one booking's live-location room.
   */
  async resolveTrackingToken(token: string): Promise<{ id: number; status: string } | undefined> {
    const rows = await client.query(
      `SELECT id, status FROM bookings WHERE tracking_token = ? LIMIT 1`,
      [token],
    );
    return rows[0];
  },

  /** Persist the provider's last-known live position (written on each WS fix). */
  saveProviderLocation(bookingId: number, lat: number, lng: number, q?: Querier) {
    return db(q)(
      `UPDATE bookings SET provider_lat = ?, provider_lng = ?, provider_loc_at = NOW() WHERE id = ?`,
      [lat, lng, bookingId],
    );
  },

  /** Internal resolve for token-authorized customer actions (ids + state). */
  async rawByTrackingToken(token: string, q?: Querier) {
    const rows = await db(q)(
      `SELECT id, status, provider_id, customer_id, category_id, total_amount, quoted_amount
         FROM bookings WHERE tracking_token = ? LIMIT 1`,
      [token],
    );
    return rows[0];
  },

  assignProvider(id: number, providerId: number, q?: Querier) {
    return db(q)(`UPDATE bookings SET provider_id = ? WHERE id = ?`, [providerId, id]);
  },

  setQuote(id: number, amount: number, q?: Querier) {
    return db(q)(`UPDATE bookings SET quoted_amount = ?, pricing_mode = 'quote' WHERE id = ?`, [amount, id]);
  },

  setCustomerConfirmed(id: number, q?: Querier) {
    return db(q)(`UPDATE bookings SET customer_confirmed_at = NOW() WHERE id = ?`, [id]);
  },

  /** Admin request queue (LEFT JOIN provider — a request may be unassigned). */
  listRequests(status?: string) {
    const where = status ? "WHERE b.status = ?" : "";
    const params = status ? [status] : [];
    return client.query(
      `SELECT b.id, b.request_no, b.status, b.pricing_mode, b.total_amount, b.quoted_amount,
              b.amount_paid, b.created_at, b.scheduled_at,
              c.display_name AS customer_name, c.phone AS customer_phone,
              p.display_name AS provider_name,
              sc.\`key\` AS category, sc.name AS service_name
         FROM bookings b
         JOIN users c ON c.id = b.customer_id
         LEFT JOIN users p ON p.id = b.provider_id
         JOIN service_categories sc ON sc.id = b.category_id
         ${where}
        ORDER BY b.id DESC LIMIT 200`,
      params,
    );
  },

  /** Newly-submitted, unassigned jobs a VERIFIED provider is eligible for. */
  availableForProvider(providerId: number) {
    return client.query(
      `SELECT b.id, b.request_no, b.status, b.pricing_mode, b.total_amount, b.quoted_amount,
              b.address, b.lat, b.lng, b.scheduled_at, b.created_at, b.details,
              sc.\`key\` AS category, sc.name AS service_name,
              c.display_name AS customer_name
         FROM bookings b
         JOIN provider_profiles pp ON pp.category_id = b.category_id AND pp.user_id = ? AND pp.verified_at IS NOT NULL
         JOIN service_categories sc ON sc.id = b.category_id
         JOIN users c ON c.id = b.customer_id
        WHERE b.provider_id IS NULL AND b.status = 'submitted'
          AND NOT EXISTS (SELECT 1 FROM job_declines jd WHERE jd.booking_id = b.id AND jd.provider_id = ?)
        ORDER BY b.created_at ASC LIMIT 100`,
      [providerId, providerId],
    );
  },

  /** All jobs assigned to a provider (their job cards, any state). */
  jobsForProvider(providerId: number) {
    return client.query(
      `SELECT b.id, b.request_no, b.status, b.pricing_mode, b.total_amount, b.quoted_amount,
              b.amount_paid, b.address, b.lat, b.lng, b.scheduled_at, b.contacted_at, b.created_at, b.details,
              sc.\`key\` AS category, sc.name AS service_name,
              c.display_name AS customer_name, c.phone AS customer_phone
         FROM bookings b
         JOIN service_categories sc ON sc.id = b.category_id
         JOIN users c ON c.id = b.customer_id
        WHERE b.provider_id = ? ORDER BY b.id DESC LIMIT 100`,
      [providerId],
    );
  },

  /**
   * Atomic first-come claim (accept & propose a date), BEFORE payment: succeeds
   * (1 row) only if still unassigned, submitted, and the provider is verified for
   * the category. Sets provider_id + proposed scheduled_at + status pending_payment.
   */
  async acceptJob(bookingId: number, providerId: number, scheduledAt: string, q?: Querier): Promise<number> {
    const res = await db(q)(
      `UPDATE bookings SET provider_id = ?, scheduled_at = ?, status = 'pending_payment'
        WHERE id = ? AND provider_id IS NULL AND status = 'submitted'
          AND category_id IN (SELECT category_id FROM provider_profiles WHERE user_id = ? AND verified_at IS NOT NULL)`,
      [providerId, scheduledAt, bookingId, providerId],
    );
    return res.affectedRows as number;
  },

  /**
   * True if the provider already has a paid, unfinished job — i.e. one whose
   * payment is confirmed (booked) and not yet completed. Used to enforce
   * "one paid job at a time": a provider can't accept new work until the paid
   * one(s) are done.
   */
  async hasActivePaidJob(providerId: number, q?: Querier): Promise<boolean> {
    const rows = await db(q)(
      `SELECT 1 FROM bookings
        WHERE provider_id = ? AND status IN ('booked','en_route','arrived','in_progress')
        LIMIT 1`,
      [providerId],
    );
    return rows.length > 0;
  },

  /** Provider users offering a given category (for job-available notifications). */
  providersForCategory(categoryId: number) {
    return client.query(
      `SELECT DISTINCT pp.user_id FROM provider_profiles pp
         JOIN users u ON u.id = pp.user_id
        WHERE pp.category_id = ? AND u.deleted_at IS NULL AND u.status <> 'suspended'`,
      [categoryId],
    );
  },

  /** Read-only lookup for the public tracking page (LEFT JOIN provider — may be NULL). */
  async byTrackingToken(token: string) {
    const rows = await client.query(
      `SELECT b.request_no, b.status, b.pricing_mode, b.total_amount, b.quoted_amount,
              b.amount_paid, b.scheduled_at, b.created_at, b.details,
              b.lat AS site_lat, b.lng AS site_lng,
              b.provider_lat, b.provider_lng, b.provider_loc_at,
              c.display_name AS customer_name,
              p.display_name AS provider_name, p.phone AS provider_phone,
              sc.name AS service_name, sc.\`key\` AS service_key
         FROM bookings b
         JOIN users c ON c.id = b.customer_id
         LEFT JOIN users p ON p.id = b.provider_id
         JOIN service_categories sc ON sc.id = b.category_id
        WHERE b.tracking_token = ? LIMIT 1`,
      [token],
    );
    return rows[0];
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
    // Providers only see confirmed jobs — a booking the customer hasn't paid the
    // deposit on yet (pending_payment) is not a job and must not appear here.
    return client.query(
      `${LIST_SELECT} WHERE b.provider_id = ? AND b.status <> 'pending_payment' ORDER BY b.id DESC`,
      [providerId],
    );
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
