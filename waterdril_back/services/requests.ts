// =============================================================================
//  Public service-request flow (SMART Drill customer journey).
//
//  Frictionless: a request auto-creates/reuses the customer by phone (no OTP),
//  mints a request number + a read-only tracking token, and stores the
//  per-service form fields as JSON. Fixed-price services land in
//  `pending_payment` (an invoice/payment step follows); quote services land in
//  `submitted` (a provider quote follows). Both are pre-assignment, so
//  provider_id is NULL until an admin assigns one.
// =============================================================================
import client from "../db/client.ts";
import accountRepo from "../repositories/accountRepo.ts";
import bookingRepo from "../repositories/bookingRepo.ts";
import { normalizePhone, isValidMsisdn } from "../utils/phone.ts";
import { badRequest, notFound } from "../utils/errors.ts";
import { audit } from "./audit.ts";
import { notifyUser } from "./notify.ts";
import escrow from "./escrow.ts";
import authService from "./authService.ts";
import { notifyQualifiedProviders } from "./jobs.ts";
import { APP } from "../config/config.ts";

export interface CreateRequestInput {
  service_key: string;
  full_name: string;
  phone: string;
  otp_code: string;
  email?: string;
  location?: { lat: number; lng: number } | null;
  details?: Record<string, string>;
  documents?: string[];
}

/** Find-or-create a customer by phone. The phone is OTP-verified by this point. */
async function upsertCustomerByPhone(phone: string, name?: string): Promise<number> {
  const existing = await accountRepo.findByPhone(phone);
  if (!existing) {
    const id = await accountRepo.createWithRole({
      phone,
      displayName: name?.trim() || `Customer ${phone.slice(-4)}`,
      passwordHash: null,
      roleKey: "customer",
      verified: true, // phone was just verified via OTP
    });
    await accountRepo.ensureCustomerProfile(id);
    return id;
  }
  await accountRepo.ensureRole(existing.id, "customer");
  await accountRepo.ensureCustomerProfile(existing.id);
  if (!existing.phone_verified_at) await accountRepo.markPhoneVerified(existing.id);
  return existing.id;
}

function isDupEntry(e: unknown): boolean {
  const err = e as { code?: string; message?: string };
  return err?.code === "ER_DUP_ENTRY" || (err?.message ?? "").includes("Duplicate entry");
}

export const requestsService = {
  async create(input: CreateRequestInput) {
    const phone = normalizePhone(input.phone);
    if (!isValidMsisdn(phone)) throw badRequest("Enter a valid Kenyan phone number.");

    // Gate: the phone must be OTP-verified (validated + consumed server-side so
    // the public endpoint can't be bypassed).
    await authService.assertOtp(phone, input.otp_code);

    const catRows = await client.query(
      `SELECT id, pricing_mode, price, name, code_prefix FROM service_categories
        WHERE \`key\` = ? AND active = 1 LIMIT 1`,
      [input.service_key],
    );
    const cat = catRows[0];
    if (!cat) throw badRequest("Unknown or unavailable service.");

    const pricingMode = (cat.pricing_mode as "fixed" | "quote") ?? "fixed";
    const totalAmount = pricingMode === "fixed" && cat.price != null ? Number(cat.price) : 0;

    const customerId = await upsertCustomerByPhone(phone, input.full_name);

    // Merge identity + per-service fields into the stored JSON blob (drop the
    // client-only `__mode` hint; pricing_mode is authoritative from the DB).
    const rawDetails = { ...(input.details ?? {}) };
    delete rawDetails.__mode;
    const details = {
      full_name: input.full_name,
      phone,
      email: input.email ?? null,
      ...rawDetails,
      documents: input.documents ?? [],
    };

    const address = (rawDetails.county as string | undefined) ?? null;
    const lat = input.location?.lat ?? null;
    const lng = input.location?.lng ?? null;

    // Insert with a single retry if the minted request_no races a concurrent one.
    let created: { id: number; uuid: string; requestNo: string; trackingToken: string } | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        created = await bookingRepo.createPublicRequest({
          customerId, categoryId: cat.id, code: (cat.code_prefix as string) ?? "SD",
          pricingMode, totalAmount, address, lat, lng, details,
        });
        break;
      } catch (e) {
        if (attempt === 0 && isDupEntry(e)) continue;
        throw e;
      }
    }
    if (!created) throw badRequest("Could not create your request. Please try again.");

    // Best-effort post-commit side effects (never fail the request).
    await audit(null, "request.create", "booking", created.id, {
      request_no: created.requestNo,
      service: input.service_key,
      pricing_mode: pricingMode,
    });
    // Confirmation SMS + in-app notification, including the order (request)
    // number and a read-only tracking link (when the public web URL is set).
    const trackText = APP.WEB_URL
      ? `Track it here: ${APP.WEB_URL.replace(/\/+$/, "")}/track/${created.trackingToken}`
      : "We'll keep you updated by SMS.";
    await notifyUser(
      customerId,
      "Request received",
      `SMART Drill: your ${cat.name} request ${created.requestNo} has been received. We're notifying providers now and will send your invoice once one accepts. ${trackText}`,
      { sms: true, push: false, data: { request_no: created.requestNo, tracking_token: created.trackingToken } },
    );
    // Broadcast to qualified providers — first to accept secures the job.
    await notifyQualifiedProviders(cat.id);

    return {
      request_no: created.requestNo,
      tracking_token: created.trackingToken,
      pricing_mode: pricingMode,
    };
  },

  /**
   * Look up a request by its order number + the phone it was placed with, and
   * return the tracking token so the customer can open the status page. The
   * phone is a second factor (order numbers are guessable); errors are generic
   * so we don't reveal which part was wrong.
   */
  async lookup(requestNo: string, phone: string) {
    const rn = (requestNo ?? "").trim().toUpperCase();
    const ph = normalizePhone(phone ?? "");
    if (rn.length < 3 || !isValidMsisdn(ph)) {
      throw notFound("We couldn't find a request with those details.");
    }
    const token = await bookingRepo.trackingTokenByRequestNoPhone(rn, ph);
    if (!token) throw notFound("We couldn't find a request with those details.");
    // Details match — send a one-time code to the phone on file. The token is
    // only returned after the code is verified (see lookupVerify).
    const { expiresIn } = await authService.requestOtp(ph);
    return { otp_required: true, expires_in: expiresIn };
  },

  /** Step 2 of the order lookup: verify the OTP, then return the tracking token. */
  async lookupVerify(requestNo: string, phone: string, otpCode: string) {
    const rn = (requestNo ?? "").trim().toUpperCase();
    const ph = normalizePhone(phone ?? "");
    if (rn.length < 3 || !isValidMsisdn(ph)) {
      throw notFound("We couldn't find a request with those details.");
    }
    await authService.assertOtp(ph, otpCode); // throws on wrong/expired/exhausted code
    const token = await bookingRepo.trackingTokenByRequestNoPhone(rn, ph);
    if (!token) throw notFound("We couldn't find a request with those details.");
    return { tracking_token: token };
  },

  async track(token: string) {
    if (!token || token.length < 16) throw notFound("We couldn't find that request.");
    const row = await bookingRepo.byTrackingToken(token);
    if (!row) throw notFound("We couldn't find that request.");

    const num = (v: unknown) => (v != null && Number.isFinite(Number(v)) ? Number(v) : null);
    const siteLat = num(row.site_lat), siteLng = num(row.site_lng);
    const provLat = num(row.provider_lat), provLng = num(row.provider_lng);

    return {
      request_no: row.request_no,
      status: row.status,
      pricing_mode: row.pricing_mode,
      service_name: row.service_name,
      service_key: row.service_key,
      customer_name: row.customer_name,
      provider_name: row.provider_name ?? null,
      provider_phone: row.provider_phone ?? null,
      total_amount: Number(row.total_amount),
      quoted_amount: row.quoted_amount != null ? Number(row.quoted_amount) : null,
      amount_paid: Number(row.amount_paid),
      scheduled_at: row.scheduled_at,
      created_at: row.created_at,
      // The customer's site pin (destination the provider travels to).
      site_location: siteLat != null && siteLng != null ? { lat: siteLat, lng: siteLng } : null,
      // The provider's last-known live position (REST fallback / instant first paint).
      provider_location: provLat != null && provLng != null
        ? { lat: provLat, lng: provLng, at: row.provider_loc_at ?? null }
        : null,
    };
  },

  /** Customer confirms the provider has arrived → release the advance payout. */
  async confirmArrival(token: string) {
    const b = await bookingRepo.rawByTrackingToken(token);
    if (!b) throw notFound("We couldn't find that request.");
    if (b.status !== "en_route" && b.status !== "arrived") {
      throw badRequest("Your provider hasn't started travelling to you yet.");
    }
    await client.withTransaction(async (query) => {
      if (b.status === "en_route") {
        await bookingRepo.setStatus(b.id, "arrived", query);
        await bookingRepo.addEvent(b.id, "arrived", b.customer_id, "customer confirmed arrival", query);
      }
      await escrow.releaseAdvance(b.id, query);
    });
    await audit(b.customer_id, "request.confirmArrival", "booking", b.id, {});
    return { status: "arrived" };
  },

  /** Customer confirms completion → release the final payout (report required). */
  async confirmCompletion(token: string) {
    const b = await bookingRepo.rawByTrackingToken(token);
    if (!b) throw notFound("We couldn't find that request.");
    if (b.status !== "completed") throw badRequest("This request isn't marked completed yet.");
    await client.withTransaction(async (query) => {
      await escrow.releaseFinal(b.id, query); // asserts a report exists — rolls back otherwise
      await bookingRepo.setStatus(b.id, "confirmed", query);
      await bookingRepo.setCustomerConfirmed(b.id, query);
      await bookingRepo.addEvent(b.id, "confirmed", b.customer_id, "customer confirmed completion", query);
    });
    await audit(b.customer_id, "request.confirmCompletion", "booking", b.id, {});
    return { status: "confirmed" };
  },

  /** Customer raises a complaint → dispute the request (final payout stays held). */
  async complaint(token: string, message: string) {
    const b = await bookingRepo.rawByTrackingToken(token);
    if (!b) throw notFound("We couldn't find that request.");
    if (!message?.trim()) throw badRequest("Please describe the issue.");
    await client.withTransaction(async (query) => {
      await bookingRepo.setStatus(b.id, "disputed", query);
      await bookingRepo.addEvent(b.id, "disputed", b.customer_id, "complaint raised", query);
      await query(
        `INSERT INTO complaints (booking_id, customer_id, provider_id, message) VALUES (?, ?, ?, ?)`,
        [b.id, b.customer_id, b.provider_id, message.trim()],
      );
    });
    await audit(b.customer_id, "request.complaint", "booking", b.id, {});
    return { status: "disputed" };
  },
};

export default requestsService;
