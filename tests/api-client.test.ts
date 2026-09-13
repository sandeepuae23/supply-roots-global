/**
 * Behavioural tests for the typed fetch client and the endpoint wrappers.
 *
 * These lock in the good design points called out in the review (access token
 * as a Bearer header, credentials:"include" so the refresh cookie flows, ONE
 * transparent refresh+retry on 401) AND the corrected contract behaviours
 * (search param sent as `q`, change-password never triggers a token refresh).
 */

import { test, expect, describe, afterEach } from "bun:test";
import { apiRequest, configureAuthBridge } from "../src/lib/api/client";
import * as adminApi from "../src/lib/api/admin";
import * as authApi from "../src/lib/api/auth";
import { isApiError } from "../src/lib/api/errors";

interface Call {
  url: string;
  init: RequestInit;
}

function stubFetch(handler: (call: Call) => Response): Call[] {
  const calls: Call[] = [];
  (globalThis as unknown as { fetch: typeof fetch }).fetch = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    const call = { url: String(input), init: init ?? {} };
    calls.push(call);
    return handler(call);
  }) as typeof fetch;
  return calls;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  configureAuthBridge(null);
});

describe("query serialization", () => {
  test("listUsers sends the search term as `q`, never `query`", async () => {
    const calls = stubFetch(() =>
      json({ items: [], meta: { page: 1, page_size: 20, total_items: 0, total_pages: 0 } }),
    );
    configureAuthBridge({
      getAccessToken: () => "tok",
      refreshAccessToken: async () => null,
      onAuthExpired: () => {},
    });

    await adminApi.listUsers({ query: "alice", company: "acme", page: 2, page_size: 20 });

    const url = calls[0]!.url;
    expect(url).toContain("q=alice");
    expect(url).toContain("company=acme");
    expect(url).toContain("page=2");
    expect(url).not.toContain("query=");
  });

  test("empty/undefined params are dropped from the query string", async () => {
    const calls = stubFetch(() =>
      json({ items: [], meta: { page: 1, page_size: 20, total_items: 0, total_pages: 0 } }),
    );
    await adminApi.listUsers({ page: 1, page_size: 20 });
    const url = calls[0]!.url;
    expect(url).not.toContain("q=");
    expect(url).not.toContain("company=");
    expect(url).not.toContain("status=");
  });
});

describe("credentials and bearer token", () => {
  test("always sends credentials:'include' and attaches the access token", async () => {
    const calls = stubFetch(() => json({ ok: true }));
    configureAuthBridge({
      getAccessToken: () => "secret-token",
      refreshAccessToken: async () => null,
      onAuthExpired: () => {},
    });

    await apiRequest("/auth/me");

    const init = calls[0]!.init;
    expect(init.credentials).toBe("include");
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer secret-token");
  });
});

describe("single transparent refresh + retry on 401", () => {
  test("refreshes once and retries with the new token", async () => {
    let token = "old";
    let refreshes = 0;
    const calls = stubFetch((call) => {
      const auth = (call.init.headers as Record<string, string>)["Authorization"];
      if (auth === "Bearer old") return json({ error: { code: "invalid_token" } }, 401);
      return json({ ok: true });
    });
    configureAuthBridge({
      getAccessToken: () => token,
      refreshAccessToken: async () => {
        refreshes += 1;
        token = "new";
        return token;
      },
      onAuthExpired: () => {},
    });

    const result = await apiRequest<{ ok: boolean }>("/admin/users");
    expect(result.ok).toBe(true);
    expect(refreshes).toBe(1);
    expect(calls).toHaveLength(2); // original + one retry
    expect((calls[1]!.init.headers as Record<string, string>)["Authorization"]).toBe("Bearer new");
  });

  test("calls onAuthExpired and throws when refresh fails", async () => {
    let expired = false;
    stubFetch(() => json({ error: { code: "invalid_token" } }, 401));
    configureAuthBridge({
      getAccessToken: () => "old",
      refreshAccessToken: async () => null,
      onAuthExpired: () => {
        expired = true;
      },
    });

    await expect(apiRequest("/admin/users")).rejects.toBeInstanceOf(Error);
    expect(expired).toBe(true);
  });
});

describe("change-password never refreshes and returns a message", () => {
  test("returns the MessageResponse body", async () => {
    stubFetch(() => json({ message: "Password changed. Please log in again." }));
    configureAuthBridge({
      getAccessToken: () => "tok",
      refreshAccessToken: async () => null,
      onAuthExpired: () => {},
    });

    const res = await authApi.changePassword({ current_password: "a", new_password: "b" });
    expect(res.message).toBe("Password changed. Please log in again.");
  });

  test("does NOT attempt a refresh on 401 (the token is invalidated on success)", async () => {
    let refreshes = 0;
    stubFetch(() => json({ error: { code: "invalid_current_password" } }, 401));
    configureAuthBridge({
      getAccessToken: () => "tok",
      refreshAccessToken: async () => {
        refreshes += 1;
        return "new";
      },
      onAuthExpired: () => {},
    });

    let caught: unknown;
    try {
      await authApi.changePassword({ current_password: "wrong", new_password: "b" });
    } catch (e) {
      caught = e;
    }
    expect(isApiError(caught)).toBe(true);
    expect((caught as { status: number }).status).toBe(401);
    expect(refreshes).toBe(0);
  });
});
