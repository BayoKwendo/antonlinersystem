// =============================================================================
//  Request logging + response-time header.
// =============================================================================
import { type Context, green, cyan, yellow } from "../deps.ts";

const X_RESPONSE_TIME = "X-Response-Time";

/** Stamp every response with how long it took to produce. */
export async function responseTime(ctx: Context, next: () => Promise<unknown>) {
  const start = performance.now();
  await next();
  const ms = (performance.now() - start).toFixed(1);
  ctx.response.headers.set(X_RESPONSE_TIME, `${ms}ms`);
}

/** Log method, path and timing for every request. */
export async function logger(ctx: Context, next: () => Promise<unknown>) {
  await next();
  const time = ctx.response.headers.get(X_RESPONSE_TIME) ?? "-";
  const { method } = ctx.request;
  const path = ctx.request.url.pathname;
  console.log(`${green(method)} ${cyan(path)} ${yellow(time)}`);
}
