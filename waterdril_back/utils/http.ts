// =============================================================================
//  Small HTTP helpers shared by controllers.
// =============================================================================
import { type Context } from "../deps.ts";

// Request bodies are dynamic JSON from web/mobile clients; values are read
// defensively in the controllers, so a permissive record type is appropriate.
// deno-lint-ignore no-explicit-any
export type JsonBody = Record<string, any>;

/** Read and parse a JSON request body. */
export async function readJson<T = JsonBody>(ctx: Context): Promise<T> {
  return await ctx.request.body.json() as T;
}

/** Standard success envelope used across the API. */
export function ok(ctx: Context, data: unknown = null, message = "Success") {
  ctx.response.status = 200;
  ctx.response.body = { status: true, status_code: 200, success: true, message, data };
}

/** Standard failure envelope. */
export function fail(ctx: Context, message: string, status = 400) {
  ctx.response.status = status;
  ctx.response.body = { status: false, status_code: status, success: false, message };
}
