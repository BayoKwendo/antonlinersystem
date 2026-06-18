// =============================================================================
//  Portal/admin data access: dashboard stats + analytics, provider onboarding,
//  management & detail, customers, payments, complaints, reviews, audit.
//  Owners are scoped to their own providers. List queries are paginated and
//  return { items, total }.
// =============================================================================
import client from "../db/client.ts";

interface Page {
  limit?: number;
  offset?: number;
}
function clamp(p: Page) {
  const limit = Math.min(Math.max(Number(p.limit) || 25, 1), 100);
  const offset = Math.max(Number(p.offset) || 0, 0);
  return { limit, offset };
}

const adminRepo = {
  async stats() {
    const [totals] = await client.query(
      `SELECT
         (SELECT COUNT(*) FROM provider_profiles) AS providers,
         (SELECT COUNT(*) FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE r.\`key\`='customer') AS customers,
         (SELECT COUNT(*) FROM bookings) AS bookings_total,
         (SELECT COUNT(*) FROM bookings WHERE status NOT IN ('completed','cancelled')) AS active_bookings,
         (SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='success') AS revenue`,
    );
    const byStatus = await client.query(`SELECT status, COUNT(*) AS n FROM bookings GROUP BY status`);
    return { ...totals, by_status: byStatus };
  },

  async analytics() {
    const revenueByDay = await client.query(
      `SELECT DATE(created_at) AS day, SUM(amount) AS total
         FROM payments
        WHERE status='success' AND created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
        GROUP BY DATE(created_at) ORDER BY day`,
    );
    const funnel = await client.query(`SELECT status, COUNT(*) AS n FROM bookings GROUP BY status`);
    const [outstanding] = await client.query(
      `SELECT COALESCE(SUM(total_amount - amount_paid),0) AS outstanding
         FROM bookings WHERE status NOT IN ('completed','cancelled')`,
    );
    const topProviders = await client.query(
      `SELECT pr.id, pr.display_name, pp.rating_avg,
              COALESCE(SUM(CASE WHEN p.status='success' THEN p.amount END),0) AS revenue
         FROM provider_profiles pp
         JOIN users pr ON pr.id = pp.user_id
         LEFT JOIN bookings b ON b.provider_id = pr.id
         LEFT JOIN payments p ON p.booking_id = b.id
        GROUP BY pr.id, pr.display_name, pp.rating_avg
        ORDER BY revenue DESC LIMIT 5`,
    );
    return { revenue_by_day: revenueByDay, funnel, outstanding: outstanding.outstanding, top_providers: topProviders };
  },

  async listProviders(
    { ownerId, category, q, limit, offset }: { ownerId?: number; category?: string; q?: string } & Page,
  ) {
    const where: string[] = [];
    // deno-lint-ignore no-explicit-any
    const params: any[] = [];
    if (ownerId) {
      where.push("pp.owner_id = ?");
      params.push(ownerId);
    }
    if (category) {
      where.push("sc.`key` = ?");
      params.push(category);
    }
    if (q) {
      where.push("(u.display_name LIKE ? OR u.phone LIKE ?)");
      params.push(`%${q}%`, `%${q}%`);
    }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const { limit: l, offset: o } = clamp({ limit, offset });
    const [count] = await client.query(
      `SELECT COUNT(*) AS total FROM provider_profiles pp
         JOIN users u ON u.id=pp.user_id JOIN service_categories sc ON sc.id=pp.category_id ${clause}`,
      params,
    );
    const items = await client.query(
      `SELECT u.id, u.display_name, u.phone, u.status, u.avatar_url,
              sc.\`key\` AS category, pp.base_price, pp.rating_avg, pp.rating_count,
              pp.availability, pp.verified_at, pp.owner_id, o.display_name AS owner_name
         FROM provider_profiles pp
         JOIN users u ON u.id = pp.user_id
         JOIN service_categories sc ON sc.id = pp.category_id
         LEFT JOIN users o ON o.id = pp.owner_id
         ${clause}
        ORDER BY u.id DESC LIMIT ? OFFSET ?`,
      [...params, l, o],
    );
    return { items, total: count.total };
  },

  async providerDetail(id: number) {
    const [profile] = await client.query(
      `SELECT u.id, u.display_name, u.phone, u.email, u.status, u.avatar_url, u.created_at,
              sc.\`key\` AS category, pp.base_price, pp.bio, pp.rating_avg, pp.rating_count,
              pp.availability, pp.verified_at, pp.lat, pp.lng, pp.location_updated_at,
              o.display_name AS owner_name
         FROM provider_profiles pp
         JOIN users u ON u.id = pp.user_id
         JOIN service_categories sc ON sc.id = pp.category_id
         LEFT JOIN users o ON o.id = pp.owner_id
        WHERE pp.user_id = ?`,
      [id],
    );
    if (!profile) return null;
    const reviews = await client.query(
      `SELECT r.id, r.rating, r.comment, r.hidden, r.created_at, c.display_name AS customer_name
         FROM reviews r JOIN users c ON c.id = r.customer_id
        WHERE r.provider_id = ? ORDER BY r.id DESC LIMIT 50`,
      [id],
    );
    const recentBookings = await client.query(
      `SELECT b.id, b.status, b.total_amount, b.amount_paid, b.created_at, c.display_name AS customer_name
         FROM bookings b JOIN users c ON c.id = b.customer_id
        WHERE b.provider_id = ? ORDER BY b.id DESC LIMIT 10`,
      [id],
    );
    const [earn] = await client.query(
      `SELECT COALESCE(SUM(p.amount),0) AS earnings, COUNT(DISTINCT b.id) AS jobs
         FROM bookings b LEFT JOIN payments p ON p.booking_id=b.id AND p.status='success'
        WHERE b.provider_id = ?`,
      [id],
    );
    return { profile, reviews, recent_bookings: recentBookings, earnings: earn.earnings, jobs: earn.jobs };
  },

  async onboardProvider(
    { phone, displayName, passwordHash, categoryKey, basePrice, ownerId, bio }: {
      phone: string;
      displayName: string;
      passwordHash: string;
      categoryKey: string;
      basePrice: number;
      ownerId: number | null;
      bio: string | null;
    },
  ): Promise<number> {
    return await client.withTransaction(async (query) => {
      const uuid = crypto.randomUUID();
      const res = await query(
        `INSERT INTO users (uuid, phone, display_name, password_hash, phone_verified_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [uuid, phone, displayName, passwordHash],
      );
      const userId = res.insertId as number;
      await query(
        `INSERT INTO user_roles (user_id, role_id) SELECT ?, id FROM roles WHERE \`key\`='provider'`,
        [userId],
      );
      await query(
        `INSERT INTO provider_profiles (user_id, owner_id, category_id, base_price, bio, verified_at)
         SELECT ?, ?, sc.id, ?, ?, CURRENT_TIMESTAMP FROM service_categories sc WHERE sc.\`key\` = ?`,
        [userId, ownerId, basePrice, bio, categoryKey],
      );
      return userId;
    });
  },

  async updateProvider(
    id: number,
    { basePrice, verified, suspended }: { basePrice?: number; verified?: boolean; suspended?: boolean },
  ) {
    if (basePrice !== undefined) {
      await client.query(`UPDATE provider_profiles SET base_price=? WHERE user_id=?`, [basePrice, id]);
    }
    if (verified !== undefined) {
      await client.query(
        `UPDATE provider_profiles SET verified_at=${verified ? "CURRENT_TIMESTAMP" : "NULL"} WHERE user_id=?`,
        [id],
      );
    }
    if (suspended !== undefined) {
      await client.query(`UPDATE users SET status=? WHERE id=?`, [suspended ? "suspended" : "active", id]);
    }
  },

  async listCustomers({ q, limit, offset }: { q?: string } & Page) {
    const clause = q ? "AND (u.display_name LIKE ? OR u.phone LIKE ? OR cp.id_number LIKE ?)" : "";
    const filterParams = q ? [`%${q}%`, `%${q}%`, `%${q}%`] : [];
    const { limit: l, offset: o } = clamp({ limit, offset });
    const [count] = await client.query(
      `SELECT COUNT(*) AS total FROM users u
         JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id AND r.\`key\`='customer'
         LEFT JOIN customer_profiles cp ON cp.user_id=u.id
        WHERE u.deleted_at IS NULL ${clause}`,
      filterParams,
    );
    const items = await client.query(
      `SELECT u.id, u.display_name, u.phone, u.email, u.status, u.created_at,
              cp.id_number, cp.default_address,
              (SELECT COUNT(*) FROM bookings b WHERE b.customer_id=u.id) AS bookings
         FROM users u
         JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id AND r.\`key\`='customer'
         LEFT JOIN customer_profiles cp ON cp.user_id=u.id
        WHERE u.deleted_at IS NULL ${clause}
        ORDER BY u.id DESC LIMIT ? OFFSET ?`,
      [...filterParams, l, o],
    );
    return { items, total: count.total };
  },

  async listPayments({ from, to, limit, offset }: { from?: string; to?: string } & Page) {
    const where = ["p.status='success'"];
    // deno-lint-ignore no-explicit-any
    const params: any[] = [];
    if (from) {
      where.push("DATE(p.created_at) >= ?");
      params.push(from);
    }
    if (to) {
      where.push("DATE(p.created_at) <= ?");
      params.push(to);
    }
    const clause = `WHERE ${where.join(" AND ")}`;
    const { limit: l, offset: o } = clamp({ limit, offset });
    const [count] = await client.query(`SELECT COUNT(*) AS total FROM payments p ${clause}`, params);
    const [sum] = await client.query(`SELECT COALESCE(SUM(amount),0) AS total_amount FROM payments p ${clause}`, params);
    const items = await client.query(
      `SELECT p.id, p.mpesa_receipt, p.amount, p.kind, p.source, p.created_at, p.booking_id,
              c.display_name AS customer_name, pr.display_name AS provider_name
         FROM payments p
         JOIN bookings b ON b.id = p.booking_id
         JOIN users c ON c.id = b.customer_id
         JOIN users pr ON pr.id = b.provider_id
         ${clause}
        ORDER BY p.id DESC LIMIT ? OFFSET ?`,
      [...params, l, o],
    );
    return { items, total: count.total, sum: sum.total_amount };
  },

  async listComplaints({ limit, offset }: Page) {
    const { limit: l, offset: o } = clamp({ limit, offset });
    const [count] = await client.query(`SELECT COUNT(*) AS total FROM complaints`);
    const items = await client.query(
      `SELECT co.id, co.message, co.amount, co.status, co.resolution_note, co.created_at, co.booking_id,
              c.display_name AS customer_name, pr.display_name AS provider_name
         FROM complaints co
         LEFT JOIN bookings b ON b.id = co.booking_id
         LEFT JOIN users c ON c.id = b.customer_id
         LEFT JOIN users pr ON pr.id = b.provider_id
        ORDER BY co.id DESC LIMIT ? OFFSET ?`,
      [l, o],
    );
    return { items, total: count.total };
  },

  updateComplaint(id: number, { status, note }: { status: string; note?: string }) {
    return client.query(`UPDATE complaints SET status=?, resolution_note=? WHERE id=?`, [
      status,
      note ?? null,
      id,
    ]);
  },

  async listReviews({ limit, offset }: Page) {
    const { limit: l, offset: o } = clamp({ limit, offset });
    const [count] = await client.query(`SELECT COUNT(*) AS total FROM reviews`);
    const items = await client.query(
      `SELECT r.id, r.rating, r.comment, r.hidden, r.created_at,
              c.display_name AS customer_name, pr.display_name AS provider_name
         FROM reviews r
         JOIN users c ON c.id = r.customer_id
         JOIN users pr ON pr.id = r.provider_id
        ORDER BY r.id DESC LIMIT ? OFFSET ?`,
      [l, o],
    );
    return { items, total: count.total };
  },

  setReviewHidden(id: number, hidden: boolean) {
    return client.query(`UPDATE reviews SET hidden=? WHERE id=?`, [hidden ? 1 : 0, id]);
  },

  async listAudit({ limit, offset }: Page) {
    const { limit: l, offset: o } = clamp({ limit, offset });
    const [count] = await client.query(`SELECT COUNT(*) AS total FROM audit_logs`);
    const items = await client.query(
      `SELECT a.id, a.action, a.entity, a.entity_id, a.meta, a.created_at,
              u.display_name AS actor_name
         FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id
        ORDER BY a.id DESC LIMIT ? OFFSET ?`,
      [l, o],
    );
    return { items, total: count.total };
  },
};

export default adminRepo;
