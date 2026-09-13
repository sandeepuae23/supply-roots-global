/**
 * Authentication / session provider.
 *
 * Design (roadmap §6):
 *  - The access token lives ONLY in memory (a module variable + React state),
 *    never in localStorage/sessionStorage.
 *  - The refresh token is an HttpOnly cookie owned by the backend; this code
 *    never reads it. On a fresh page load we call `POST /auth/refresh` (which
 *    relies on that cookie) to re-establish an access token.
 *  - Concurrent refreshes are de-duplicated so a burst of 401s triggers one
 *    network refresh.
 *  - `must_change_password` is surfaced so route guards can force the
 *    temporary-password change screen.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  authApi,
  configureAuthBridge,
  isApiError,
  type AuthTokenResponse,
  type CurrentUser,
} from "@/lib/api";
import { AuthContext, type AuthContextValue, type AuthStatus } from "./context";

// In-memory access token. Module scope so the API client bridge can read it
// synchronously without going through React state.
let inMemoryAccessToken: string | null = null;

function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<CurrentUser | null>(null);

  // De-duplicate concurrent refresh calls.
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  const applyAuth = useCallback((res: AuthTokenResponse) => {
    inMemoryAccessToken = res.access_token;
    setUser(res.user);
    setStatus("authenticated");
  }, []);

  const clearAuth = useCallback(() => {
    inMemoryAccessToken = null;
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  // Refresh routine shared with the API client. Returns the new token or null.
  const runRefresh = useCallback(async (): Promise<string | null> => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    const promise = (async () => {
      try {
        const res = await authApi.refresh();
        inMemoryAccessToken = res.access_token;
        setUser(res.user);
        setStatus("authenticated");
        return res.access_token;
      } catch {
        // A failed refresh means no valid session; treat as signed out.
        inMemoryAccessToken = null;
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = promise;
    return promise;
  }, []);

  // Wire the API client to this provider's token + refresh routine.
  useEffect(() => {
    configureAuthBridge({
      getAccessToken,
      refreshAccessToken: runRefresh,
      onAuthExpired: () => {
        inMemoryAccessToken = null;
        setUser(null);
        setStatus("unauthenticated");
      },
    });
    return () => configureAuthBridge(null);
  }, [runRefresh]);

  // Bootstrap: attempt to re-establish a session from the refresh cookie.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await runRefresh();
      if (cancelled) return;
      if (!token) setStatus("unauthenticated");
    })();
    return () => {
      cancelled = true;
    };
  }, [runRefresh]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const res = await authApi.login({ identifier, password });
      applyAuth(res);
      return res.user;
    },
    [applyAuth],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // Even if the server call fails, drop local state; only swallow API errors.
      if (!isApiError(err)) throw err;
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      // Backend revokes ALL sessions and clears the refresh cookie on success,
      // returning only a message. There is no token to apply — we drop local
      // auth state so the app forces a fresh sign-in with the new password.
      const res = await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      clearAuth();
      return res.message;
    },
    [clearAuth],
  );

  const refreshUser = useCallback(async () => {
    const me = await authApi.me();
    setUser(me);
    setStatus("authenticated");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAuthenticated: status === "authenticated",
      login,
      logout,
      changePassword,
      refreshUser,
    }),
    [status, user, login, logout, changePassword, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
