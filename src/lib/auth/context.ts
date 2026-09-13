/**
 * Auth context object and its value type. Kept in a component-free module so the
 * provider file can satisfy react-refresh's "only export components" rule.
 */

import { createContext } from "react";
import type { CurrentUser } from "@/lib/api";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  /** `loading` until the initial refresh attempt resolves. */
  status: AuthStatus;
  /** The signed-in principal, or null. */
  user: CurrentUser | null;
  /** True while `status === "authenticated"`. */
  isAuthenticated: boolean;
  /** Sign in with username/email + password. Resolves to the user on success. */
  login: (identifier: string, password: string) => Promise<CurrentUser>;
  /** Revoke the current session and clear in-memory state. */
  logout: () => Promise<void>;
  /**
   * Change password (also satisfies the forced temporary-password change).
   *
   * SESSION-INVALIDATING: on success the backend revokes every session and the
   * local auth state is cleared, so the user must sign in again. Resolves to the
   * backend's confirmation message; the caller should route to `/login`.
   */
  changePassword: (currentPassword: string, newPassword: string) => Promise<string>;
  /** Re-fetch `GET /auth/me` (e.g. after a status change elsewhere). */
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
