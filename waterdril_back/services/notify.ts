// =============================================================================
//  User notifications: persist an in-app notification and best-effort SMS.
//  (FCM push is added in Phase 4; this is the single call-site to extend.)
// =============================================================================
import client from "../db/client.ts";
import { sendSms } from "./smsService.ts";

export async function notifyUser(
  userId: number,
  title: string,
  body: string,
  opts: { sms?: boolean; data?: Record<string, unknown> } = {},
): Promise<void> {
  try {
    await client.query(
      `INSERT INTO notifications (user_id, title, body, data) VALUES (?, ?, ?, ?)`,
      [userId, title, body, opts.data ? JSON.stringify(opts.data) : null],
    );
    if (opts.sms) {
      const rows = await client.query(`SELECT phone FROM users WHERE id = ? LIMIT 1`, [userId]);
      if (rows[0]?.phone) await sendSms({ to: rows[0].phone, text: body, asciiOnly: true });
    }
  } catch (err) {
    console.error("[notify] failed:", err);
  }
}
