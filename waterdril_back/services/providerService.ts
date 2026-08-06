// =============================================================================
//  Service Provider onboarding (self-signup via the Android app), verification
//  (Ops approves → mints a per-service code SDGEO00001…), and the home dashboard
//  aggregation (services, metrics, earnings, readiness).
// =============================================================================
import client from "../db/client.ts";
import authService from "./authService.ts";
import { normalizePhone, isValidMsisdn } from "../utils/phone.ts";
import { badRequest, notFound } from "../utils/errors.ts";
import { audit } from "./audit.ts";
import { notifyUser } from "./notify.ts";

export interface ProviderSignupInput {
  full_name: string;
  business_name: string;
  phone: string;
  email: string;
  kra_pin: string;
  password: string;
  bank_details?: string;
  services: string[];
  documents?: { kind: string; url: string }[];
}

export const providerService = {
  /** Self-signup: creates/links a provider account (pending verification) + logs in. */
  async signup(input: ProviderSignupInput) {
    const phone = normalizePhone(input.phone);
    if (!isValidMsisdn(phone)) throw badRequest("Enter a valid Kenyan phone number.");
    const passwordHash = await authService.hashPassword(input.password);

    await client.withTransaction(async (query) => {
      const existing = (await query(`SELECT id, password_hash FROM users WHERE phone = ? AND deleted_at IS NULL LIMIT 1`, [phone]))[0];
      let userId: number;
      if (existing) {
        userId = existing.id as number;
        await query(`INSERT IGNORE INTO user_roles (user_id, role_id) SELECT ?, id FROM roles WHERE \`key\`='provider'`, [userId]);
        await query(
          `UPDATE users SET password_hash = COALESCE(password_hash, ?), display_name = ?, email = COALESCE(email, ?) WHERE id = ?`,
          [passwordHash, input.full_name.trim(), input.email, userId],
        );
      } else {
        const res = await query(
          `INSERT INTO users (uuid, phone, email, display_name, password_hash, phone_verified_at)
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [crypto.randomUUID(), phone, input.email, input.full_name.trim(), passwordHash],
        );
        userId = res.insertId as number;
        await query(`INSERT INTO user_roles (user_id, role_id) SELECT ?, id FROM roles WHERE \`key\`='provider'`, [userId]);
      }

      await query(
        `INSERT INTO provider_accounts (user_id, business_name, kra_pin, bank_details, verification_status)
         VALUES (?, ?, ?, ?, 'pending')
         ON DUPLICATE KEY UPDATE business_name = VALUES(business_name), kra_pin = VALUES(kra_pin),
                                 bank_details = VALUES(bank_details), verification_status = 'pending'`,
        [userId, input.business_name.trim(), input.kra_pin.trim(), input.bank_details ?? null],
      );

      for (const d of input.documents ?? []) {
        await query(`INSERT INTO provider_documents (user_id, kind, url) VALUES (?, ?, ?)`, [userId, d.kind, d.url]);
      }

      // One unverified listing per selected service (code minted on approval).
      for (const key of input.services) {
        const cat = (await query(`SELECT id FROM service_categories WHERE \`key\` = ? LIMIT 1`, [key]))[0];
        if (!cat) continue;
        await query(
          `INSERT IGNORE INTO provider_profiles (user_id, owner_id, category_id, base_price, availability, verified_at)
           VALUES (?, NULL, ?, 0, 'offline', NULL)`,
          [userId, cat.id],
        );
      }
      await audit(userId, "provider.signup", "user", userId, { services: input.services });
    });

    // Log the provider in so the app can show the (pending) dashboard.
    return await authService.loginPassword(phone, input.password);
  },

  /** Ops verification: approve (mint per-service codes) or reject. */
  async verify(userId: number, approve: boolean, note: string | undefined, actorId: number) {
    const acct = (await client.query(`SELECT verification_status FROM provider_accounts WHERE user_id = ?`, [userId]))[0];
    if (!acct) throw notFound("Provider account not found.");

    if (!approve) {
      await client.query(`UPDATE provider_accounts SET verification_status = 'rejected', verification_note = ? WHERE user_id = ?`, [note ?? null, userId]);
      await notifyUser(userId, "Verification update", `Your SMART Drill provider application needs attention.${note ? " " + note : ""}`, { push: false });
      await audit(actorId, "provider.reject", "user", userId, { note });
      return { verification_status: "rejected" };
    }

    await client.withTransaction(async (query) => {
      await query(`UPDATE provider_accounts SET verification_status = 'verified', verification_note = ? WHERE user_id = ?`, [note ?? null, userId]);
      const listings = await query(
        `SELECT pp.id, sc.code_prefix FROM provider_profiles pp
           JOIN service_categories sc ON sc.id = pp.category_id
          WHERE pp.user_id = ? AND pp.code IS NULL`,
        [userId],
      );
      for (const l of listings) {
        const prefix = (l.code_prefix as string | null) ?? "SDOS";
        const seq = await query(
          `SELECT COALESCE(MAX(CAST(SUBSTRING(code, ?) AS UNSIGNED)), 0) AS m FROM provider_profiles WHERE code LIKE CONCAT(?, '%')`,
          [prefix.length + 1, prefix],
        );
        const code = prefix + String(Number(seq[0].m) + 1).padStart(5, "0");
        await query(`UPDATE provider_profiles SET code = ?, verified_at = NOW(), availability = 'available' WHERE id = ?`, [code, l.id]);
      }
    });
    await notifyUser(userId, "You're verified!", "Your SMART Drill provider account is verified — you can now receive jobs.", { push: false });
    await audit(actorId, "provider.verify", "user", userId, {});
    return { verification_status: "verified" };
  },

  /** Earnings tab: payout history + totals for the logged-in provider. */
  async earnings(userId: number) {
    const rows = await client.query(
      `SELECT py.id, py.booking_id, py.kind, py.amount, py.status, py.paid_ref, py.created_at,
              b.request_no, sc.name AS service_name
         FROM provider_payouts py
         JOIN bookings b ON b.id = py.booking_id
         JOIN service_categories sc ON sc.id = b.category_id
        WHERE py.provider_id = ? ORDER BY py.created_at DESC LIMIT 200`,
      [userId],
    );
    const t = (await client.query(
      `SELECT COALESCE(SUM(CASE WHEN status='paid' THEN amount END),0) AS lifetime,
              COALESCE(SUM(CASE WHEN status IN ('held','released') THEN amount END),0) AS pending,
              COALESCE(SUM(CASE WHEN status='paid' AND created_at >= DATE_FORMAT(NOW(),'%Y-%m-01') THEN amount END),0) AS this_month
         FROM provider_payouts WHERE provider_id = ?`,
      [userId],
    ))[0];
    return {
      totals: { this_month: Number(t.this_month), lifetime: Number(t.lifetime), pending: Number(t.pending) },
      payouts: rows.map((r: { id: number; booking_id: number; request_no: string | null; service_name: string; kind: string; amount: string; status: string; paid_ref: string | null; created_at: string }) => ({
        id: r.id, booking_id: r.booking_id, request_no: r.request_no, service: r.service_name,
        kind: r.kind, amount: Number(r.amount), status: r.status, ref: r.paid_ref, date: r.created_at,
      })),
    };
  },

  /** Home dashboard aggregation for the logged-in provider. */
  async dashboard(userId: number) {
    const user = (await client.query(`SELECT display_name, phone, email FROM users WHERE id = ?`, [userId]))[0];
    if (!user) throw notFound("Account not found.");
    const acct = (await client.query(`SELECT business_name, kra_pin, bank_details, verification_status FROM provider_accounts WHERE user_id = ?`, [userId]))[0] ?? {};
    const listings = await client.query(
      `SELECT pp.code, pp.availability, pp.rating_avg, pp.verified_at, sc.\`key\` AS \`key\`, sc.name
         FROM provider_profiles pp JOIN service_categories sc ON sc.id = pp.category_id
        WHERE pp.user_id = ? ORDER BY sc.sort_order`,
      [userId],
    );
    const active = Number((await client.query(`SELECT COUNT(*) c FROM bookings WHERE provider_id = ? AND status IN ('booked','en_route','arrived','in_progress')`, [userId]))[0].c);
    const completed = Number((await client.query(`SELECT COUNT(*) c FROM bookings WHERE provider_id = ? AND status IN ('completed','confirmed')`, [userId]))[0].c);
    const earn = (await client.query(
      `SELECT COALESCE(SUM(CASE WHEN status='paid' THEN amount END),0) AS lifetime,
              COALESCE(SUM(CASE WHEN status IN ('held','released') THEN amount END),0) AS pending,
              COALESCE(SUM(CASE WHEN status='paid' AND created_at >= DATE_FORMAT(NOW(),'%Y-%m-01') THEN amount END),0) AS this_month
         FROM provider_payouts WHERE provider_id = ?`,
      [userId],
    ))[0];
    const ratingAvg = listings.length ? listings.reduce((s: number, l: { rating_avg: string }) => s + Number(l.rating_avg), 0) / listings.length : 0;
    const acceptingRequests = listings.some((l: { availability: string }) => l.availability !== "offline");
    const verified = acct.verification_status === "verified";

    return {
      name: user.display_name,
      business_name: acct.business_name ?? null,
      phone: user.phone,
      verification_status: acct.verification_status ?? "pending",
      accepting_requests: acceptingRequests,
      services: listings.map((l: { key: string; name: string; code: string | null; availability: string; verified_at: string | null; rating_avg: string }) => ({
        key: l.key, name: l.name, code: l.code, active: l.availability !== "offline" && !!l.verified_at, rating: Number(l.rating_avg),
      })),
      metrics: {
        services_registered: listings.length,
        active_requests: active,
        completed_jobs: completed,
        average_rating: Number(ratingAvg.toFixed(2)),
      },
      earnings: {
        this_month: Number(earn.this_month),
        lifetime: Number(earn.lifetime),
        pending: Number(earn.pending),
      },
      readiness: {
        profile_complete: !!(acct.business_name && acct.kra_pin),
        documents_verified: verified,
        bank_verified: !!acct.bank_details,
        accepting_requests: acceptingRequests,
        ready: verified,
      },
    };
  },
};

export default providerService;
