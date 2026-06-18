import { Navigate, useLocation } from "react-router-dom";
import type { JSX } from "react";
import { useAuth } from "../store/auth";
import type { Role } from "../lib/types";

/** Require a logged-in user; otherwise bounce to /login. */
export function RequireAuth({ children }: { children: JSX.Element }) {
  const user = useAuth((s) => s.user);
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

/** Require one of the given roles; otherwise show a 403 redirect to dashboard. */
export function RequireRole({ roles, children }: { roles: Role[]; children: JSX.Element }) {
  const hasRole = useAuth((s) => s.hasRole);
  if (!hasRole(...roles)) return <Navigate to="/" replace />;
  return children;
}
