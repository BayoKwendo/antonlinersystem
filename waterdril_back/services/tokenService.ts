// =============================================================================
//  JWT signing / verification helpers (built on `jose`, the modern standard).
// =============================================================================
import { SignJWT, jwtVerify } from "../deps.ts";
import { AUTH } from "../config/config.ts";

const secret = new TextEncoder().encode(AUTH.JWT_SECRET);

/** Sign a JWT (HS512) with the standard expiry claim. */
export async function signToken(claims: Record<string, unknown>): Promise<string> {
  return await new SignJWT(claims)
    .setProtectedHeader({ alg: "HS512", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${AUTH.JWT_TTL_SECONDS}s`)
    .sign(secret);
}

/** Verify a JWT and return its payload; throws on invalid/expired tokens. */
export async function verifyToken(token: string): Promise<Record<string, unknown>> {
  const { payload } = await jwtVerify(token, secret, { algorithms: ["HS512"] });
  return payload;
}

/** The decoded shape of an access token. */
export interface AccessClaims {
  sub: number; // user id
  roles: string[];
  type: "access";
}

/** Sign a short-lived access token carrying the user's id + roles. */
export function signAccessToken(userId: number, roles: string[]): Promise<string> {
  return signToken({ sub: userId, roles, type: "access" });
}

/** Verify an access token and return typed claims; throws if not an access token. */
export async function verifyAccessToken(token: string): Promise<AccessClaims> {
  const payload = await verifyToken(token);
  if (payload.type !== "access") throw new Error("Not an access token");
  return {
    sub: Number(payload.sub),
    roles: Array.isArray(payload.roles) ? payload.roles as string[] : [],
    type: "access",
  };
}
