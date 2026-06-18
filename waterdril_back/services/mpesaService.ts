// =============================================================================
//  Safaricom M-Pesa (Daraja) STK-push integration.
// =============================================================================
import { formatDate } from "../deps.ts";
import { MPESA } from "../config/config.ts";

/** Fetch a short-lived OAuth access token. Returns null on failure. */
export async function getAccessToken(): Promise<string | null> {
  const auth = "Basic " + btoa(`${MPESA.CONSUMER_KEY}:${MPESA.CONSUMER_SECRET}`);
  try {
    const res = await fetch(MPESA.TOKEN_URL, {
      method: "GET",
      headers: { Authorization: auth, Accept: "*/*" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token ?? null;
  } catch (err) {
    console.error("[mpesa] token request failed:", err);
    return null;
  }
}

interface StkPushOptions {
  amount: string | number;
  msisdn: string;
  /** Account reference shown on the customer's prompt, e.g. drill<id>:<record>. */
  accountReference: string;
}

/**
 * Trigger an STK push. Resolves to true when Daraja accepts the request.
 */
/** Result of an accepted STK push (used to correlate the async callback). */
export interface StkPushResult {
  checkoutId: string;
  merchantId: string;
}

/**
 * Trigger an STK push. Returns the CheckoutRequestID on acceptance (so the
 * caller can correlate the asynchronous callback), or null on failure.
 */
export async function initiateStkPush(
  { amount, msisdn, accountReference }: StkPushOptions,
): Promise<StkPushResult | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const timestamp = formatDate(new Date(), "yyyyMMddHHmmss");
  const password = btoa(`${MPESA.SHORTCODE}${MPESA.PASSKEY}${timestamp}`);

  try {
    const res = await fetch(MPESA.STK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        BusinessShortCode: MPESA.SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: `${Math.round(Number(amount))}`,
        PartyA: msisdn,
        PartyB: MPESA.SHORTCODE,
        PhoneNumber: msisdn,
        CallBackURL: MPESA.CALLBACK_URL,
        AccountReference: accountReference,
        TransactionDesc: "Payment",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.ResponseCode !== "0" && data.ResponseCode !== 0) return null;
    return { checkoutId: data.CheckoutRequestID, merchantId: data.MerchantRequestID };
  } catch (err) {
    console.error("[mpesa] STK push failed:", err);
    return null;
  }
}
