import { test, expect, describe } from "bun:test";
import { safeRedirect } from "../src/lib/auth/safe-redirect";

const FALLBACK = "/admin/dashboard";

describe("safeRedirect", () => {
  test("accepts internal portal paths", () => {
    expect(safeRedirect("/admin/users", FALLBACK)).toBe("/admin/users");
    expect(safeRedirect("/buyer/dashboard", FALLBACK)).toBe("/buyer/dashboard");
    expect(safeRedirect("/vendor/orders?tab=open", FALLBACK)).toBe("/vendor/orders?tab=open");
    expect(safeRedirect("/admin", FALLBACK)).toBe("/admin");
  });

  test("rejects external absolute URLs", () => {
    expect(safeRedirect("https://evil.example/admin", FALLBACK)).toBe(FALLBACK);
    expect(safeRedirect("http://evil.example", FALLBACK)).toBe(FALLBACK);
  });

  test("rejects protocol-relative and backslash-smuggled hosts", () => {
    expect(safeRedirect("//evil.example", FALLBACK)).toBe(FALLBACK);
    expect(safeRedirect("/\\evil.example", FALLBACK)).toBe(FALLBACK);
    expect(safeRedirect("/admin\\..\\evil", FALLBACK)).toBe(FALLBACK);
  });

  test("rejects scheme-bearing and whitespace-smuggled values", () => {
    expect(safeRedirect("javascript:alert(1)", FALLBACK)).toBe(FALLBACK);
    expect(safeRedirect("/admin/\tusers", FALLBACK)).toBe(FALLBACK);
    expect(safeRedirect("/admin/\nusers", FALLBACK)).toBe(FALLBACK);
  });

  test("rejects internal-but-unlisted paths (e.g. auth screens, marketing)", () => {
    expect(safeRedirect("/login", FALLBACK)).toBe(FALLBACK);
    expect(safeRedirect("/change-temporary-password", FALLBACK)).toBe(FALLBACK);
    expect(safeRedirect("/", FALLBACK)).toBe(FALLBACK);
    // A path that merely starts with an allowed word but is a different segment.
    expect(safeRedirect("/adminX/secret", FALLBACK)).toBe(FALLBACK);
  });

  test("falls back on empty/nullish input", () => {
    expect(safeRedirect(undefined, FALLBACK)).toBe(FALLBACK);
    expect(safeRedirect(null, FALLBACK)).toBe(FALLBACK);
    expect(safeRedirect("", FALLBACK)).toBe(FALLBACK);
  });
});
