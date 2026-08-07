// =============================================================================
//  In-memory fixed-window rate limiter for public endpoints (OTP, request
//  create, order lookup, provider signup, login). Keyed by client IP + bucket.
//  Single-process; for multi-instance deployments move this to Redis.
// =============================================================================
import { type Context } from "../deps.ts";

type Next = () => Promise<unknown>;

interface Window { count: number; reset: number }
const buckets = new Map<string, Window>();

/** windowMs = window length, max = allowed hits per window, name = bucket. */
export function rateLimit({ windowMs, max, name }: { windowMs: number; max: number; name: string }) {
  return async (ctx: Context, next: Next) => {
    const now = Date.now();

    // Opportunistic prune so the map can't grow unbounded.
    if (buckets.size > 5000) {
      for (const [k, w] of buckets) if (w.reset <= now) buckets.delete(k);
    }

    let ip = "unknown";
    try { ip = ctx.request.ip || "unknown"; } catch { /* ignore */ }
    const key = `${name}:${ip}`;

    let w = buckets.get(key);
    if (!w || w.reset <= now) { w = { count: 0, reset: now + windowMs }; buckets.set(key, w); }
    w.count++;

    if (w.count > max) {
      const retry = Math.ceil((w.reset - now) / 1000);
      ctx.response.status = 429;
      ctx.response.headers.set("Retry-After", String(retry));
      ctx.response.body = { success: false, status_code: 429, message: "Too many requests. Please try again shortly." };
      return;
    }
    await next();
  };
}
