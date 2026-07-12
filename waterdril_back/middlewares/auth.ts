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
import accountRepo from "../repositories/accountRepo.ts";

export interface AuthState {
  userId: number;
  roles: string[];
}

type Next = () => Promise<unknown>;

export async function requireAuth(ctx: Context, next: Next) {
  const header = ctx.request.headers.get("Authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw unauthorized("Access token missing");

  let userId: number;
  try {
    const claims = await verifyAccessToken(token);
    userId = claims.sub;
  } catch {
    throw unauthorized("Invalid or expired token");
  }
  // Resolve roles fresh from the DB (the token's roles claim is only a snapshot
  // at login). This way role grants/revocations take effect on the next request
  // without forcing the user to re-login.
  const roles = await accountRepo.rolesOf(userId);
  (ctx.state as { auth?: AuthState }).auth = { userId, roles };
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
