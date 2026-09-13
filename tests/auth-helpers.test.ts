import { test, expect, describe } from "bun:test";
import {
  hasAnyRole,
  hasPermission,
  portalHomeForUserType,
  ADMIN_ROLES,
} from "../src/lib/auth/use-auth";
import type { CurrentUser } from "../src/lib/api/types";

function makeUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: "u1",
    username: "alice",
    email: "alice@example.com",
    user_type: "ADMIN",
    status: "ACTIVE",
    roles: ["ADMIN"],
    permissions: ["accounts.approve"],
    must_change_password: false,
    company_name: null,
    last_login_at: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("hasAnyRole", () => {
  test("true when the user holds one of the roles", () => {
    expect(hasAnyRole(makeUser({ roles: ["ADMIN"] }), ADMIN_ROLES)).toBe(true);
    expect(hasAnyRole(makeUser({ roles: ["SUPER_ADMIN"] }), ADMIN_ROLES)).toBe(true);
  });

  test("false for missing roles or null user", () => {
    expect(hasAnyRole(makeUser({ roles: ["BUYER_OWNER"] }), ADMIN_ROLES)).toBe(false);
    expect(hasAnyRole(null, ADMIN_ROLES)).toBe(false);
  });
});

describe("hasPermission", () => {
  test("checks the permission list", () => {
    const user = makeUser({ permissions: ["accounts.approve", "users.unlock"] });
    expect(hasPermission(user, "users.unlock")).toBe(true);
    expect(hasPermission(user, "quotes.create")).toBe(false);
    expect(hasPermission(null, "accounts.approve")).toBe(false);
  });
});

describe("portalHomeForUserType", () => {
  test("routes each user type to its portal home", () => {
    expect(portalHomeForUserType("ADMIN")).toBe("/admin/dashboard");
    expect(portalHomeForUserType("BUYER")).toBe("/buyer/dashboard");
    expect(portalHomeForUserType("VENDOR")).toBe("/vendor/dashboard");
  });
});
