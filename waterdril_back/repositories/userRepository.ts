// =============================================================================
//  Data-access layer for users, services, orders, deposits, SMS logs and
//  complaints. Every query is fully parameterised — no string interpolation of
//  user input — which removes the SQL-injection holes in the legacy code.
// =============================================================================
import client from "../db/client.ts";
import type User from "../interfaces/General.ts";

/** Strip surrounding quotes the client may wrap date params in ("2024-01-01"). */
function cleanDate(value?: string): string {
  return (value ?? "").replace(/^["']|["']$/g, "");
}

const userRepository = {
  // ---------------------------------------------------------------------------
  //  Users — create / update
  // ---------------------------------------------------------------------------
  createUser: ({
    msisdn, name, customer_type, id_number, location, lat, long, amount,
    internal_name, role, referred_id, password,
  }: User) =>
    client.query(
      `INSERT INTO users
         SET msisdn = ?, name = ?, customer_type = ?, name_internal = ?,
             id_number = ?, location = ?, lat = ?, amount = ?, longitude = ?,
             role = ?, referred_id = ?, password = ?`,
      [msisdn, name, customer_type, internal_name, id_number, location, lat,
       amount, long, role, referred_id, password],
    ),

  editUser: ({
    msisdn, name, internal_name, id_number, password, referred_id, amount, id,
  }: User) =>
    client.query(
      `UPDATE users
         SET msisdn = ?, name = ?, name_internal = ?, id_number = ?,
             password = ?, referred_id = ?, amount = ?
       WHERE id = ?`,
      [msisdn, name, internal_name, id_number, password, referred_id, amount, id],
    ),

  editUserPwd: ({ password, id }: User) =>
    client.query(`UPDATE users SET password = ? WHERE id = ?`, [password, id]),

  updateLocation: ({ location, lat, long, id }: User) =>
    client.query(
      `UPDATE users
         SET movement_status = 'moving', location = ?, lat = ?, longitude = ?
       WHERE id = ? LIMIT 1`,
      [location, lat, long, id],
    ),

  /** Sets active_status (used by both "deactivate user" and booking flows). */
  updateUserStatus: ({ active_status, id }: User) =>
    client.query(
      `UPDATE users SET active_status = ? WHERE id = ? LIMIT 1`,
      [active_status, id],
    ),

  updateBookingStatus: ({ status, id }: User) =>
    client.query(
      `UPDATE users SET booking_status = ? WHERE id = ? LIMIT 1`,
      [status, id],
    ),

  /** Sets booking_status + numeric status together. */
  updateBookingAndStatus: ({ status, available, id }: User) =>
    client.query(
      `UPDATE users SET booking_status = ?, status = ? WHERE id = ? LIMIT 1`,
      [available, status, id],
    ),

  updateUserPhoto: ({ url, id }: User) =>
    client.query(`UPDATE users SET url = ? WHERE id = ? LIMIT 1`, [url, id]),

  deactivateCustomer: ({ id }: User) =>
    client.query(
      `UPDATE users SET active_status = 'inactive' WHERE id = ? LIMIT 1`,
      [id],
    ),

  // ---------------------------------------------------------------------------
  //  Users — reads
  // ---------------------------------------------------------------------------
  loginByMsisdn: async ({ msisdn }: User) => {
    const [row] = await client.query(`SELECT * FROM users WHERE msisdn = ?`, [msisdn]);
    return row;
  },

  getCustomerByMsisdn: async ({ msisdn }: User) => {
    const [row] = await client.query(
      `SELECT * FROM users WHERE msisdn = ? LIMIT 1`, [msisdn],
    );
    return row;
  },

  getProviderName: async ({ user_id }: User) => {
    const [row] = await client.query(
      `SELECT name, msisdn FROM users WHERE id = ? LIMIT 1`, [user_id],
    );
    return row;
  },

  getCustomerByIdNumber: async ({ id_number }: User) => {
    const [row] = await client.query(
      `SELECT name, msisdn FROM users
       WHERE id_number = ? AND role = 'customer' LIMIT 1`,
      [id_number],
    );
    return row;
  },

  getUserIdByIdNumber: async ({ id }: User) => {
    const [row] = await client.query(
      `SELECT id FROM users WHERE id_number = ?`, [id],
    );
    return row;
  },

  getUsersByRole: ({ role, customer_type }: User) =>
    client.query(
      `SELECT u.*, r.name AS driver_name, r.id_number AS driver_id_number,
              r.msisdn AS driver_msisdn
         FROM users u
         LEFT JOIN users r ON u.referred_id = r.id
        WHERE u.role = ? AND u.customer_type = ? AND u.active_status = 'active'`,
      [role, customer_type],
    ),

  getUsersReferred: ({ referred_id }: User) =>
    client.query(`SELECT * FROM users WHERE referred_id = ?`, [referred_id]),

  getCustomersByIdNumber: ({ id_number }: User) =>
    client.query(
      `SELECT * FROM users WHERE role = 'customer' AND id_number = ?`,
      [id_number],
    ),

  getProviders: () =>
    client.query(
      `SELECT * FROM users
        WHERE role NOT IN ('admin', 'customer', 'owner')
          AND active_status = 'active'`,
    ),

  getProvidersByRole: ({ role }: User) =>
    client.query(
      `SELECT * FROM users
        WHERE role = ? AND role NOT IN ('admin', 'customer', 'owner')
          AND active_status = 'active'`,
      [role],
    ),

  getProvidersByOwner: ({ referred_id }: User) =>
    client.query(
      `SELECT * FROM users
        WHERE role NOT IN ('admin', 'customer', 'owner') AND referred_id = ?`,
      [referred_id],
    ),

  /** A provider plus its current open booking (if any). */
  getUserById: ({ id }: User) =>
    client.query(
      `SELECT t.id, t.booking_status, t.active_status,
              t.msisdn AS msisdn_m, t.id_number AS id_number_m,
              '0' AS msisdn, '0' AS id_number,
              t.name, t.location, t.role, t.url, t.lat, t.longitude, t.amount,
              t.created_on, t.status, t.amount * 0.4 AS paid_amount,
              o.user_id AS muser_id, o.amount_to_pay, o.id AS booking_id,
              o.msisdn AS msisdn_cus, o.id_number AS id_number_cus, o.amount_paid
         FROM users t
         LEFT JOIN (SELECT * FROM order_requests WHERE status IN (0, 1)) o
           ON t.id = o.user_id
        WHERE t.id = ?`,
      [id],
    ),

  /** Available providers of a role, ranked by current booking status. */
  getProvidersByLatLong: ({ role }: User) =>
    client.query(
      `SELECT k.* FROM (
         SELECT s.*, ROW_NUMBER() OVER (PARTITION BY s.id ORDER BY s.mstatus DESC) AS rn
           FROM (
             SELECT t.*, t.amount * 0.4 AS paid_amount,
                    r.id_number AS user_booked_id, r.status AS mstatus, r.id AS service_id
               FROM users t
               LEFT JOIN (SELECT * FROM order_requests WHERE status IN (0, 1)) r
                 ON r.user_id = t.id
              WHERE t.status IN (0, 1) AND t.role = ? AND t.role <> 'admin'
              ORDER BY r.id
           ) AS s
       ) AS k
       WHERE k.rn = 1 AND k.active_status = 'active'
       ORDER BY k.mstatus ASC`,
      [role],
    ),

  /** Same as above but filtered to a location prefix (first 4 chars). */
  getProvidersByLocation: ({ role, location }: User) =>
    client.query(
      `SELECT k.* FROM (
         SELECT s.*, ROW_NUMBER() OVER (PARTITION BY s.id ORDER BY s.mstatus DESC) AS rn
           FROM (
             SELECT t.*, t.amount * 0.4 AS paid_amount,
                    r.id_number AS user_booked_id, r.status AS mstatus, r.id AS service_id
               FROM users t
               LEFT JOIN (SELECT * FROM order_requests WHERE status IN (0, 1)) r
                 ON r.user_id = t.id
              WHERE t.status IN (0, 1) AND t.role = ? AND t.role <> 'admin'
              ORDER BY r.id
           ) AS s
       ) AS k
       WHERE k.location LIKE CONCAT('%', ?, '%')
         AND k.rn = 1 AND k.active_status = 'active'
       ORDER BY k.mstatus ASC`,
      [role, (location ?? "").toString().substring(0, 4)],
    ),

  /**
   * Available providers of a role ordered by real distance from the caller's
   * coordinates (haversine, km). Rows beyond `radiusKm` are excluded; rows with
   * no real coordinates (lat/long blank or "0") sort to the bottom. Mirrors the
   * columns returned by getProvidersByLatLong and adds `distance_km`.
   */
  getProvidersByDistance: (
    { role, lat, long, radiusKm }: { role: string; lat: number; long: number; radiusKm: number },
  ) =>
    client.query(
      `SELECT k.* FROM (
         SELECT s.*, ROW_NUMBER() OVER (PARTITION BY s.id ORDER BY s.mstatus DESC) AS rn
           FROM (
             SELECT t.*, t.amount * 0.4 AS paid_amount,
                    r.id_number AS user_booked_id, r.status AS mstatus, r.id AS service_id,
                    (6371 * 2 * ASIN(SQRT(
                      POWER(SIN((? - CAST(NULLIF(t.lat, '') AS DECIMAL(10, 6))) * PI() / 180 / 2), 2) +
                      COS(? * PI() / 180) * COS(CAST(NULLIF(t.lat, '') AS DECIMAL(10, 6)) * PI() / 180) *
                      POWER(SIN((? - CAST(NULLIF(t.longitude, '') AS DECIMAL(10, 6))) * PI() / 180 / 2), 2)
                    ))) AS distance_km
               FROM users t
               LEFT JOIN (SELECT * FROM order_requests WHERE status IN (0, 1)) r
                 ON r.user_id = t.id
              WHERE t.status IN (0, 1) AND t.role = ? AND t.role <> 'admin'
           ) AS s
       ) AS k
       WHERE k.rn = 1 AND k.active_status = 'active'
         AND k.distance_km IS NOT NULL AND k.distance_km <= ?
       ORDER BY k.distance_km ASC`,
      [lat, lat, long, role, radiusKm],
    ),

  // ---------------------------------------------------------------------------
  //  Order requests
  // ---------------------------------------------------------------------------
  createOrderRequest: ({
    user_id, amount_to_pay, amount_paid, balance_payable, msisdn, id_number,
  }: User) =>
    client.query(
      `INSERT INTO order_requests
         SET user_id = ?, amount_to_pay = ?, amount_paid = ?, full_amount = ?,
             msisdn = ?, id_number = ?`,
      [user_id, amount_to_pay, amount_paid, balance_payable, msisdn, id_number],
    ),

  getOpenOrderRequest: ({ user_id, id_number }: User) =>
    client.query(
      `SELECT * FROM order_requests
        WHERE user_id = ? AND id_number = ? AND status IN (0, 1) LIMIT 1`,
      [user_id, id_number],
    ),

  getOpenOrderRecord: async ({ id_number, user_id }: User) => {
    const [row] = await client.query(
      `SELECT * FROM order_requests
        WHERE status IN (0, 1) AND id_number = ? AND user_id = ? LIMIT 1`,
      [id_number, user_id],
    );
    return row;
  },

  /** Add a payment to an order and move it to the given status. */
  updateOrderRequest: ({ status, id, amount }: User) =>
    client.query(
      `UPDATE order_requests
         SET status = ?, amount_paid = amount_paid + ?
       WHERE id = ? LIMIT 1`,
      [status, amount, id],
    ),

  getOrderRequestsAll: ({ startDate, endDate }: User) =>
    client.query(
      `SELECT t.*, u.name, u.location, u.url
         FROM order_requests t
         INNER JOIN users u ON t.user_id = u.id
        WHERE u.active_status = 'active'
          AND DATE(t.created_at) BETWEEN ? AND ?
        ORDER BY t.id DESC`,
      [cleanDate(startDate), cleanDate(endDate)],
    ),

  getOrderRequestsByOwner: ({ id, startDate, endDate }: User) =>
    client.query(
      `SELECT t.*, u.name, u.location, u.url
         FROM order_requests t
         INNER JOIN users u ON t.user_id = u.id
        WHERE u.active_status = 'active' AND u.referred_id = ?
          AND DATE(t.created_at) BETWEEN ? AND ?
        ORDER BY t.id DESC`,
      [id, cleanDate(startDate), cleanDate(endDate)],
    ),

  // ---------------------------------------------------------------------------
  //  Deposits
  // ---------------------------------------------------------------------------
  insertDeposit: ({ transaction_id, msisdn, amount, reference }: User) =>
    client.query(
      `INSERT INTO deposits
         SET transaction_id = ?, msisdn = ?, amount = ?, reference = ?`,
      [transaction_id, msisdn, amount, reference],
    ),

  getDeposits: ({ startDate, endDate }: User) =>
    client.query(
      `SELECT * FROM deposits
        WHERE DATE(created_on) BETWEEN ? AND ?
        ORDER BY id DESC`,
      [cleanDate(startDate), cleanDate(endDate)],
    ),

  // ---------------------------------------------------------------------------
  //  Services
  // ---------------------------------------------------------------------------
  getServices: () => client.query(`SELECT * FROM service`),

  getActiveServices: () =>
    client.query(`SELECT * FROM service WHERE status = 1`),

  addService: ({ name, type }: User) =>
    client.query(`INSERT INTO service SET name = ?, type = ?`, [name, type]),

  updateServiceName: ({ name, id }: User) =>
    client.query(`UPDATE service SET name = ? WHERE id = ? LIMIT 1`, [name, id]),

  updateServiceStatus: ({ active_status, id }: User) =>
    client.query(
      `UPDATE service SET status = ? WHERE id = ? LIMIT 1`,
      [active_status, id],
    ),

  // ---------------------------------------------------------------------------
  //  SMS logs & complaints
  // ---------------------------------------------------------------------------
  insertSmsLog: ({ msisdn, message }: User) =>
    client.query(
      `INSERT INTO sms_logs SET destination = ?, message = ?`,
      [msisdn, message],
    ),

  insertComplaint: ({ id_number, msisdn, user_id, order_number, message, amount }: User) =>
    client.query(
      `INSERT INTO complaints
         SET id_number = ?, msisdn = ?, driver_id = ?, order_number = ?,
             complaint = ?, amount = ?`,
      [id_number, msisdn, user_id, order_number, message, amount],
    ),
};

export default userRepository;
