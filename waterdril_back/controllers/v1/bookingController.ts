// =============================================================================
//  v1 bookings controller.
// =============================================================================
import { type Context } from "../../deps.ts";
import { ok } from "../../utils/http.ts";
import { numericId, parseBody } from "../../utils/validate.ts";
import { currentUser } from "../../middlewares/auth.ts";
import bookings from "../../services/bookings.ts";
import payments from "../../services/payments.ts";
import {
  cancelSchema,
  createBookingSchema,
  payInitiateSchema,
  reviewSchema,
  transitionSchema,
} from "../../validators/schemas.ts";

const bookingController = {
  create: async (ctx: Context) => {
    const me = currentUser(ctx);
    const input = await parseBody(ctx, createBookingSchema);
    ok(ctx, await bookings.create(me.userId, input), "Booking created");
  },

  list: async (ctx: Context) => {
    const me = currentUser(ctx);
    const status = ctx.request.url.searchParams.get("status") || undefined;
    ok(ctx, await bookings.list(me, status));
  },

  detail: async (ctx: Context) => {
    const me = currentUser(ctx);
    ok(ctx, await bookings.detail(numericId(ctx), me));
  },

  transition: async (ctx: Context) => {
    const me = currentUser(ctx);
    const { status, note } = await parseBody(ctx, transitionSchema);
    ok(ctx, await bookings.transition(me, numericId(ctx), status, note), "Updated");
  },

  cancel: async (ctx: Context) => {
    const me = currentUser(ctx);
    const { reason } = await parseBody(ctx, cancelSchema);
    ok(ctx, await bookings.cancel(me, numericId(ctx), reason), "Cancelled");
  },

  review: async (ctx: Context) => {
    const me = currentUser(ctx);
    const { rating, comment } = await parseBody(ctx, reviewSchema);
    ok(ctx, await bookings.review(me.userId, numericId(ctx), rating, comment), "Thanks for the review");
  },

  pay: async (ctx: Context) => {
    const me = currentUser(ctx);
    const { phone } = await parseBody(ctx, payInitiateSchema);
    ok(ctx, await payments.initiate(me, numericId(ctx), phone), "Payment prompt sent");
  },
};

export default bookingController;
