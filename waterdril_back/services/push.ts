// =============================================================================
//  FCM push delivery (Firebase Cloud Messaging HTTP v1).
//
//  Configure with the service-account JSON from the Firebase console
//  (project driller-3a61b), supplied either inline as FCM_SERVICE_ACCOUNT_JSON
//  or as a file path in FCM_SERVICE_ACCOUNT_FILE. When neither is set, push
//  delivery is a no-op so the rest of the app (in-app notifications + SMS) keeps
//  working in dev. An OAuth access token is minted from the service account
//  (RS256 JWT -> Google token endpoint) and cached until shortly before expiry.
// =============================================================================
import { importPKCS8, SignJWT } from "../deps.ts";
import { PUSH } from "../config/config.ts";
import notificationRepo from "../repositories/notificationRepo.ts";

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

let account: ServiceAccount | null = null;
let warned = false;
let cachedToken: { value: string; expiresAt: number } | null = null;

function loadAccount(): ServiceAccount | null {
  if (account) return account;

  let raw = PUSH.SERVICE_ACCOUNT_JSON;
  if (!raw && PUSH.SERVICE_ACCOUNT_FILE) {
    try {
      raw = Deno.readTextFileSync(PUSH.SERVICE_ACCOUNT_FILE);
    } catch (err) {
      console.error(`[push] cannot read FCM_SERVICE_ACCOUNT_FILE (${PUSH.SERVICE_ACCOUNT_FILE}):`, err);
      return null;
    }
  }
  if (!raw) {
    if (!warned) {
      console.warn(
        "[push] FCM_SERVICE_ACCOUNT_JSON / FCM_SERVICE_ACCOUNT_FILE not set — push delivery disabled",
      );
      warned = true;
    }
    return null;
  }
  try {
    account = JSON.parse(raw) as ServiceAccount;
    return account;
  } catch (err) {
    console.error("[push] service-account JSON is invalid:", err);
    return null;
  }
}

/** Mint (and cache) an OAuth access token for the FCM API. */
async function accessToken(acct: ServiceAccount): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) return cachedToken.value;

  try {
    const key = await importPKCS8(acct.private_key, "RS256");
    const assertion = await new SignJWT({ scope: SCOPE })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(acct.client_email)
      .setSubject(acct.client_email)
      .setAudience(TOKEN_URL)
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(key);

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
    if (!res.ok) {
      console.error("[push] token endpoint error:", res.status, await res.text());
      return null;
    }
    const json = await res.json() as { access_token: string; expires_in: number };
    cachedToken = { value: json.access_token, expiresAt: now + (json.expires_in ?? 3600) };
    return cachedToken.value;
  } catch (err) {
    console.error("[push] failed to mint access token:", err);
    return null;
  }
}

async function sendOne(
  projectId: string,
  bearer: string,
  token: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const message: Record<string, unknown> = { token, notification: { title, body } };
  if (data) {
    // FCM data values must be strings.
    message.data = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)]),
    );
  }
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: { "Authorization": `Bearer ${bearer}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    },
  );
  if (res.status === 404 || res.status === 400) {
    // Stale/invalid token — drop it so we stop targeting a dead device.
    await notificationRepo.deleteDeviceToken(token).catch(() => {});
  } else if (!res.ok) {
    console.error("[push] send failed:", res.status, await res.text());
  }
}

/**
 * Best-effort push to every device registered for [userId]. Safe to await from
 * notifyUser; never throws.
 */
export async function pushToUser(
  userId: number,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const acct = loadAccount();
  if (!acct) return;
  try {
    const tokens = await notificationRepo.deviceTokens(userId);
    if (tokens.length === 0) return;
    const bearer = await accessToken(acct);
    if (!bearer) return;
    await Promise.all(
      tokens.map((t) => sendOne(acct.project_id, bearer, t, title, body, data)),
    );
  } catch (err) {
    console.error("[push] pushToUser failed:", err);
  }
}
