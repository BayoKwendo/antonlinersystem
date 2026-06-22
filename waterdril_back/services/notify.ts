// =============================================================================
//  User notifications: persist an in-app notification, fan out an FCM push, and
//  optionally send a best-effort SMS. Push is enabled by setting the
//  FCM_SERVICE_ACCOUNT_JSON env var (see services/push.ts); otherwise it no-ops.
// =============================================================================
import client from "../db/client.ts";
import { sendSms } from "./smsService.ts";
import { pushToUser } from "./push.ts";

export async function notifyUser(
  userId: number,
  title: string,
  body: string,
  opts: { sms?: boolean; push?: boolean; data?: Record<string, unknown> } = {},
): Promise<void> {
  try {
    await client.query(
      `INSERT INTO notifications (user_id, title, body, data) VALUES (?, ?, ?, ?)`,
      [userId, title, body, opts.data ? JSON.stringify(opts.data) : null],
    );
    // Push by default; callers can opt out with { push: false }.
    if (opts.push !== false) await pushToUser(userId, title, body, opts.data);
    if (opts.sms) {
      const rows = await client.query(`SELECT phone FROM users WHERE id = ? LIMIT 1`, [userId]);
      if (rows[0]?.phone) await sendSms({ to: rows[0].phone, text: body, asciiOnly: true });
    }
  } catch (err) {
    console.error("[notify] failed:", err);
  }
}
