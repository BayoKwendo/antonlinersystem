// =============================================================================
//  Outbound SMS via the Onfon Media bulk gateway.
//  Every send is persisted to `sms_logs` for auditing.
// =============================================================================
import { SMS } from "../config/config.ts";
import userRepository from "../repositories/userRepository.ts";

interface SendSmsOptions {
  to: string;
  text: string;
  /** When true, strip non-ASCII chars (some gateways reject them). */
  asciiOnly?: boolean;
}

/** Send a single SMS and record it. Failures are logged but never thrown. */
export async function sendSms({ to, text, asciiOnly = false }: SendSmsOptions): Promise<boolean> {
  const body = asciiOnly ? text.replace(/[^\x00-\x7F]/g, " ") : text;
  try {
    const res = await fetch(SMS.URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        AccessKey: SMS.ACCESS_KEY,
      },
      body: JSON.stringify({
        ApiKey: SMS.API_KEY,
        SenderId: SMS.SENDER_ID,
        ClientId: SMS.CLIENT_ID,
        MessageParameters: [{ Number: to, Text: body }],
      }),
    });

    // Audit the message regardless of gateway result.
    await userRepository.insertSmsLog({ msisdn: to, message: text });
    return res.ok;
  } catch (err) {
    console.error(`[sms] failed to send to ${to}:`, err);
    return false;
  }
}
