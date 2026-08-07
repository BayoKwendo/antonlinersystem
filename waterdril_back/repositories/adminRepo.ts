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
  /** Provider verification queue: one row per provider account, filterable by status. */
  async listProviderApplications({ status, limit, offset }: Page & { status?: string }) {
    const { limit: l, offset: o } = clamp({ limit, offset });
    const where = status ? "WHERE pa.verification_status = ?" : "";
    const params: unknown[] = status ? [status] : [];
    const [total] = await client.query(
      `SELECT COUNT(*) AS total FROM provider_accounts pa ${where}`,
      params,
    );
    const items = await client.query(
      `SELECT pa.user_id, pa.business_name, pa.kra_pin, pa.bank_details,
              pa.verification_status, pa.verification_note,
              u.display_name, u.phone, u.email, u.created_at,
              (SELECT COUNT(*) FROM provider_documents d WHERE d.user_id = pa.user_id) AS documents,
              (SELECT COUNT(*) FROM provider_profiles pp WHERE pp.user_id = pa.user_id) AS services,
              (SELECT GROUP_CONCAT(sc.name) FROM provider_profiles pp
                 JOIN service_categories sc ON sc.id = pp.category_id WHERE pp.user_id = pa.user_id) AS service_names
         FROM provider_accounts pa JOIN users u ON u.id = pa.user_id
         ${where} ORDER BY FIELD(pa.verification_status,'pending','rejected','verified'), u.created_at DESC
         LIMIT ? OFFSET ?`,
      [...params, l, o],
    );
    return { items, total: total.total };
  },

  /** Full provider application for review: account, documents, and service listings. */
  async providerApplication(userId: number) {
    const account = (await client.query(
      `SELECT pa.user_id, pa.business_name, pa.kra_pin, pa.bank_details,
              pa.verification_status, pa.verification_note,
              u.display_name, u.phone, u.email, u.created_at
         FROM provider_accounts pa JOIN users u ON u.id = pa.user_id
        WHERE pa.user_id = ? LIMIT 1`,
      [userId],
    ))[0];
    if (!account) return null;
    const documents = await client.query(
      `SELECT id, kind, url, created_at FROM provider_documents WHERE user_id = ? ORDER BY id`,
      [userId],
    );
    const services = await client.query(
      `SELECT sc.\`key\`, sc.name, pp.code, pp.verified_at
         FROM provider_profiles pp JOIN service_categories sc ON sc.id = pp.category_id
        WHERE pp.user_id = ? ORDER BY sc.sort_order`,
      [userId],
    );
    return { account, documents, services };
  },

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
              sc.\`key\` AS category, pp.code, pp.base_price, pp.rating_avg, pp.rating_count,
              pp.availability, pp.verified_at, pp.owner_id, o.display_name AS owner_name
         FROM provider_profiles pp
         JOIN users u ON u.id = pp.user_id
         JOIN service_categories sc ON sc.id = pp.category_id
         LEFT JOIN users o ON o.id = pp.owner_id
         ${clause}
        ORDER BY pp.id DESC LIMIT ? OFFSET ?`,
      [...params, l, o],
    );
    return { items, total: count.total };
  },

  async providerDetail(id: number) {
    const [profile] = await client.query(
      `SELECT u.id, u.display_name, u.phone, u.email, u.status, u.avatar_url, u.created_at,
              sc.\`key\` AS category, pp.code, pp.base_price, pp.bio, pp.rating_avg, pp.rating_count,
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

  /** Does this user already offer a listing in this category? */
  async providerHasCategory(userId: number, categoryKey: string): Promise<boolean> {
    const rows = await client.query(
      `SELECT pp.id FROM provider_profiles pp
         JOIN service_categories sc ON sc.id = pp.category_id
        WHERE pp.user_id = ? AND sc.\`key\` = ? LIMIT 1`,
      [userId, categoryKey],
    );
    return rows.length > 0;
  },

  /**
   * Onboard a provider listing. A phone/identity may offer several categories,
   * so an existing user is reused (gaining the provider role + a password if it
   * had none); a new listing is added for the requested category.
   */
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
      const existing = await query(
        `SELECT id, password_hash FROM users WHERE phone = ? AND deleted_at IS NULL LIMIT 1`,
        [phone],
      );
      let userId: number;
      if (existing[0]) {
        userId = existing[0].id as number;
        await query(
          `INSERT IGNORE INTO user_roles (user_id, role_id) SELECT ?, id FROM roles WHERE \`key\`='provider'`,
          [userId],
        );
        if (!existing[0].password_hash) {
          await query(`UPDATE users SET password_hash = ? WHERE id = ?`, [passwordHash, userId]);
        }
      } else {
        const res = await query(
          `INSERT INTO users (uuid, phone, display_name, password_hash, phone_verified_at)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [crypto.randomUUID(), phone, displayName, passwordHash],
        );
        userId = res.insertId as number;
        await query(
          `INSERT INTO user_roles (user_id, role_id) SELECT ?, id FROM roles WHERE \`key\`='provider'`,
          [userId],
        );
      }
      // Resolve the category + its code prefix, then mint the next sequential
      // provider code for that prefix (e.g. SDBDS0001, SDBDS0002, …).
      const catRows = await query(
        `SELECT id, code_prefix FROM service_categories WHERE \`key\` = ? LIMIT 1`,
        [categoryKey],
      );
      if (!catRows[0]) throw new Error(`Unknown service category: ${categoryKey}`);
      const categoryId = catRows[0].id as number;
      const prefix = (catRows[0].code_prefix as string | null) ?? "SDOS";
      const seqRows = await query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(code, ?) AS UNSIGNED)), 0) AS maxseq
           FROM provider_profiles WHERE code LIKE CONCAT(?, '%')`,
        [prefix.length + 1, prefix],
      );
      const code = prefix + String(Number(seqRows[0].maxseq) + 1).padStart(4, "0");
      await query(
        `INSERT INTO provider_profiles (user_id, owner_id, category_id, base_price, bio, code, verified_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [userId, ownerId, categoryId, basePrice, bio, code],
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

  // --- provider detail edit (name/phone/bio/owner + price/verify/suspend) ----
  async editProvider(
    id: number,
    f: {
      base_price?: number;
      verified?: boolean;
      suspended?: boolean;
      display_name?: string;
      phone?: string;
      bio?: string;
      owner_id?: number;
      availability?: string;
    },
  ) {
    if (f.display_name !== undefined || f.phone !== undefined) {
      const sets: string[] = [];
      // deno-lint-ignore no-explicit-any
      const p: any[] = [];
      if (f.display_name !== undefined) { sets.push("display_name = ?"); p.push(f.display_name); }
      if (f.phone !== undefined) { sets.push("phone = ?"); p.push(f.phone); }
      p.push(id);
      await client.query(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, p);
    }
    const ppSets: string[] = [];
    // deno-lint-ignore no-explicit-any
    const ppParams: any[] = [];
    if (f.base_price !== undefined) { ppSets.push("base_price = ?"); ppParams.push(f.base_price); }
    if (f.bio !== undefined) { ppSets.push("bio = ?"); ppParams.push(f.bio); }
    if (f.owner_id !== undefined) { ppSets.push("owner_id = ?"); ppParams.push(f.owner_id); }
    if (f.verified !== undefined) ppSets.push(`verified_at = ${f.verified ? "CURRENT_TIMESTAMP" : "NULL"}`);
    if (f.availability !== undefined) { ppSets.push("availability = ?"); ppParams.push(f.availability); }
    if (ppSets.length) {
      ppParams.push(id);
      await client.query(`UPDATE provider_profiles SET ${ppSets.join(", ")} WHERE user_id = ?`, ppParams);
    }
    if (f.suspended !== undefined) {
      await client.query(`UPDATE users SET status = ? WHERE id = ?`, [f.suspended ? "suspended" : "active", id]);
    }
  },

  /** All providers that have a real location, for the live ops map/list. */
  providerLocations() {
    return client.query(
      `SELECT u.id, u.display_name, u.phone, sc.\`key\` AS category,
              pp.availability, pp.lat, pp.lng, pp.location_updated_at
         FROM provider_profiles pp
         JOIN users u ON u.id = pp.user_id AND u.status = 'active'
         JOIN service_categories sc ON sc.id = pp.category_id
        WHERE pp.lat <> 0 OR pp.lng <> 0
        ORDER BY pp.availability = 'available' DESC, u.display_name`,
    );
  },

  // --- staff / owners / agents (users with a non-customer/provider role) ------
  async listUsers({ role, q, limit, offset }: { role?: string; q?: string } & Page) {
    const roleFilter = role ? "AND r2.`key` = ?" : "AND r2.`key` IN ('admin','assistance','finance','owner','agent')";
    const where: string[] = []; // deno-lint-ignore no-explicit-any
    const params: any[] = role ? [role] : [];
    if (q) { where.push("(u.display_name LIKE ? OR u.phone LIKE ?)"); params.push(`%${q}%`, `%${q}%`); }
    const extra = where.length ? `AND ${where.join(" AND ")}` : "";
    const sub = `SELECT DISTINCT ur2.user_id FROM user_roles ur2 JOIN roles r2 ON r2.id=ur2.role_id WHERE 1=1 ${roleFilter}`;
    const { limit: l, offset: o } = clamp({ limit, offset });
    const [count] = await client.query(
      `SELECT COUNT(*) AS total FROM users u WHERE u.deleted_at IS NULL AND u.id IN (${sub}) ${extra}`,
      params,
    );
    const items = await client.query(
      `SELECT u.id, u.display_name, u.phone, u.email, u.status, u.created_at,
              (SELECT GROUP_CONCAT(r.\`key\`) FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=u.id) AS roles
         FROM users u
        WHERE u.deleted_at IS NULL AND u.id IN (${sub}) ${extra}
        ORDER BY u.id DESC LIMIT ? OFFSET ?`,
      [...params, l, o],
    );
    return { items, total: count.total };
  },

  async createUser(
    { phone, displayName, passwordHash, roleKey, email }: {
      phone: string; displayName: string; passwordHash: string; roleKey: string; email: string | null;
    },
  ): Promise<number> {
    return await client.withTransaction(async (query) => {
      const res = await query(
        `INSERT INTO users (uuid, phone, display_name, email, password_hash, phone_verified_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [crypto.randomUUID(), phone, displayName, email, passwordHash],
      );
      const id = res.insertId as number;
      await query(`INSERT INTO user_roles (user_id, role_id) SELECT ?, id FROM roles WHERE \`key\`=?`, [id, roleKey]);
      return id;
    });
  },

  async updateUser(
    id: number,
    f: { displayName?: string; email?: string | null; suspended?: boolean; roleKey?: string; passwordHash?: string },
  ) {
    const sets: string[] = []; // deno-lint-ignore no-explicit-any
    const p: any[] = [];
    if (f.displayName !== undefined) { sets.push("display_name = ?"); p.push(f.displayName); }
    if (f.email !== undefined) { sets.push("email = ?"); p.push(f.email); }
    if (f.passwordHash !== undefined) { sets.push("password_hash = ?"); p.push(f.passwordHash); }
    if (f.suspended !== undefined) { sets.push("status = ?"); p.push(f.suspended ? "suspended" : "active"); }
    if (sets.length) { p.push(id); await client.query(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, p); }
    if (f.roleKey) {
      await client.withTransaction(async (query) => {
        await query(
          `DELETE ur FROM user_roles ur JOIN roles r ON r.id=ur.role_id
            WHERE ur.user_id=? AND r.\`key\` IN ('admin','assistance','finance','owner','agent')`,
          [id],
        );
        await query(`INSERT INTO user_roles (user_id, role_id) SELECT ?, id FROM roles WHERE \`key\`=?`, [id, f.roleKey]);
      });
    }
  },

  // --- customers (portal-managed) --------------------------------------------
  async createCustomer(
    { phone, displayName, idNumber }: { phone: string; displayName: string; idNumber: string | null },
  ): Promise<number> {
    return await client.withTransaction(async (query) => {
      const res = await query(
        `INSERT INTO users (uuid, phone, display_name, phone_verified_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        [crypto.randomUUID(), phone, displayName],
      );
      const id = res.insertId as number;
      await query(`INSERT INTO user_roles (user_id, role_id) SELECT ?, id FROM roles WHERE \`key\`='customer'`, [id]);
      await query(`INSERT INTO customer_profiles (user_id, id_number) VALUES (?, ?)`, [id, idNumber]);
      return id;
    });
  },

  async updateCustomer(
    id: number,
    f: { displayName?: string; idNumber?: string; suspended?: boolean },
  ) {
    if (f.displayName !== undefined) await client.query(`UPDATE users SET display_name=? WHERE id=?`, [f.displayName, id]);
    if (f.suspended !== undefined) {
      await client.query(`UPDATE users SET status=? WHERE id=?`, [f.suspended ? "suspended" : "active", id]);
    }
    if (f.idNumber !== undefined) {
      await client.query(
        `INSERT INTO customer_profiles (user_id, id_number) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE id_number = VALUES(id_number)`,
        [id, f.idNumber],
      );
    }
  },

  // --- bookings with date range (portal service-requests view) ----------------
  async bookingsRange({ from, to, status, limit, offset }: { from?: string; to?: string; status?: string } & Page) {
    const where: string[] = []; // deno-lint-ignore no-explicit-any
    const params: any[] = [];
    if (from) { where.push("DATE(b.created_at) >= ?"); params.push(from); }
    if (to) { where.push("DATE(b.created_at) <= ?"); params.push(to); }
    if (status) { where.push("b.status = ?"); params.push(status); }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const { limit: l, offset: o } = clamp({ limit, offset });
    const [count] = await client.query(`SELECT COUNT(*) AS total FROM bookings b ${clause}`, params);
    const items = await client.query(
      `SELECT b.id, b.uuid, b.status, b.deposit_amount, b.total_amount, b.amount_paid,
              b.address, b.created_at, sc.\`key\` AS category,
              c.display_name AS customer_name, c.phone AS customer_phone,
              p.display_name AS provider_name, p.phone AS provider_phone
         FROM bookings b
         JOIN users c ON c.id = b.customer_id
         JOIN users p ON p.id = b.provider_id
         JOIN service_categories sc ON sc.id = b.category_id
         ${clause}
        ORDER BY b.id DESC LIMIT ? OFFSET ?`,
      [...params, l, o],
    );
    return { items, total: count.total };
  },
};

export default adminRepo;
