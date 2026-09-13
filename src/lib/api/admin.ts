/**
 * Administrator identity endpoints (`/api/v1/admin`).
 * Every mutation takes an {@link AdminActionRequest} carrying a mandatory reason.
 * Every list endpoint returns the backend {@link Page} envelope.
 */

import { apiRequest } from "./client";
import type {
  AccountSummary,
  AdminActionRequest,
  AdminActionResult,
  AdminUserDetail,
  AdminUserListParams,
  AdminUserSummary,
  LoginAttemptEntry,
  Page,
  PageParams,
  ResetPasswordResult,
  StatusHistoryEntry,
} from "./types";

/** GET /admin/dashboard/account-summary. */
export function getAccountSummary(signal?: AbortSignal): Promise<AccountSummary> {
  return apiRequest<AccountSummary>("/admin/dashboard/account-summary", { signal });
}

/**
 * GET /admin/users — filtered, paginated user list.
 *
 * The backend search parameter is `q` (not `query`); the free-text term is
 * mapped here so call sites keep the descriptive `query` name.
 */
export function listUsers(
  params: AdminUserListParams,
  signal?: AbortSignal,
): Promise<Page<AdminUserSummary>> {
  return apiRequest<Page<AdminUserSummary>>("/admin/users", {
    query: {
      q: params.query,
      user_type: params.user_type,
      status: params.status,
      company: params.company,
      page: params.page,
      page_size: params.page_size,
    },
    signal,
  });
}

/** GET /admin/users/{id}. */
export function getUser(userId: string, signal?: AbortSignal): Promise<AdminUserDetail> {
  return apiRequest<AdminUserDetail>(`/admin/users/${encodeURIComponent(userId)}`, { signal });
}

/** GET /admin/users/{id}/status-history — paginated. */
export function getStatusHistory(
  userId: string,
  params: PageParams = {},
  signal?: AbortSignal,
): Promise<Page<StatusHistoryEntry>> {
  return apiRequest<Page<StatusHistoryEntry>>(
    `/admin/users/${encodeURIComponent(userId)}/status-history`,
    { query: { page: params.page, page_size: params.page_size }, signal },
  );
}

/** GET /admin/users/{id}/login-attempts — paginated. */
export function getLoginAttempts(
  userId: string,
  params: PageParams = {},
  signal?: AbortSignal,
): Promise<Page<LoginAttemptEntry>> {
  return apiRequest<Page<LoginAttemptEntry>>(
    `/admin/users/${encodeURIComponent(userId)}/login-attempts`,
    { query: { page: params.page, page_size: params.page_size }, signal },
  );
}

/** The admin lifecycle actions that share the reason-only request shape. */
export type AdminActionName =
  "approve" | "reject" | "lock" | "unlock" | "suspend" | "reactivate" | "disable";

/** POST /admin/users/{id}/{action} — reason-only lifecycle transitions. */
export function performUserAction(
  userId: string,
  action: AdminActionName,
  payload: AdminActionRequest,
): Promise<AdminActionResult> {
  return apiRequest<AdminActionResult>(`/admin/users/${encodeURIComponent(userId)}/${action}`, {
    method: "POST",
    body: payload,
  });
}

/** POST /admin/users/{id}/reset-password — returns the one-time temp password. */
export function resetPassword(
  userId: string,
  payload: AdminActionRequest,
): Promise<ResetPasswordResult> {
  return apiRequest<ResetPasswordResult>(
    `/admin/users/${encodeURIComponent(userId)}/reset-password`,
    { method: "POST", body: payload },
  );
}
