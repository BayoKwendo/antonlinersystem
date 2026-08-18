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
import overviewRepo from "../../repositories/overviewRepo.ts";
import authService from "../../services/authService.ts";
import accountRepo from "../../repositories/accountRepo.ts";
import { audit } from "../../services/audit.ts";
import { sendSms } from "../../services/smsService.ts";
import { normalizePhone } from "../../utils/phone.ts";
import { conflict, notFound } from "../../utils/errors.ts";
import {
  complaintUpdateSchema,
  createCustomerSchema,
  createUserSchema,
  editProviderSchema,
  onboardProviderSchema,
  reviewHiddenSchema,
  sendSmsSchema,
  updateCustomerSchema,
  updateUserSchema,
} from "../../validators/schemas.ts";

function page(ctx: Context) {
  const url = ctx.request.url.searchParams;
  return {
    limit: url.get("limit") ? Number(url.get("limit")) : undefined,
    offset: url.get("offset") ? Number(url.get("offset")) : undefined,
  };
}

/** Search term, with any leading "+" stripped so a "+254…" query still matches
 *  the "+"-free stored phone (names never contain "+", so this is safe). */
function searchQ(ctx: Context) {
  const s = (ctx.request.url.searchParams.get("q") ?? "").replace(/\+/g, "").trim();
  return s || undefined;
}

const adminController = {
  stats: async (ctx: Context) => ok(ctx, await adminRepo.stats()),
  analytics: async (ctx: Context) => ok(ctx, await adminRepo.analytics()),
  overview: async (ctx: Context) => {
    const url = ctx.request.url.searchParams;
    const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
    const from = url.get("from");
    const to = url.get("to");
    ok(ctx, await overviewRepo.overview({
      from: isDate(from) ? from : undefined,
      to: isDate(to) ? to : (isDate(from) ? from : undefined),
    }));
  },

  // Global top-bar search across requests, providers and customers.
  search: async (ctx: Context) => {
    const q = searchQ(ctx);
    if (!q || q.length < 2) return ok(ctx, { requests: [], providers: [], customers: [] });
    ok(ctx, await adminRepo.search(q));
  },

  // Provider verification queue + review detail (per provider account / user_id).
  providerApplications: async (ctx: Context) =>
    ok(ctx, await adminRepo.listProviderApplications({ status: ctx.request.url.searchParams.get("status") ?? undefined, ...page(ctx) })),
  providerApplication: async (ctx: Context) => {
    const app = await adminRepo.providerApplication(numericId(ctx));
    if (!app) throw notFound("Provider application not found");
    ok(ctx, app);
  },

  listProviders: async (ctx: Context) => {
    const me = currentUser(ctx);
    const onlyOwner = me.roles.includes("owner") &&
      !me.roles.some((r) => ["admin", "assistance"].includes(r));
    const url = ctx.request.url.searchParams;
    ok(ctx, await adminRepo.listProviders({
      ownerId: onlyOwner ? me.userId : undefined,
      category: url.get("category") ?? undefined,
      q: searchQ(ctx),
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
    // A phone may offer multiple categories; only reject a duplicate in the SAME category.
    const existing = await accountRepo.findByPhone(phone);
    if (existing && await adminRepo.providerHasCategory(existing.id, v.category)) {
      throw conflict("This number already offers that service category");
    }
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
    const v = await parseBody(ctx, editProviderSchema);
    await adminRepo.editProvider(id, {
      ...v,
      phone: v.phone ? normalizePhone(v.phone) : undefined,
    });
    await audit(me.userId, "provider.update", "user", id, v);
    ok(ctx, null, "Updated");
  },

  providerLocations: async (ctx: Context) => ok(ctx, await adminRepo.providerLocations()),

  // --- staff / owners / agents ---
  listUsers: async (ctx: Context) => {
    const url = ctx.request.url.searchParams;
    ok(ctx, await adminRepo.listUsers({ role: url.get("role") ?? undefined, q: searchQ(ctx), ...page(ctx) }));
  },

  createUser: async (ctx: Context) => {
    const me = currentUser(ctx);
    const v = await parseBody(ctx, createUserSchema);
    const phone = normalizePhone(v.phone);
    if (await accountRepo.findByPhone(phone)) throw conflict("Phone already registered");
    const id = await adminRepo.createUser({
      phone,
      displayName: v.display_name,
      passwordHash: await authService.hashPassword(v.password),
      roleKey: v.role,
      email: v.email ?? null,
    });
    await audit(me.userId, "user.create", "user", id, { role: v.role });
    ok(ctx, { id }, "User created");
  },

  updateUser: async (ctx: Context) => {
    const me = currentUser(ctx);
    const id = numericId(ctx);
    const v = await parseBody(ctx, updateUserSchema);
    await adminRepo.updateUser(id, {
      displayName: v.display_name,
      email: v.email === "" ? null : v.email,
      suspended: v.suspended,
      roleKey: v.role,
      passwordHash: v.password ? await authService.hashPassword(v.password) : undefined,
    });
    await audit(me.userId, "user.update", "user", id, { ...v, password: v.password ? "***" : undefined });
    ok(ctx, null, "Updated");
  },

  // --- customers ---
  createCustomer: async (ctx: Context) => {
    const me = currentUser(ctx);
    const v = await parseBody(ctx, createCustomerSchema);
    const phone = normalizePhone(v.phone);
    if (await accountRepo.findByPhone(phone)) throw conflict("Phone already registered");
    const id = await adminRepo.createCustomer({ phone, displayName: v.display_name, idNumber: v.id_number ?? null });
    await audit(me.userId, "customer.create", "user", id);
    ok(ctx, { id }, "Customer created");
  },

  updateCustomer: async (ctx: Context) => {
    const me = currentUser(ctx);
    const id = numericId(ctx);
    const v = await parseBody(ctx, updateCustomerSchema);
    await adminRepo.updateCustomer(id, { displayName: v.display_name, idNumber: v.id_number, suspended: v.suspended });
    await audit(me.userId, "customer.update", "user", id, v);
    ok(ctx, null, "Updated");
  },

  // --- bookings (date range) ---
  listBookings: async (ctx: Context) => {
    const url = ctx.request.url.searchParams;
    ok(ctx, await adminRepo.bookingsRange({
      from: url.get("from") ?? undefined,
      to: url.get("to") ?? undefined,
      status: url.get("status") ?? undefined,
      ...page(ctx),
    }));
  },

  // --- SMS console ---
  sendSms: async (ctx: Context) => {
    const me = currentUser(ctx);
    const v = await parseBody(ctx, sendSmsSchema);
    const sent = await sendSms({ to: normalizePhone(v.phone), text: v.text, asciiOnly: true });
    await audit(me.userId, "sms.send", "phone", normalizePhone(v.phone));
    ok(ctx, { sent }, sent ? "SMS sent" : "SMS gateway error");
  },

  smsLogs: async (ctx: Context) => {
    ok(ctx, await adminRepo.listSmsLogs({ q: searchQ(ctx), ...page(ctx) }));
  },

  listCustomers: async (ctx: Context) => {
    ok(ctx, await adminRepo.listCustomers({ q: searchQ(ctx), ...page(ctx) }));
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
