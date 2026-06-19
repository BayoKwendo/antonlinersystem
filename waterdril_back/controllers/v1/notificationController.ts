// =============================================================================
//  v1 in-app notifications controller (any authenticated user; own inbox only).
// =============================================================================
import { type Context } from "../../deps.ts";
import { ok } from "../../utils/http.ts";
import { numericId } from "../../utils/validate.ts";
import { currentUser } from "../../middlewares/auth.ts";
import notificationRepo from "../../repositories/notificationRepo.ts";

const notificationController = {
  list: async (ctx: Context) => {
    const { userId } = currentUser(ctx);
    const url = ctx.request.url.searchParams;
    const limit = url.get("limit") ? Number(url.get("limit")) : undefined;
    const offset = url.get("offset") ? Number(url.get("offset")) : undefined;
    ok(ctx, await notificationRepo.list(userId, limit, offset));
  },

  read: async (ctx: Context) => {
    const { userId } = currentUser(ctx);
    await notificationRepo.markRead(numericId(ctx), userId);
    ok(ctx);
  },

  readAll: async (ctx: Context) => {
    const { userId } = currentUser(ctx);
    await notificationRepo.markAllRead(userId);
    ok(ctx);
  },
};

export default notificationController;
