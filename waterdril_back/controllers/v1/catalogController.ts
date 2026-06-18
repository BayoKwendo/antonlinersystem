// =============================================================================
//  v1 catalogue + nearby-providers controller.
// =============================================================================
import { type Context } from "../../deps.ts";
import { ok } from "../../utils/http.ts";
import { numericId, parseBody } from "../../utils/validate.ts";
import { categoryCreateSchema, categoryUpdateSchema, nearbySchema } from "../../validators/schemas.ts";
import catalogRepo from "../../repositories/catalogRepo.ts";
import { currentUser } from "../../middlewares/auth.ts";
import { audit } from "../../services/audit.ts";

const DEFAULT_RADIUS_KM = 50;

const catalogController = {
  listCategories: async (ctx: Context) => {
    // Portal/admin sees all; public clients get active only.
    const all = ctx.request.url.searchParams.get("all") === "1";
    ok(ctx, await catalogRepo.listCategories(!all));
  },

  createCategory: async (ctx: Context) => {
    const me = currentUser(ctx);
    const v = await parseBody(ctx, categoryCreateSchema);
    await catalogRepo.createCategory(v);
    await audit(me.userId, "category.create", "service_category", v.key, v);
    ok(ctx, null, "Category created");
  },

  updateCategory: async (ctx: Context) => {
    const me = currentUser(ctx);
    const id = numericId(ctx);
    const v = await parseBody(ctx, categoryUpdateSchema);
    await catalogRepo.updateCategory(id, v);
    await audit(me.userId, "category.update", "service_category", id, v);
    ok(ctx, null, "Category updated");
  },

  nearby: async (ctx: Context) => {
    const { category, lat, lng, radius_km } = await parseBody(ctx, nearbySchema);
    const providers = await catalogRepo.nearbyProviders({
      categoryKey: category,
      lat,
      lng,
      radiusKm: radius_km ?? DEFAULT_RADIUS_KM,
    });
    ok(ctx, providers);
  },
};

export default catalogController;
