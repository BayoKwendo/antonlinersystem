// =============================================================================
//  Outbound email via SMTP (OTP codes + customer invoices).
//  Configure EMAIL_HOST/PORT/USER/PASS/FROM in the environment. If EMAIL_HOST is
//  unset, delivery is a no-op (dev-safe) — mirrors the SMS service. Failures are
//  logged, never thrown, so email never breaks the calling flow.
// =============================================================================
import { SMTPClient } from "denomailer";
import { EMAIL } from "../config/config.ts";

interface SendEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

const isConfigured = () => !!EMAIL.HOST;

/** Send a single email. Returns false (and logs) when unconfigured or on error. */
export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<boolean> {
  if (!to || !to.includes("@")) return false;
  if (!isConfigured()) {
    console.warn(`[email] not configured (EMAIL_HOST unset) — skipped "${subject}" to ${to}`);
    return false;
  }
  const client = new SMTPClient({
    connection: {
      hostname: EMAIL.HOST,
      port: EMAIL.PORT,
      tls: EMAIL.SECURE,
      auth: EMAIL.USER ? { username: EMAIL.USER, password: EMAIL.PASS } : undefined,
    },
  });
  try {
    await client.send({
      from: EMAIL.FROM,
      to,
      subject,
      content: text ?? (html ? html.replace(/<[^>]+>/g, " ") : ""),
      html: html ?? undefined,
    });
    return true;
  } catch (err) {
    console.error(`[email] failed to send "${subject}" to ${to}:`, err);
    return false;
  } finally {
    try {
      await client.close();
    } catch { /* ignore close errors */ }
  }
}

/** Minimal branded HTML wrapper for transactional emails. */
export function emailLayout(title: string, bodyHtml: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1a2b3c">
    <div style="background:#0c1e3a;padding:18px 24px;border-radius:10px 10px 0 0">
      <span style="color:#fff;font-weight:700;font-size:18px">SMART</span><span style="color:#4e9bff;font-weight:700;font-size:18px"> DRILL</span>
    </div>
    <div style="border:1px solid #e6ebf2;border-top:none;border-radius:0 0 10px 10px;padding:24px">
      <h2 style="margin:0 0 12px;font-size:18px">${title}</h2>
      ${bodyHtml}
      <p style="color:#8a97a8;font-size:12px;margin-top:24px">SMART Drill — borehole services marketplace.</p>
    </div>
  </div>`;
}

export default { sendEmail, emailLayout };
