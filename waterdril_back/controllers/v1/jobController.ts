// =============================================================================
//  v1 provider job endpoints (driver app): available jobs, my jobs, accept &
//  propose date, prompt payment, status updates, and deliverable upload.
// =============================================================================
import { type Context } from "../../deps.ts";
import { ok } from "../../utils/http.ts";
import { numericId, parseBody } from "../../utils/validate.ts";
import { currentUser } from "../../middlewares/auth.ts";
import { jobsService } from "../../services/jobs.ts";
import { documentSchema, jobAcceptSchema, jobStatusSchema } from "../../validators/schemas.ts";

const jobController = {
  available: async (ctx: Context) => {
    ok(ctx, await jobsService.listAvailable(currentUser(ctx).userId));
  },

  mine: async (ctx: Context) => {
    ok(ctx, await jobsService.myJobs(currentUser(ctx).userId));
  },

  accept: async (ctx: Context) => {
    const { scheduled_at, note } = await parseBody(ctx, jobAcceptSchema);
    ok(ctx, await jobsService.accept(currentUser(ctx).userId, numericId(ctx), scheduled_at, note), "Job accepted");
  },

  promptPayment: async (ctx: Context) => {
    ok(ctx, await jobsService.promptPayment(currentUser(ctx).userId, numericId(ctx)), "Payment requested");
  },

  status: async (ctx: Context) => {
    const { to, note } = await parseBody(ctx, jobStatusSchema);
    ok(ctx, await jobsService.setStatus(currentUser(ctx).userId, numericId(ctx), to, note), "Status updated");
  },

  addDocument: async (ctx: Context) => {
    const { kind, url } = await parseBody(ctx, documentSchema);
    ok(ctx, await jobsService.addReport(currentUser(ctx).userId, numericId(ctx), kind, url), "Document uploaded");
  },

  decline: async (ctx: Context) => {
    ok(ctx, await jobsService.decline(currentUser(ctx).userId, numericId(ctx)), "Request declined");
  },
};

export default jobController;
