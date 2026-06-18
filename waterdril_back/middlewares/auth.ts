// =============================================================================
//  JWT authentication + RBAC guards.
//
//  `requireAuth`        — verifies the Bearer access token, attaches
//                         { userId, roles } to ctx.state, else 401.
//  `requireRole(...)`   — must run after requireAuth; 403 unless the user has
//                         at least one of the listed roles.
//
//  Apply per-router/route. Public routes (auth, health, M-Pesa callbacks) skip
//  these guards.
// =============================================================================
import { type Context } from "../deps.ts";
import { verifyAccessToken } from "../services/tokenService.ts";
import { forbidden, unauthorized } from "../utils/errors.ts";

export interface AuthState {
  userId: number;
  roles: string[];
}

type Next = () => Promise<unknown>;

export async function requireAuth(ctx: Context, next: Next) {
  const header = ctx.request.headers.get("Authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw unauthorized("Access token missing");

  try {
    const claims = await verifyAccessToken(token);
    (ctx.state as { auth?: AuthState }).auth = { userId: claims.sub, roles: claims.roles };
  } catch {
    throw unauthorized("Invalid or expired token");
  }
  await next();
}

/** Guard requiring at least one of the given roles. Use after requireAuth. */
export function requireRole(...allowed: string[]) {
  return async (ctx: Context, next: Next) => {
    const auth = (ctx.state as { auth?: AuthState }).auth;
    if (!auth) throw unauthorized();
    if (!auth.roles.some((r) => allowed.includes(r))) throw forbidden();
    await next();
  };
}

/** Convenience accessor for the authenticated user in controllers. */
export function currentUser(ctx: Context): AuthState {
  const auth = (ctx.state as { auth?: AuthState }).auth;
  if (!auth) throw unauthorized();
  return auth;
}
