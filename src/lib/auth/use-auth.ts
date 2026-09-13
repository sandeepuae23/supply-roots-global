/**
 * Auth hooks and role helpers.
 * Kept separate from the provider module so consumer imports stay stable.
 */

import { useContext } from "react";
import { AuthContext, type AuthContextValue } from "./context";
import type { CurrentUser, RoleName, UserType } from "@/lib/api";

/** Access the auth context. Throws if used outside {@link AuthProvider}. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}

/** Roles that grant access to the Admin portal. */
export const ADMIN_ROLES: readonly RoleName[] = ["SUPER_ADMIN", "ADMIN"] as const;

/** True if the user holds any of the given roles. */
export function hasAnyRole(user: CurrentUser | null, roles: readonly RoleName[]): boolean {
  if (!user) return false;
  return user.roles.some((r) => roles.includes(r));
}

/** True if the user holds the given permission. */
export function hasPermission(user: CurrentUser | null, permission: string): boolean {
  if (!user) return false;
  return user.permissions.includes(permission);
}

/** Map a user type to its portal home route. */
export function portalHomeForUserType(userType: UserType): string {
  switch (userType) {
    case "ADMIN":
      return "/admin/dashboard";
    case "BUYER":
      return "/buyer/dashboard";
    case "VENDOR":
      return "/vendor/dashboard";
  }
}
