// =============================================================================
//  Provider job marketplace + delivery (driver app).
//    accept        — first-come claim + propose a service date (BEFORE payment)
//    promptPayment — generate the two pro-formas (customer 100% / provider 90%)
//    setStatus     — headed→arrived(release advance)→in_progress→completed
//    addReport     — upload the deliverable (gates the final payout)
// =============================================================================
import client from "../db/client.ts";
import bookingRepo from "../repositories/bookingRepo.ts";
import invoiceRepo from "../repositories/invoiceRepo.ts";
import documentRepo from "../repositories/documentRepo.ts";
import accountRepo from "../repositories/accountRepo.ts";
import escrow from "./escrow.ts";
import { badRequest, conflict, forbidden, notFound } from "../utils/errors.ts";
import { audit } from "./audit.ts";
import { notifyUser } from "./notify.ts";
import { sendEmail, emailLayout } from "./emailService.ts";
import { APP } from "../config/config.ts";

const kes = (n: number) => "KES " + n.toLocaleString("en-KE");
const PROVIDER_CUT = 0.90; // provider pro-forma = 90% of the service fee (10% commission)
const JOB_FLOW = ["booked", "en_route", "arrived", "in_progress", "completed"];

export const jobsService = {
  /** New, unassigned jobs this verified provider can accept. */
  listAvailable(providerId: number) {
    return bookingRepo.availableForProvider(providerId);
  },

  /** The provider's own job cards (any state). */
  myJobs(providerId: number) {
    return bookingRepo.jobsForProvider(providerId);
  },

  /** Dismiss a broadcast request from this provider's list (stays for others). */
  async decline(providerId: number, bookingId: number) {
    const b = (await bookingRepo.byId(bookingId))[0];
    if (!b) throw notFound("Job not found.");
    await client.query(`INSERT IGNORE INTO job_declines (booking_id, provider_id) VALUES (?, ?)`, [bookingId, providerId]);
    await audit(providerId, "job.decline", "booking", bookingId, {});
    return { declined: true };
  },

  /** Accept & propose availability (first-come, BEFORE payment). */
  async accept(providerId: number, bookingId: number, scheduledAt: string, note?: string) {
    const b = (await bookingRepo.byId(bookingId))[0];
    if (!b) throw notFound("Job not found.");
    // One paid job at a time: block new acceptances while a paid job is unfinished.
    if (await bookingRepo.hasActivePaidJob(providerId)) {
      throw conflict("Finish your current job before taking a new one — you can only handle one paid job at a time.");
    }
    const claimed = await client.withTransaction(async (query) => {
      const n = await bookingRepo.acceptJob(bookingId, providerId, scheduledAt, query);
      if (n !== 1) return false;
      await bookingRepo.addEvent(bookingId, "pending_payment", providerId, note ? `accepted: ${note}` : "provider accepted & proposed date", query);
      return true;
    });
    if (!claimed) throw conflict("This job has already been taken.");
    await notifyUser(b.customer_id, "Provider accepted your request",
      `A provider accepted your request and proposed ${new Date(scheduledAt).toLocaleString("en-KE")}. Complete payment to confirm.`, { push: false });
    await audit(providerId, "job.accept", "booking", bookingId, { scheduled_at: scheduledAt });
    return { status: "pending_payment", scheduled_at: scheduledAt };
  },

  /** Provider marks that they've contacted the customer — drives the Customer
   *  Contact Speed KPI. First tap wins (COALESCE keeps the earliest time). */
  async markContacted(providerId: number, bookingId: number) {
    const b = (await bookingRepo.byId(bookingId))[0];
    if (!b) throw notFound("Job not found.");
    if (Number(b.provider_id) !== providerId) throw forbidden();
    await client.query(`UPDATE bookings SET contacted_at = COALESCE(contacted_at, NOW()) WHERE id = ?`, [bookingId]);
    await audit(providerId, "job.contacted", "booking", bookingId, {});
    return { contacted: true };
  },

  /** Generate the two pro-forma invoices and prompt the customer to pay. */
  async promptPayment(providerId: number, bookingId: number) {
    const b = (await bookingRepo.byId(bookingId))[0];
    if (!b) throw notFound("Job not found.");
    if (Number(b.provider_id) !== providerId) throw forbidden();
    if (b.status !== "pending_payment") throw badRequest("This job isn't awaiting payment.");
    const gross = Number(b.quoted_amount ?? b.total_amount);
    if (!gross || gross <= 0) throw badRequest("A quote is required before prompting payment.");
    const providerAmount = Math.round(gross * PROVIDER_CUT);

    let custInv: { number: string } | null = null;
    if (!(await invoiceRepo.byBooking(bookingId, "customer"))) { // idempotent
      custInv = await client.withTransaction(async (query) => {
        const ci = await invoiceRepo.issue({ bookingId, amount: gross, party: "customer", prefix: "INV" }, query);
        await invoiceRepo.issue({ bookingId, amount: providerAmount, party: "provider", prefix: "PI" }, query);
        return ci;
      });
    }
    await notifyUser(b.customer_id, "Payment requested", `Please pay ${kes(gross)} to confirm your request ${b.request_no ?? ""}.`.trim(), { push: false });
    // Email the invoice to the customer when it was just issued (mirrors adminOps.issueInvoice).
    if (custInv) {
      const cust = await accountRepo.findById(b.customer_id);
      if (cust?.email) {
        const trackLink = APP.WEB_URL && b.tracking_token
          ? `${APP.WEB_URL.replace(/\/+$/, "")}/track/${b.tracking_token}`
          : null;
        sendEmail({
          to: cust.email,
          subject: `Invoice ${custInv.number} — SMART Drill`,
          html: emailLayout(`Invoice ${custInv.number}`, `
            <p>Your invoice for request <strong>${b.request_no ?? "#" + bookingId}</strong> is ready.</p>
            <table style="width:100%;border-collapse:collapse;margin:14px 0">
              <tr><td style="padding:8px 0;color:#5a6b7c;border-bottom:1px solid #eef2f7">Invoice number</td><td style="padding:8px 0;text-align:right;font-weight:600;border-bottom:1px solid #eef2f7">${custInv.number}</td></tr>
              <tr><td style="padding:8px 0;color:#5a6b7c">Amount due</td><td style="padding:8px 0;text-align:right;font-weight:700;font-size:18px">${kes(gross)}</td></tr>
            </table>
            <p>Pay to confirm your request.${trackLink ? ` <a href="${trackLink}" style="color:#1656c7">Open your request →</a>` : ""}</p>`),
        }).catch(() => {});
      }
    }
    await audit(providerId, "job.promptPayment", "booking", bookingId, { gross, providerAmount });
    return { customer_amount: gross, provider_amount: providerAmount, commission: gross - providerAmount };
  },

  /** Provider status: headed→arrived(release advance)→in_progress→completed. */
  async setStatus(providerId: number, bookingId: number, to: string, note?: string) {
    const b = (await bookingRepo.byId(bookingId))[0];
    if (!b) throw notFound("Job not found.");
    if (Number(b.provider_id) !== providerId) throw forbidden();
    const fromIdx = JOB_FLOW.indexOf(b.status);
    const toIdx = JOB_FLOW.indexOf(to);
    if (fromIdx < JOB_FLOW.indexOf("booked")) throw badRequest("This job isn't confirmed/paid yet.");
    if (toIdx !== fromIdx + 1) throw badRequest(`Cannot move from ${b.status} to ${to}.`);

    // A job cannot be marked complete until the required deliverables are uploaded.
    if (to === "completed") {
      const [hasReport, hasEtims] = await Promise.all([
        documentRepo.hasReport(bookingId),
        documentRepo.hasKind(bookingId, "etims_invoice"),
      ]);
      if (!hasReport || !hasEtims) {
        throw badRequest("Upload the completion report and the eTIMS invoice before marking this job complete.");
      }
    }

    await client.withTransaction(async (query) => {
      await bookingRepo.setStatus(bookingId, to, query);
      await bookingRepo.addEvent(bookingId, to, providerId, note ?? "", query);
      if (to === "arrived") await escrow.releaseAdvance(bookingId, query); // down payment on arrival
    });
    const msg = to === "en_route" ? "Your provider is on the way." :
      to === "arrived" ? "Your provider has arrived on site." :
      to === "in_progress" ? "Your service is in progress." :
      "The work is complete — SMART Drill will confirm with you shortly.";
    await notifyUser(b.customer_id, "Service update", msg, { push: false });
    await audit(providerId, "job.status", "booking", bookingId, { to });
    return { status: to };
  },

  /** Upload a deliverable (report/photos). A report gates the final payout. */
  async addReport(providerId: number, bookingId: number, kind: string, url: string) {
    const b = (await bookingRepo.byId(bookingId))[0];
    if (!b) throw notFound("Job not found.");
    if (Number(b.provider_id) !== providerId) throw forbidden();
    const id = await documentRepo.add({ bookingId, kind: kind || "report", url, uploadedBy: providerId });
    await audit(providerId, "job.document", "booking", bookingId, { kind });
    return { id, kind: kind || "report", url };
  },

  /** List the deliverables uploaded against a job (provider-owned). */
  async listDocuments(providerId: number, bookingId: number) {
    const b = (await bookingRepo.byId(bookingId))[0];
    if (!b) throw notFound("Job not found.");
    if (Number(b.provider_id) !== providerId) throw forbidden();
    return await documentRepo.byBooking(bookingId);
  },
};

/** Notify qualified providers (by category) that a new job is available to accept. */
export async function notifyQualifiedProviders(categoryId: number): Promise<void> {
  const nameRows = await client.query(`SELECT name FROM service_categories WHERE id = ? LIMIT 1`, [categoryId]);
  const serviceName = nameRows[0]?.name ?? "borehole";
  const rows = await bookingRepo.providersForCategory(categoryId);
  await Promise.all(
    rows.map((r: { user_id: number }) =>
      // In-app notification + FCM push to the provider's phone.
      notifyUser(r.user_id, "New job available", `A new SMART Drill ${serviceName} job is available. Open the app to accept.`, { push: true })
    ),
  );
}

export default jobsService;
