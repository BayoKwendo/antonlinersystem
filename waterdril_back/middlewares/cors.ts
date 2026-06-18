// =============================================================================
//  CORS middleware — allowlist driven by SECURITY.CORS_ORIGINS.
//  Only browser clients (the portal) are subject to CORS; native apps are not.
//  The request Origin is echoed back only when it is on the allowlist, so the
//  API no longer advertises "*".
// =============================================================================
import { type Context } from "../deps.ts";
import { SECURITY } from "../config/config.ts";

export default async function cors(ctx: Context, next: () => Promise<unknown>) {
  const origin = ctx.request.headers.get("Origin");
  if (origin && SECURITY.CORS_ORIGINS.includes(origin)) {
    ctx.response.headers.set("Access-Control-Allow-Origin", origin);
    ctx.response.headers.set("Vary", "Origin");
    ctx.response.headers.set("Access-Control-Allow-Credentials", "true");
    ctx.response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    ctx.response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    ctx.response.headers.set("Access-Control-Max-Age", "86400");
  }

  if (ctx.request.method === "OPTIONS") {
    ctx.response.status = 204;
    return;
  }
  await next();
}
