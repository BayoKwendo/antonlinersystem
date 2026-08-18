// =============================================================================
//  Staff/admin operations for the SMART Drill journey: invoice, quote, assign a
//  provider (opens escrow), confirm payment, and release payouts. These use the
//  dedicated repo methods (not bookings.transition) because they act on the
//  pre-`booked` / financial states.
// =============================================================================
import client from "../db/client.ts";
import bookingRepo from "../repositories/bookingRepo.ts";
import invoiceRepo from "../repositories/invoiceRepo.ts";
import payoutRepo from "../repositories/payoutRepo.ts";
import documentRepo from "../repositories/documentRepo.ts";
import escrow from "./escrow.ts";
import { notifyQualifiedProviders } from "./jobs.ts";
import { badRequest, notFound } from "../utils/errors.ts";
import { audit } from "./audit.ts";
import { notifyUser } from "./notify.ts";
import accountRepo from "../repositories/accountRepo.ts";
import ratingKpi from "./ratingKpi.ts";
import { sendEmail, emailLayout } from "./emailService.ts";
import { APP } from "../config/config.ts";

const kes = (n: number) => "KES " + n.toLocaleString("en-KE");

export const adminOps = {
  /** Issue an invoice for a request (uses quoted_amount, then total_amount, then explicit amount). */
  async issueInvoice(bookingId: number, amount: number | undefined, actorId: number) {
    const b = (await bookingRepo.byId(bookingId))[0];
    if (!b) throw notFound("Request not found.");
    const amt = amount ?? (b.quoted_amount != null ? Number(b.quoted_amount) : Number(b.total_amount));
    if (!amt || amt <= 0) throw badRequest("An invoice amount is required.");
    const inv = await client.withTransaction(async (query) => {
      const created = await invoiceRepo.issue({ bookingId, amount: amt, party: "customer", prefix: "INV" }, query);
      await bookingRepo.setStatus(bookingId, "pending_payment", query);
      await bookingRepo.addEvent(bookingId, "pending_payment", actorId, `invoice ${created.number}`, query);
      return created;
    });
    await notifyUser(b.customer_id, "Invoice issued", `Invoice ${inv.number} for ${kes(amt)} is ready. Pay to confirm your request.`, { push: false });
    // Email the invoice to the customer (also stored in `invoices` for admin viewing).
    const cust = await accountRepo.findById(b.customer_id);
    if (cust?.email) {
      const trackLink = APP.WEB_URL && b.tracking_token
        ? `${APP.WEB_URL.replace(/\/+$/, "")}/track/${b.tracking_token}`
        : null;
      sendEmail({
        to: cust.email,
        subject: `Invoice ${inv.number} — SMART Drill`,
        html: emailLayout(`Invoice ${inv.number}`, `
          <p>Your invoice for request <strong>${b.request_no ?? "#" + bookingId}</strong> is ready.</p>
          <table style="width:100%;border-collapse:collapse;margin:14px 0">
            <tr><td style="padding:8px 0;color:#5a6b7c;border-bottom:1px solid #eef2f7">Invoice number</td><td style="padding:8px 0;text-align:right;font-weight:600;border-bottom:1px solid #eef2f7">${inv.number}</td></tr>
            <tr><td style="padding:8px 0;color:#5a6b7c">Amount due</td><td style="padding:8px 0;text-align:right;font-weight:700;font-size:18px">${kes(amt)}</td></tr>
          </table>
          <p>Pay to confirm your request.${trackLink ? ` <a href="${trackLink}" style="color:#1656c7">Open your request →</a>` : ""}</p>`),
      }).catch(() => {});
    }
    await audit(actorId, "invoice.issue", "booking", bookingId, { number: inv.number, amount: amt });
    return { number: inv.number, amount: amt };
  },

  /** Set a quote on a quote-mode request (customer then gets an invoice/pays). */
  async setQuote(bookingId: number, amount: number, actorId: number) {
    const b = (await bookingRepo.byId(bookingId))[0];
    if (!b) throw notFound("Request not found.");
    if (!amount || amount <= 0) throw badRequest("A quote amount is required.");
    await client.withTransaction(async (query) => {
      await bookingRepo.setQuote(bookingId, amount, query);
      await bookingRepo.setStatus(bookingId, "quoted", query);
      await bookingRepo.addEvent(bookingId, "quoted", actorId, `quoted ${kes(amount)}`, query);
    });
    await notifyUser(b.customer_id, "Quote ready", `We've sent a quote of ${kes(amount)} for your request.`, { push: false });
    await audit(actorId, "quote.set", "booking", bookingId, { amount });
    return { quoted_amount: amount };
  },

  /** Confirm payment (manual/fallback — real STK confirms via the M-Pesa callback). */
  async confirmPayment(bookingId: number, actorId: number) {
    const b = (await bookingRepo.byId(bookingId))[0];
    if (!b) throw notFound("Request not found.");
    const inv = await invoiceRepo.byBooking(bookingId);
    const paid = inv ? Number(inv.amount) : Number(b.total_amount);
    await client.withTransaction(async (query) => {
      await invoiceRepo.markPaidByBooking(bookingId, query);
      await bookingRepo.setStatus(bookingId, "booked", query);
      await bookingRepo.addPaid(bookingId, paid, query);
      await bookingRepo.addEvent(bookingId, "booked", actorId, "payment confirmed", query);
    });
    await notifyUser(b.customer_id, "Payment confirmed", "Your payment is confirmed and held securely. We're notifying providers now.", { push: false });
    // Notify qualified providers in this category — first to accept gets the job.
    await notifyQualifiedProviders(b.category_id);
    await audit(actorId, "payment.confirm", "booking", bookingId, { amount: paid });
    return { status: "booked", amount_paid: paid };
  },

  /** Assign a provider → opens the escrow (advance+final held). */
  async assign(bookingId: number, providerId: number, actorId: number) {
    const b = (await bookingRepo.byId(bookingId))[0];
    if (!b) throw notFound("Request not found.");
    const gross = b.quoted_amount != null ? Number(b.quoted_amount) : Number(b.total_amount);
    await client.withTransaction(async (query) => {
      await bookingRepo.assignProvider(bookingId, providerId, query);
      if (b.status === "pending_payment" || b.status === "submitted" || b.status === "quoted") {
        await bookingRepo.setStatus(bookingId, "booked", query);
      }
      await bookingRepo.addEvent(bookingId, "booked", actorId, "provider assigned", query);
      await escrow.onAssigned(bookingId, providerId, gross, query);
    });
    await notifyUser(providerId, "New job assigned", "You've been assigned a new SMART Drill job. Open the app to view it.", { push: true });
    await notifyUser(b.customer_id, "Provider assigned", "A vetted provider has been assigned to your request.", { push: false });
    await audit(actorId, "request.assign", "booking", bookingId, { provider_id: providerId, gross });
    return { status: "booked", provider_id: providerId };
  },

  /** Ops QA: verify a completed job → release the final payout (report-gated) + confirm. */
  async verifyCompletion(bookingId: number, actorId: number) {
    const b = (await bookingRepo.byId(bookingId))[0];
    if (!b) throw notFound("Request not found.");
    if (b.status !== "completed") throw badRequest("This job isn't marked completed yet.");
    await client.withTransaction(async (query) => {
      await escrow.releaseFinal(bookingId, query); // asserts a report exists
      await bookingRepo.setStatus(bookingId, "confirmed", query);
      await bookingRepo.setCustomerConfirmed(bookingId, query);
      await bookingRepo.addEvent(bookingId, "confirmed", actorId, "ops verified completion", query);
    });
    await notifyUser(b.customer_id, "Service completed", "Your service is complete and verified. Thank you for choosing SMART Drill.", { push: false });
    await audit(actorId, "request.verify", "booking", bookingId, {});
    return { status: "confirmed" };
  },

  /**
   * Ops-assigned provider rating for a completed job (customer feedback /
   * timeliness / long-term quality). Aggregates into the provider's per-service
   * rating. Re-rating the same job updates the existing record.
   */
  async rateProvider(
    bookingId: number,
    input: { rating: number; feedback?: number; timeliness?: number; quality?: number; note?: string },
    actorId: number,
  ) {
    const b = (await bookingRepo.byId(bookingId))[0];
    if (!b) throw notFound("Request not found.");
    if (b.provider_id == null) throw badRequest("This request has no assigned provider to rate.");
    const providerId = Number(b.provider_id);
    const categoryId = Number(b.category_id);

    await client.withTransaction(async (query) => {
      await query(
        `INSERT INTO provider_ratings
           (booking_id, provider_id, category_id, rating, score_feedback, score_timeliness, score_quality, note, rated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE rating=VALUES(rating), score_feedback=VALUES(score_feedback),
           score_timeliness=VALUES(score_timeliness), score_quality=VALUES(score_quality),
           note=VALUES(note), rated_by=VALUES(rated_by)`,
        [bookingId, providerId, categoryId, input.rating, input.feedback ?? null, input.timeliness ?? null, input.quality ?? null, input.note ?? null, actorId],
      );
      // Recompute this provider's rating for the service.
      await query(
        `UPDATE provider_profiles pp SET
           pp.rating_avg   = (SELECT ROUND(AVG(rating), 2) FROM provider_ratings WHERE provider_id = ? AND category_id = ?),
           pp.rating_count = (SELECT COUNT(*)              FROM provider_ratings WHERE provider_id = ? AND category_id = ?)
         WHERE pp.user_id = ? AND pp.category_id = ?`,
        [providerId, categoryId, providerId, categoryId, providerId, categoryId],
      );
    });
    // Recompute the automatic KPI score now that the customer-feedback rating is in.
    await ratingKpi.computeForBooking(bookingId);
    await notifyUser(providerId, "New performance rating",
      `Smart Drill rated your recent job ${b.request_no ?? ""}: ${input.rating}/5.`.replace(/\s+/g, " ").trim(), { push: false });
    await audit(actorId, "provider.rate", "booking", bookingId, { rating: input.rating });
    return { rating: input.rating };
  },

  /** A provider's automatic KPI breakdown (for the portal Ratings view). */
  providerKpi(providerId: number) {
    return ratingKpi.forProvider(providerId);
  },

  /** Admin resets a provider's ratings + KPI history to zero. */
  async resetProviderRating(providerId: number, actorId: number) {
    const r = await ratingKpi.reset(providerId);
    await audit(actorId, "provider.resetRating", "user", providerId, {});
    return r;
  },

  async markPayoutPaid(payoutId: number, ref: string | null, actorId: number) {
    const n = await payoutRepo.markPaid(payoutId, ref);
    if (!n) throw badRequest("Payout is not released (only released payouts can be marked paid).");
    await audit(actorId, "payout.markPaid", "payout", payoutId, { ref });
    return { status: "paid" };
  },

  /** Attach a deliverable (report/quote/etc.) to a booking — the report gates the final payout. */
  async addDocument(bookingId: number, kind: string, url: string, actorId: number) {
    const b = (await bookingRepo.byId(bookingId))[0];
    if (!b) throw notFound("Request not found.");
    const id = await documentRepo.add({ bookingId, kind, url, uploadedBy: actorId });
    await audit(actorId, "document.add", "booking", bookingId, { kind });
    return { id, kind, url };
  },

  documents(bookingId: number) { return documentRepo.byBooking(bookingId); },
  listRequests(status?: string) { return bookingRepo.listRequests(status); },
  listInvoices(status?: string) { return invoiceRepo.list(status); },
  listPayouts(status?: string) { return payoutRepo.list(status); },
  payoutsForBooking(bookingId: number) { return payoutRepo.byBooking(bookingId); },
};

export default adminOps;
