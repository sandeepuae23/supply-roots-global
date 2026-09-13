import { test, expect, describe } from "bun:test";
import { routeForLoginErrorCode } from "../src/lib/auth/account-status";

describe("routeForLoginErrorCode", () => {
  test("maps each blocked-account error code to its status screen", () => {
    expect(routeForLoginErrorCode("account_pending_approval")).toBe("/account/pending");
    expect(routeForLoginErrorCode("account_locked")).toBe("/account/locked");
    expect(routeForLoginErrorCode("account_suspended")).toBe("/account/suspended");
    expect(routeForLoginErrorCode("account_rejected")).toBe("/account/rejected");
    expect(routeForLoginErrorCode("account_disabled")).toBe("/account/disabled");
  });

  test("returns null for codes handled inline (no dedicated screen)", () => {
    // Temporary-password expiry has a clear message but no status screen; the
    // login form shows it inline rather than routing away.
    expect(routeForLoginErrorCode("temporary_password_expired")).toBeNull();
    expect(routeForLoginErrorCode("authentication_failed")).toBeNull();
    expect(routeForLoginErrorCode(undefined)).toBeNull();
    expect(routeForLoginErrorCode("something_new")).toBeNull();
  });
});
