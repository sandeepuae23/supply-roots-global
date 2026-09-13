/**
 * Authentication + account endpoints (`/api/v1/auth`, `/api/v1/profile`).
 * Thin, typed wrappers over {@link apiRequest}.
 */

import { apiRequest } from "./client";
import type {
  AuthTokenResponse,
  BuyerRegistrationRequest,
  ChangePasswordRequest,
  CurrentUser,
  LoginRequest,
  MessageResponse,
  RegistrationResponse,
  VendorRegistrationRequest,
} from "./types";

/** POST /auth/login — unauthenticated. */
export function login(payload: LoginRequest): Promise<AuthTokenResponse> {
  return apiRequest<AuthTokenResponse>("/auth/login", {
    method: "POST",
    body: payload,
    authenticated: false,
  });
}

/**
 * POST /auth/refresh — uses the HttpOnly refresh cookie only.
 * Never retried on 401 (that would recurse).
 */
export function refresh(): Promise<AuthTokenResponse> {
  return apiRequest<AuthTokenResponse>("/auth/refresh", {
    method: "POST",
    authenticated: false,
    retryOnUnauthorized: false,
  });
}

/** GET /auth/me — current authenticated principal. */
export function me(): Promise<CurrentUser> {
  return apiRequest<CurrentUser>("/auth/me");
}

/** POST /auth/logout — revoke the current session. */
export function logout(): Promise<void> {
  return apiRequest<void>("/auth/logout", { method: "POST", retryOnUnauthorized: false });
}

/** POST /auth/logout-all — revoke every session for the user. */
export function logoutAll(): Promise<void> {
  return apiRequest<void>("/auth/logout-all", { method: "POST", retryOnUnauthorized: false });
}

/** POST /auth/register/buyer — unauthenticated self-registration. */
export function registerBuyer(payload: BuyerRegistrationRequest): Promise<RegistrationResponse> {
  return apiRequest<RegistrationResponse>("/auth/register/buyer", {
    method: "POST",
    body: payload,
    authenticated: false,
  });
}

/** POST /auth/register/vendor — unauthenticated self-registration. */
export function registerVendor(payload: VendorRegistrationRequest): Promise<RegistrationResponse> {
  return apiRequest<RegistrationResponse>("/auth/register/vendor", {
    method: "POST",
    body: payload,
    authenticated: false,
  });
}

/**
 * POST /auth/change-password — also used for the forced temporary-password
 * change (the only mutating endpoint reachable while `must_change_password`).
 *
 * This is SESSION-INVALIDATING on the backend: it revokes every active session
 * (bumps `auth_version`) and clears the refresh cookie, then returns only a
 * {@link MessageResponse}. The caller MUST re-authenticate afterwards — there is
 * no token in this response, so callers must not attempt to `applyAuth` on it.
 * Not retried on 401 (the access token is invalidated the moment it succeeds).
 */
export function changePassword(payload: ChangePasswordRequest): Promise<MessageResponse> {
  return apiRequest<MessageResponse>("/auth/change-password", {
    method: "POST",
    body: payload,
    retryOnUnauthorized: false,
  });
}
