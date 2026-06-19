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
};

export default notificationRepo;
