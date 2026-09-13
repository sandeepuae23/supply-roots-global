/**
 * Client-side route guard for protected portals.
 *
 * IMPORTANT: this is a UX convenience only. The backend enforces real
 * authorization (roadmap §7); a guard here just avoids rendering a portal the
 * user can't use and routes them somewhere sensible.
 *
 * Decision order:
 *  1. loading            → full-screen loading state
 *  2. unauthenticated    → redirect to /login (remembering where we were)
 *  3. must change pw     → redirect to /change-temporary-password
 *  4. non-active status  → redirect to the matching /account/* screen
 *  5. wrong portal/role  → accessible "forbidden" state
 *  6. otherwise          → render children
 */

import { useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { RoleName, UserType } from "@/lib/api";
import { useAuth, hasAnyRole, portalHomeForUserType } from "@/lib/auth/use-auth";
import { routeForStatus } from "@/lib/auth/account-status";
import { StateForbidden, StateLoading } from "@/components/portal/data-states";

export function RequireAuth({
  userType,
  requiredRoles,
  children,
}: {
  /** Portal this subtree belongs to. */
  userType: UserType;
  /** Optional additional role requirement (e.g. ADMIN roles). */
  requiredRoles?: readonly RoleName[];
  children: ReactNode;
}) {
  const { status, user } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const unauthenticated = status === "unauthenticated";
  const mustChangePassword = status === "authenticated" && !!user?.must_change_password;
  const blockedStatusRoute =
    status === "authenticated" && user ? routeForStatus(user.status) : null;

  useEffect(() => {
    if (unauthenticated) {
      navigate({ to: "/login", search: { redirect: pathname }, replace: true });
    }
  }, [unauthenticated, navigate, pathname]);

  useEffect(() => {
    if (mustChangePassword) {
      navigate({ to: "/change-temporary-password", replace: true });
    }
  }, [mustChangePassword, navigate]);

  useEffect(() => {
    if (blockedStatusRoute) {
      navigate({ to: blockedStatusRoute, replace: true });
    }
  }, [blockedStatusRoute, navigate]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <StateLoading label="Checking your session…" className="border-0 bg-transparent" />
      </div>
    );
  }

  // While a redirect effect is pending, avoid flashing protected content.
  if (unauthenticated || mustChangePassword || blockedStatusRoute || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <StateLoading label="Redirecting…" className="border-0 bg-transparent" />
      </div>
    );
  }

  const wrongPortal = user.user_type !== userType;
  const missingRole = requiredRoles ? !hasAnyRole(user, requiredRoles) : false;

  if (wrongPortal || missingRole) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <StateForbidden
          action={
            <Link
              to={portalHomeForUserType(user.user_type)}
              className="btn-primary px-6! py-3! text-xs!"
            >
              Go to your portal
            </Link>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
}
