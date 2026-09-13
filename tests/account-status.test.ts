import { test, expect, describe } from "bun:test";
import { ACCOUNT_STATUS_META, routeForStatus } from "../src/lib/auth/account-status";
import { ACCOUNT_STATUSES } from "../src/lib/api/types";

describe("routeForStatus", () => {
  test("ACTIVE has no blocking route", () => {
    expect(routeForStatus("ACTIVE")).toBeNull();
  });

  test("each non-active status maps to its /account route", () => {
    expect(routeForStatus("PENDING_APPROVAL")).toBe("/account/pending");
    expect(routeForStatus("REJECTED")).toBe("/account/rejected");
    expect(routeForStatus("LOCKED")).toBe("/account/locked");
    expect(routeForStatus("SUSPENDED")).toBe("/account/suspended");
    expect(routeForStatus("DISABLED")).toBe("/account/disabled");
  });

  test("every non-active status has metadata with required copy", () => {
    for (const status of ACCOUNT_STATUSES) {
      if (status === "ACTIVE") continue;
      const meta = ACCOUNT_STATUS_META[status];
      expect(meta).toBeDefined();
      expect(meta.status).toBe(status);
      expect(meta.title.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(0);
      expect(meta.route.startsWith("/account/")).toBe(true);
    }
  });
});
