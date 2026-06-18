// =============================================================================
//  v1 portal/admin controller. Owners are scoped to their own providers; admin
//  and assistance/finance see everything (route-level RBAC enforces access).
//  List endpoints are paginated via ?limit & ?offset and return { items, total }.
// =============================================================================
import { type Context } from "../../deps.ts";
import { ok } from "../../utils/http.ts";
import { numericId, parseBody } from "../../utils/validate.ts";
import { currentUser } from "../../middlewares/auth.ts";
import adminRepo from "../../repositories/adminRepo.ts";
import authService from "../../services/authService.ts";
import accountRepo from "../../repositories/accountRepo.ts";
import { audit } from "../../services/audit.ts";
import { normalizePhone } from "../../utils/phone.ts";
import { conflict, notFound } from "../../utils/errors.ts";
import {
  complaintUpdateSchema,
  onboardProviderSchema,
  reviewHiddenSchema,
  updateProviderSchema,
} from "../../validators/schemas.ts";

function page(ctx: Context) {
  const url = ctx.request.url.searchParams;
  return {
    limit: url.get("limit") ? Number(url.get("limit")) : undefined,
    offset: url.get("offset") ? Number(url.get("offset")) : undefined,
  };
}

const adminController = {
  stats: async (ctx: Context) => ok(ctx, await adminRepo.stats()),
  analytics: async (ctx: Context) => ok(ctx, await adminRepo.analytics()),

  listProviders: async (ctx: Context) => {
    const me = currentUser(ctx);
    const onlyOwner = me.roles.includes("owner") &&
      !me.roles.some((r) => ["admin", "assistance"].includes(r));
    const url = ctx.request.url.searchParams;
    ok(ctx, await adminRepo.listProviders({
      ownerId: onlyOwner ? me.userId : undefined,
      category: url.get("category") ?? undefined,
      q: url.get("q") ?? undefined,
      ...page(ctx),
    }));
  },

  providerDetail: async (ctx: Context) => {
    const detail = await adminRepo.providerDetail(numericId(ctx));
    if (!detail) throw notFound("Provider not found");
    ok(ctx, detail);
  },

  onboardProvider: async (ctx: Context) => {
    const me = currentUser(ctx);
    const v = await parseBody(ctx, onboardProviderSchema);
    const phone = normalizePhone(v.phone);
    if (await accountRepo.findByPhone(phone)) throw conflict("Phone already registered");
    const ownerId = me.roles.includes("owner") && !me.roles.includes("admin")
      ? me.userId
      : (v.owner_id ?? null);
    const id = await adminRepo.onboardProvider({
      phone,
      displayName: v.display_name,
      passwordHash: await authService.hashPassword(v.password),
      categoryKey: v.category,
      basePrice: v.base_price,
      ownerId,
      bio: v.bio ?? null,
    });
    await audit(me.userId, "provider.onboard", "user", id, { category: v.category });
    ok(ctx, { id }, "Provider onboarded");
  },

  updateProvider: async (ctx: Context) => {
    const me = currentUser(ctx);
    const id = numericId(ctx);
    const v = await parseBody(ctx, updateProviderSchema);
    await adminRepo.updateProvider(id, v);
    await audit(me.userId, "provider.update", "user", id, v);
    ok(ctx, null, "Updated");
  },

  listCustomers: async (ctx: Context) => {
    ok(ctx, await adminRepo.listCustomers({ q: ctx.request.url.searchParams.get("q") ?? undefined, ...page(ctx) }));
  },

  listPayments: async (ctx: Context) => {
    const url = ctx.request.url.searchParams;
    ok(ctx, await adminRepo.listPayments({
      from: url.get("from") ?? undefined,
      to: url.get("to") ?? undefined,
      ...page(ctx),
    }));
  },

  listComplaints: async (ctx: Context) => ok(ctx, await adminRepo.listComplaints(page(ctx))),

  updateComplaint: async (ctx: Context) => {
    const me = currentUser(ctx);
    const id = numericId(ctx);
    const v = await parseBody(ctx, complaintUpdateSchema);
    await adminRepo.updateComplaint(id, v);
    await audit(me.userId, "complaint.update", "complaint", id, v);
    ok(ctx, null, "Updated");
  },

  listReviews: async (ctx: Context) => ok(ctx, await adminRepo.listReviews(page(ctx))),

  setReviewHidden: async (ctx: Context) => {
    const me = currentUser(ctx);
    const id = numericId(ctx);
    const { hidden } = await parseBody(ctx, reviewHiddenSchema);
    await adminRepo.setReviewHidden(id, hidden);
    await audit(me.userId, "review.moderate", "review", id, { hidden });
    ok(ctx, null, "Updated");
  },

  listAudit: async (ctx: Context) => ok(ctx, await adminRepo.listAudit(page(ctx))),
};

export default adminController;
