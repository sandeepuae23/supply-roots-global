/**
 * Presentation + routing metadata for each non-active account status.
 * Shared by route guards (where to send a blocked user) and the status screens
 * (what to show). Copy is honest and never claims access the user does not have.
 */

import type { AccountStatus } from "@/lib/api";

export type StatusTone = "info" | "warning" | "danger";

export interface AccountStatusMeta {
  status: AccountStatus;
  /** Route that renders this status screen. */
  route: string;
  /** Short screen title. */
  title: string;
  /** Eyebrow label above the title. */
  eyebrow: string;
  /** One or two sentences explaining the state and next step. */
  description: string;
  tone: StatusTone;
}

/** Statuses that block normal login and have a dedicated screen. */
export const ACCOUNT_STATUS_META: Record<Exclude<AccountStatus, "ACTIVE">, AccountStatusMeta> = {
  PENDING_APPROVAL: {
    status: "PENDING_APPROVAL",
    route: "/account/pending",
    eyebrow: "Registration received",
    title: "Your account is awaiting approval",
    description:
      "Thank you for registering. An administrator is reviewing your details and will activate your account shortly. You'll be able to sign in once the review is complete.",
    tone: "info",
  },
  REJECTED: {
    status: "REJECTED",
    route: "/account/rejected",
    eyebrow: "Registration reviewed",
    title: "Your registration was not approved",
    description:
      "After review, your registration could not be approved at this time. If you believe this is a mistake, please contact our trade desk for assistance.",
    tone: "danger",
  },
  LOCKED: {
    status: "LOCKED",
    route: "/account/locked",
    eyebrow: "Account security",
    title: "Your account is locked",
    description:
      "For your protection, this account was locked after several unsuccessful sign-in attempts. An administrator must unlock it before you can sign in again.",
    tone: "warning",
  },
  SUSPENDED: {
    status: "SUSPENDED",
    route: "/account/suspended",
    eyebrow: "Account status",
    title: "Your account is suspended",
    description:
      "Access to this account has been temporarily suspended by an administrator. Please contact our trade desk if you need more information or wish to request reactivation.",
    tone: "warning",
  },
  DISABLED: {
    status: "DISABLED",
    route: "/account/disabled",
    eyebrow: "Account status",
    title: "This account has been disabled",
    description:
      "This account has been permanently deactivated and can no longer be used to access the portal. Please contact our trade desk if you have any questions.",
    tone: "danger",
  },
};

/** Route a blocked status maps to, or null for ACTIVE. */
export function routeForStatus(status: AccountStatus): string | null {
  if (status === "ACTIVE") return null;
  return ACCOUNT_STATUS_META[status].route;
}

/**
 * Backend login-denial error codes that correspond to a blocked account status.
 *
 * The backend correctly REFUSES to issue tokens for a non-active account and
 * instead returns a 403 carrying one of these codes (see
 * `app/modules/auth/service.py`). Because no user object is ever returned, the
 * login screen relies on the code alone to route the user to the matching help
 * screen — so those screens stay reachable even though no session was created.
 */
export const LOGIN_ERROR_STATUS_ROUTE: Record<string, string> = {
  account_pending_approval: ACCOUNT_STATUS_META.PENDING_APPROVAL.route,
  account_locked: ACCOUNT_STATUS_META.LOCKED.route,
  account_suspended: ACCOUNT_STATUS_META.SUSPENDED.route,
  account_rejected: ACCOUNT_STATUS_META.REJECTED.route,
  account_disabled: ACCOUNT_STATUS_META.DISABLED.route,
};

/**
 * Map a backend login error `code` to the help/status screen it should route to.
 * Returns null for codes that have no dedicated screen (e.g.
 * `temporary_password_expired`, whose message is surfaced inline instead, and
 * generic `authentication_failed`).
 */
export function routeForLoginErrorCode(code: string | undefined): string | null {
  if (!code) return null;
  return LOGIN_ERROR_STATUS_ROUTE[code] ?? null;
}
