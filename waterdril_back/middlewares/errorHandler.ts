// =============================================================================
//  Top-level error handler. Wrap the whole app so any thrown error becomes a
//  consistent JSON response instead of crashing the request.
// =============================================================================
import { type Context, isHttpError, red } from "../deps.ts";
import { AppError } from "../utils/errors.ts";

export default async function errorHandler(
  ctx: Context,
  next: () => Promise<unknown>,
) {
  try {
    await next();
  } catch (err) {
    let status = 500;
    let details: unknown;
    if (err instanceof AppError) {
      status = err.status;
      details = err.details;
    } else if (isHttpError(err)) {
      status = err.status;
    }
    const message = err instanceof Error ? err.message : String(err);
    // Don't leak internals on unexpected 500s.
    const clientMessage = status === 500 ? "Internal server error" : message;
    console.error(red(`[error] ${ctx.request.method} ${ctx.request.url.pathname}: ${message}`));
    ctx.response.status = status;
    ctx.response.body = { success: false, message: clientMessage, ...(details ? { details } : {}) };
  }
}
