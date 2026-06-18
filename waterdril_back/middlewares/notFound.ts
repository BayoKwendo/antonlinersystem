// =============================================================================
//  Fallback 404 handler — runs when no route matched.
// =============================================================================
import { type Context } from "../deps.ts";

export default function notFound(ctx: Context) {
  ctx.response.status = 404;
  ctx.response.body = {
    success: false,
    message: "404 - Not found.",
  };
}
