// =============================================================================
//  v1 public service-request controller — frictionless create + read-only track.
// =============================================================================
import { type Context } from "../../deps.ts";
import { ok } from "../../utils/http.ts";
import { parseBody, param } from "../../utils/validate.ts";
import { createRequestSchema, complaintSchema, payInitiateSchema, lookupRequestSchema, lookupVerifyRequestSchema } from "../../validators/schemas.ts";
import { requestsService } from "../../services/requests.ts";
import { payments } from "../../services/payments.ts";

const requestController = {
  create: async (ctx: Context) => {
    const input = await parseBody(ctx, createRequestSchema);
    ok(ctx, await requestsService.create(input), "Request received");
  },

  track: async (ctx: Context) => {
    ok(ctx, await requestsService.track(param(ctx, "token")), "OK");
  },

  lookup: async (ctx: Context) => {
    const { request_no, phone } = await parseBody(ctx, lookupRequestSchema);
    ok(ctx, await requestsService.lookup(request_no, phone), "Verification code sent");
  },

  lookupVerify: async (ctx: Context) => {
    const { request_no, phone, otp_code } = await parseBody(ctx, lookupVerifyRequestSchema);
    ok(ctx, await requestsService.lookupVerify(request_no, phone, otp_code), "OK");
  },

  // Token-authorized customer actions (the tracking token is the credential).
  pay: async (ctx: Context) => {
    const { phone } = await parseBody(ctx, payInitiateSchema);
    ok(ctx, await payments.initiateRequestPayment(param(ctx, "token"), phone), "Payment prompt sent");
  },

  confirmArrival: async (ctx: Context) => {
    ok(ctx, await requestsService.confirmArrival(param(ctx, "token")), "Arrival confirmed");
  },

  confirmCompletion: async (ctx: Context) => {
    ok(ctx, await requestsService.confirmCompletion(param(ctx, "token")), "Completion confirmed");
  },

  complaint: async (ctx: Context) => {
    const { message } = await parseBody(ctx, complaintSchema);
    ok(ctx, await requestsService.complaint(param(ctx, "token"), message), "Complaint received");
  },
};

export default requestController;
