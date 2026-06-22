// =============================================================================
//  In-app notifications data access (per-user inbox; populated by notifyUser).
// =============================================================================
import client from "../db/client.ts";

function clamp(limit?: number, offset?: number) {
  return {
    limit: Math.min(Math.max(Number(limit) || 25, 1), 100),
    offset: Math.max(Number(offset) || 0, 0),
  };
}

const notificationRepo = {
  async list(userId: number, limit?: number, offset?: number) {
    const p = clamp(limit, offset);
    const [count] = await client.query(
      `SELECT COUNT(*) AS total FROM notifications WHERE user_id = ?`,
      [userId],
    );
    const [unread] = await client.query(
      `SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND read_at IS NULL`,
      [userId],
    );
    const items = await client.query(
      `SELECT id, title, body, data, read_at, created_at
         FROM notifications WHERE user_id = ?
        ORDER BY id DESC LIMIT ? OFFSET ?`,
      [userId, p.limit, p.offset],
    );
    return { items, total: count.total, unread: unread.unread };
  },

  markRead(id: number, userId: number) {
    return client.query(
      `UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? AND read_at IS NULL`,
      [id, userId],
    );
  },

  markAllRead(userId: number) {
    return client.query(
      `UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL`,
      [userId],
    );
  },

  /** Upsert a device's push token, (re)assigning it to this user. */
  saveDeviceToken(userId: number, token: string, platform: string) {
    return client.query(
      `INSERT INTO device_tokens (user_id, token, platform) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), platform = VALUES(platform)`,
      [userId, token, platform],
    );
  },

  /** All push tokens registered for a user (for fan-out). */
  async deviceTokens(userId: number): Promise<string[]> {
    const rows = await client.query(
      `SELECT token FROM device_tokens WHERE user_id = ?`,
      [userId],
    );
    return rows.map((r: { token: string }) => r.token);
  },

  /** Drop a token (e.g. when FCM reports it unregistered). */
  deleteDeviceToken(token: string) {
    return client.query(`DELETE FROM device_tokens WHERE token = ?`, [token]);
  },
};

export default notificationRepo;
