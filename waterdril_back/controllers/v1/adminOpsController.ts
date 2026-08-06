// =============================================================================
//  v1 staff controller for the SMART Drill journey: request queue, invoicing,
//  quotes, provider assignment (escrow), deliverables, and payout release.
// =============================================================================
import { type Context } from "../../deps.ts";
import { ok } from "../../utils/http.ts";
import { parseBody, numericId } from "../../utils/validate.ts";
import { currentUser } from "../../middlewares/auth.ts";
import { adminOps } from "../../services/adminOps.ts";
import { providerService } from "../../services/providerService.ts";
import {
  assignSchema, invoiceSchema, quoteSchema, documentSchema, markPaidSchema, providerVerifySchema, providerRatingSchema,
} from "../../validators/schemas.ts";

const q = (ctx: Context, name: string) => ctx.request.url.searchParams.get(name) || undefined;

const adminOpsController = {
  listRequests: async (ctx: Context) => ok(ctx, await adminOps.listRequests(q(ctx, "status"))),
  listInvoices: async (ctx: Context) => ok(ctx, await adminOps.listInvoices(q(ctx, "status"))),
  listPayouts: async (ctx: Context) => ok(ctx, await adminOps.listPayouts(q(ctx, "status"))),

  payouts: async (ctx: Context) => ok(ctx, await adminOps.payoutsForBooking(numericId(ctx))),
  documents: async (ctx: Context) => ok(ctx, await adminOps.documents(numericId(ctx))),

  issueInvoice: async (ctx: Context) => {
    const { amount } = await parseBody(ctx, invoiceSchema);
    ok(ctx, await adminOps.issueInvoice(numericId(ctx), amount, currentUser(ctx).userId), "Invoice issued");
  },

  setQuote: async (ctx: Context) => {
    const { amount } = await parseBody(ctx, quoteSchema);
    ok(ctx, await adminOps.setQuote(numericId(ctx), amount, currentUser(ctx).userId), "Quote set");
  },

  confirmPayment: async (ctx: Context) => {
    ok(ctx, await adminOps.confirmPayment(numericId(ctx), currentUser(ctx).userId), "Payment confirmed");
  },

  assign: async (ctx: Context) => {
    const { provider_id } = await parseBody(ctx, assignSchema);
    ok(ctx, await adminOps.assign(numericId(ctx), provider_id, currentUser(ctx).userId), "Provider assigned");
  },

  addDocument: async (ctx: Context) => {
    const { kind, url } = await parseBody(ctx, documentSchema);
    ok(ctx, await adminOps.addDocument(numericId(ctx), kind, url, currentUser(ctx).userId), "Document added");
  },

  markPayoutPaid: async (ctx: Context) => {
    const { ref } = await parseBody(ctx, markPaidSchema);
    ok(ctx, await adminOps.markPayoutPaid(numericId(ctx), ref ?? null, currentUser(ctx).userId), "Payout marked paid");
  },

  // Ops QA: verify a completed job → release the final payout.
  verifyCompletion: async (ctx: Context) => {
    ok(ctx, await adminOps.verifyCompletion(numericId(ctx), currentUser(ctx).userId), "Completion verified");
  },

  // Ops: assign a provider performance rating for a completed job.
  rateProvider: async (ctx: Context) => {
    const { rating, feedback, timeliness, quality, note } = await parseBody(ctx, providerRatingSchema);
    ok(ctx, await adminOps.rateProvider(numericId(ctx), { rating, feedback, timeliness, quality, note }, currentUser(ctx).userId), "Rating saved");
  },

  // Ops: approve/reject a provider application (mints per-service codes on approval).
  verifyProvider: async (ctx: Context) => {
    const { approve, note } = await parseBody(ctx, providerVerifySchema);
    ok(ctx, await providerService.verify(numericId(ctx), approve, note, currentUser(ctx).userId), "Provider verification updated");
  },
};

export default adminOpsController;
