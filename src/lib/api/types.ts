/**
 * API contract types for Phase 0/1 (Authentication, approval and RBAC).
 *
 * These are kept deliberately isolated in this file and mirror the backend's
 * canonical Pydantic schemas EXACTLY (field names, nullability, pagination
 * envelope). The source of truth is the backend OpenAPI document, a snapshot of
 * which lives at `tests/fixtures/openapi.json`; `tests/contract.test.ts` fails
 * if any of the shapes below drift from that document, so a backend rename can
 * no longer silently break the portal.
 *
 * Import everything through `@/lib/api` so the underlying modules can be swapped
 * for OpenAPI-generated code later without touching call sites.
 */

// ---------------------------------------------------------------------------
// Enumerations (backend uses constrained string values)
// ---------------------------------------------------------------------------

/** Account lifecycle states — backend `AccountStatus`. */
export type AccountStatus =
  "PENDING_APPROVAL" | "ACTIVE" | "LOCKED" | "SUSPENDED" | "REJECTED" | "DISABLED";

export const ACCOUNT_STATUSES: readonly AccountStatus[] = [
  "PENDING_APPROVAL",
  "ACTIVE",
  "LOCKED",
  "SUSPENDED",
  "REJECTED",
  "DISABLED",
] as const;

/** High-level account category — backend `UserType`. */
export type UserType = "ADMIN" | "BUYER" | "VENDOR";

export const USER_TYPES: readonly UserType[] = ["ADMIN", "BUYER", "VENDOR"] as const;

/** RBAC roles — backend `rbac.constants.RoleName`. */
export type RoleName =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "SALES"
  | "QUALITY"
  | "DOCUMENTATION"
  | "LOGISTICS"
  | "FINANCE"
  | "BUYER_OWNER"
  | "BUYER_MEMBER"
  | "VENDOR_OWNER"
  | "VENDOR_MEMBER";

/**
 * Actor that performed a status transition / audit action — backend
 * `ActorType`. NOTE: the backend value for a self-initiated action is `USER`
 * (not `SELF`).
 */
export type ActorType = "SYSTEM" | "ADMIN" | "USER";

/** Reason a login attempt failed — backend `LoginFailureReason`. */
export type LoginFailureReason =
  "NONE" | "UNKNOWN_IDENTIFIER" | "BAD_PASSWORD" | "NOT_ACTIVE" | "LOCKED";

// ---------------------------------------------------------------------------
// Core identity
// ---------------------------------------------------------------------------

/** The authenticated principal — backend `CurrentUserResponse` (`GET /auth/me`). */
export interface CurrentUser {
  id: string;
  username: string;
  email: string;
  user_type: UserType;
  status: AccountStatus;
  company_name: string | null;
  must_change_password: boolean;
  roles: RoleName[];
  permissions: string[];
  last_login_at: string | null;
  created_at: string;
}

/** Admin-facing user summary row — backend `UserSummary` (`GET /admin/users`). */
export interface AdminUserSummary {
  id: string;
  username: string;
  email: string;
  user_type: UserType;
  status: AccountStatus;
  company_name: string | null;
  failed_login_attempts: number;
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string;
}

/** Full admin user detail — backend `UserDetail` (`GET /admin/users/{id}`). */
export interface AdminUserDetail extends AdminUserSummary {
  normalized_username: string;
  normalized_email: string;
  locked_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  suspended_at: string | null;
  suspended_by: string | null;
  suspension_reason: string | null;
  temporary_password_expires_at: string | null;
  auth_version: number;
  roles: RoleName[];
  permissions: string[];
  updated_at: string;
}

/** One immutable account-status-history entry — backend `StatusHistoryResponse`. */
export interface StatusHistoryEntry {
  id: string;
  previous_status: AccountStatus | null;
  new_status: AccountStatus;
  reason: string;
  actor_type: ActorType;
  actor_id: string | null;
  request_id: string | null;
  ip_address: string | null;
  created_at: string;
}

/** One login attempt record — backend `LoginAttemptResponse`. */
export interface LoginAttemptEntry {
  id: string;
  identifier: string;
  successful: boolean;
  failure_reason: LoginFailureReason;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Pagination — backend `Page[T]` envelope
// ---------------------------------------------------------------------------

/** Page metadata — backend `PageMeta`. */
export interface PageMeta {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

/** Standard paginated collection envelope — backend `Page[T]`. */
export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

// ---------------------------------------------------------------------------
// Auth request/response payloads
// ---------------------------------------------------------------------------

export interface LoginRequest {
  /** Username or email; backend normalizes. */
  identifier: string;
  password: string;
}

/**
 * Successful login/refresh response — backend `TokenResponse`. The refresh token
 * is delivered ONLY as an HttpOnly cookie by the backend and is intentionally
 * NOT part of this body.
 */
export interface AuthTokenResponse {
  access_token: string;
  token_type: "bearer";
  /** ISO-8601 timestamp at which the access token expires. */
  expires_at: string;
  must_change_password: boolean;
  user: CurrentUser;
}

/** Generic `{ message }` acknowledgement — backend `MessageResponse`. */
export interface MessageResponse {
  message: string;
}

export interface BuyerRegistrationRequest {
  username: string;
  email: string;
  password: string;
  company_name: string;
  contact_name: string;
  phone: string;
  country: string;
}

export interface VendorRegistrationRequest extends BuyerRegistrationRequest {
  /** Non-empty list of supply categories (backend requires >= 1). */
  supply_categories: string[];
}

/** Response to a successful registration — backend `RegistrationResponse`. */
export interface RegistrationResponse {
  id: string;
  username: string;
  email: string;
  user_type: UserType;
  status: AccountStatus;
  company_name: string;
  message: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

// ---------------------------------------------------------------------------
// Admin action payloads
// ---------------------------------------------------------------------------

/** Every admin mutation requires a reason — backend `AdminActionRequest`. */
export interface AdminActionRequest {
  reason: string;
  notes?: string;
}

/** Standard admin action result — backend `AdminActionResponse`. */
export interface AdminActionResult {
  user_id: string;
  status: AccountStatus;
  action_at: string;
  audit_id: string;
}

/**
 * Password-reset result — backend `ResetPasswordResponse`. The temporary
 * password is shown exactly ONCE.
 */
export interface ResetPasswordResult {
  user_id: string;
  temporary_password: string;
  temporary_password_expires_at: string;
  must_change_password: boolean;
  audit_id: string;
}

/** Dashboard account summary — backend `AccountSummaryResponse`. */
export interface AccountSummary {
  total_users: number;
  buyers: number;
  vendors: number;
  admins: number;
  pending_approval: number;
  active: number;
  locked: number;
  suspended: number;
  rejected: number;
  disabled: number;
  registered_last_7_days: number;
}

// ---------------------------------------------------------------------------
// List query parameters
// ---------------------------------------------------------------------------

export interface AdminUserListParams {
  /** Free-text search over username, email, or company (sent as `q`). */
  query?: string;
  user_type?: UserType;
  status?: AccountStatus;
  company?: string;
  page?: number;
  page_size?: number;
}

/** Offset/limit style page request for history/attempt lists. */
export interface PageParams {
  page?: number;
  page_size?: number;
}
