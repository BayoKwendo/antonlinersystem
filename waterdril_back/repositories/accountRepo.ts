// =============================================================================
//  Data access for identity, roles, profiles, OTP and refresh tokens.
//  All queries are parameterised.
// =============================================================================
import client from "../db/client.ts";

export interface UserRow {
  id: number;
  uuid: string;
  phone: string;
  email: string | null;
  password_hash: string | null;
  must_change_password: number;
  display_name: string;
  avatar_url: string | null;
  status: "active" | "suspended" | "pending";
  phone_verified_at: string | null;
}

const accountRepo = {
  async findByPhone(phone: string): Promise<UserRow | undefined> {
    const rows = await client.query(
      `SELECT * FROM users WHERE phone = ? AND deleted_at IS NULL LIMIT 1`,
      [phone],
    );
    return rows[0];
  },

  async findById(id: number): Promise<UserRow | undefined> {
    const rows = await client.query(
      `SELECT * FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [id],
    );
    return rows[0];
  },

  async rolesOf(userId: number): Promise<string[]> {
    const rows = await client.query(
      `SELECT r.\`key\` AS k FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = ?`,
      [userId],
    );
    return rows.map((r: { k: string }) => r.k);
  },

  /** Create a user + assign a role (by key) atomically; returns the new id. */
  async createWithRole(
    { phone, displayName, passwordHash, roleKey, verified }: {
      phone: string;
      displayName: string;
      passwordHash: string | null;
      roleKey: string;
      verified: boolean;
    },
  ): Promise<number> {
    return await client.withTransaction(async (query) => {
      const uuid = crypto.randomUUID();
      const res = await query(
        `INSERT INTO users (uuid, phone, display_name, password_hash, phone_verified_at)
         VALUES (?, ?, ?, ?, ${verified ? "CURRENT_TIMESTAMP" : "NULL"})`,
        [uuid, phone, displayName, passwordHash],
      );
      const userId = res.insertId as number;
      await query(
        `INSERT INTO user_roles (user_id, role_id)
         SELECT ?, id FROM roles WHERE \`key\` = ?`,
        [userId, roleKey],
      );
      return userId;
    });
  },

  async ensureCustomerProfile(userId: number): Promise<void> {
    await client.query(
      `INSERT IGNORE INTO customer_profiles (user_id) VALUES (?)`,
      [userId],
    );
  },

  async markPhoneVerified(userId: number): Promise<void> {
    await client.query(
      `UPDATE users SET phone_verified_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [userId],
    );
  },

  async setPassword(userId: number, passwordHash: string): Promise<void> {
    await client.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [passwordHash, userId]);
  },

  async setMustChangePassword(userId: number, value: boolean): Promise<void> {
    await client.query(`UPDATE users SET must_change_password = ? WHERE id = ?`, [value ? 1 : 0, userId]);
  },

  async updateProfile(
    userId: number,
    { displayName, email }: { displayName?: string; email?: string | null },
  ): Promise<void> {
    const sets: string[] = [];
    // deno-lint-ignore no-explicit-any
    const params: any[] = [];
    if (displayName !== undefined) {
      sets.push("display_name = ?");
      params.push(displayName);
    }
    if (email !== undefined) {
      sets.push("email = ?");
      params.push(email);
    }
    if (!sets.length) return;
    params.push(userId);
    await client.query(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, params);
  },

  // --- OTP -------------------------------------------------------------------
  async insertOtp(phone: string, codeHash: string, ttlSeconds: number): Promise<void> {
    await client.query(
      `INSERT INTO otp_codes (phone, code_hash, expires_at)
       VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? SECOND))`,
      [phone, codeHash, ttlSeconds],
    );
  },

  async latestValidOtp(
    phone: string,
  ): Promise<{ id: number; code_hash: string; attempts: number } | undefined> {
    const rows = await client.query(
      `SELECT id, code_hash, attempts FROM otp_codes
        WHERE phone = ? AND consumed_at IS NULL AND expires_at > CURRENT_TIMESTAMP
        ORDER BY id DESC LIMIT 1`,
      [phone],
    );
    return rows[0];
  },

  async bumpOtpAttempts(id: number): Promise<void> {
    await client.query(`UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?`, [id]);
  },

  async consumeOtp(id: number): Promise<void> {
    await client.query(`UPDATE otp_codes SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
  },

  // --- refresh tokens --------------------------------------------------------
  async insertRefresh(userId: number, tokenHash: string, ttlSeconds: number): Promise<void> {
    await client.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? SECOND))`,
      [userId, tokenHash, ttlSeconds],
    );
  },

  async findRefresh(
    tokenHash: string,
  ): Promise<{ id: number; user_id: number } | undefined> {
    const rows = await client.query(
      `SELECT id, user_id FROM refresh_tokens
        WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP
        LIMIT 1`,
      [tokenHash],
    );
    return rows[0];
  },

  async revokeRefresh(tokenHash: string): Promise<void> {
    await client.query(
      `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = ?`,
      [tokenHash],
    );
  },
};

export default accountRepo;
