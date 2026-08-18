// =============================================================================
//  v1 provider self-service controller (online/offline, live location, me).
// =============================================================================
import { type Context } from "../../deps.ts";
import { ok } from "../../utils/http.ts";
import { parseBody } from "../../utils/validate.ts";
import { currentUser } from "../../middlewares/auth.ts";
import providerRepo from "../../repositories/providerRepo.ts";
import { providerService } from "../../services/providerService.ts";
import ratingKpi from "../../services/ratingKpi.ts";
import { providerLocationSchema, providerOnlineSchema, providerSignupSchema } from "../../validators/schemas.ts";

const providerController = {
  // Public self-signup (Android). Returns auth tokens (logs the provider in).
  signup: async (ctx: Context) => {
    const input = await parseBody(ctx, providerSignupSchema);
    ok(ctx, await providerService.signup(input), "Account created — pending verification");
  },

  me: async (ctx: Context) => {
    const me = currentUser(ctx);
    ok(ctx, await providerRepo.profile(me.userId));
  },

  dashboard: async (ctx: Context) => {
    const me = currentUser(ctx);
    ok(ctx, await providerService.dashboard(me.userId));
  },

  earnings: async (ctx: Context) => {
    const me = currentUser(ctx);
    ok(ctx, await providerService.earnings(me.userId));
  },

  setOnline: async (ctx: Context) => {
    const me = currentUser(ctx);
    const { online } = await parseBody(ctx, providerOnlineSchema);
    await providerRepo.setOnline(me.userId, online);
    ok(ctx, { online }, online ? "You are online" : "You are offline");
  },

  updateLocation: async (ctx: Context) => {
    const me = currentUser(ctx);
    const { lat, lng } = await parseBody(ctx, providerLocationSchema);
    await providerRepo.updateLocation(me.userId, lat, lng);
    ok(ctx);
  },

  /** The provider's own KPI rating breakdown (transparent + auditable). */
  kpi: async (ctx: Context) => {
    ok(ctx, await ratingKpi.forProvider(currentUser(ctx).userId));
  },
};

export default providerController;
