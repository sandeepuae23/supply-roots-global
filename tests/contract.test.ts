/**
 * Contract tests — the frontend API layer vs. the backend OpenAPI document.
 *
 * `tests/fixtures/openapi.json` is a snapshot generated directly from the
 * backend FastAPI app (`app.openapi()`). These tests assert that the shapes the
 * hand-authored types in `src/lib/api/types.ts` assume are EXACTLY the shapes
 * the backend publishes. If the backend renames a field, drops one, or changes a
 * pagination envelope, one of these tests fails — which is the whole point: the
 * mismatch that got the first frontend rejected cannot silently recur.
 *
 * To refresh the snapshot after an intentional backend change, regenerate it
 * from the backend venv:
 *   python -c "import json;from app.main import app;\
 *     open('tests/fixtures/openapi.json','w').write(json.dumps(app.openapi(),indent=2,sort_keys=True))"
 */

import { test, expect, describe } from "bun:test";
import openapi from "./fixtures/openapi.json";

type Schema = {
  properties?: Record<string, unknown>;
  required?: string[];
  enum?: string[];
};

const schemas = (openapi as { components: { schemas: Record<string, Schema> } }).components.schemas;
const paths = (openapi as { paths: Record<string, Record<string, unknown>> }).paths;

function schema(name: string): Schema {
  const s = schemas[name];
  if (!s) throw new Error(`OpenAPI schema "${name}" not found`);
  return s;
}

function props(name: string): string[] {
  return Object.keys(schema(name).properties ?? {}).sort();
}

function required(name: string): string[] {
  return [...(schema(name).required ?? [])].sort();
}

/** Assert every field the frontend type reads exists in the backend schema. */
function expectHasAll(name: string, fields: string[]) {
  const have = new Set(props(name));
  for (const f of fields) {
    expect(`${name}.${f} exists = ${have.has(f)}`).toBe(`${name}.${f} exists = true`);
  }
}

/** Assert the backend schema exposes no field the frontend type is unaware of. */
function expectExactly(name: string, fields: string[]) {
  expect(props(name)).toEqual([...fields].sort());
}

describe("auth token contract", () => {
  test("TokenResponse is backend-canonical (no refresh_token)", () => {
    expectExactly("TokenResponse", [
      "access_token",
      "token_type",
      "expires_at",
      "must_change_password",
      "user",
    ]);
    expect(required("TokenResponse")).toEqual(["access_token", "expires_at", "user"]);
    // Refresh token must NEVER be readable in the JSON body.
    expect(props("TokenResponse")).not.toContain("refresh_token");
    expect(props("TokenResponse")).not.toContain("expires_in");
  });

  test("CurrentUserResponse carries roles, permissions and must_change_password", () => {
    expectHasAll("CurrentUserResponse", [
      "id",
      "username",
      "email",
      "user_type",
      "status",
      "company_name",
      "must_change_password",
      "roles",
      "permissions",
      "last_login_at",
      "created_at",
    ]);
  });

  test("change-password returns MessageResponse (not a token)", () => {
    const op = paths["/api/v1/auth/change-password"]!["post"] as {
      responses: Record<string, { content?: Record<string, { schema: { $ref?: string } }> }>;
    };
    const ref = op.responses["200"]?.content?.["application/json"]?.schema.$ref;
    expect(ref).toBe("#/components/schemas/MessageResponse");
    expectExactly("MessageResponse", ["message"]);
  });

  test("refresh and logout accept no required body (cookie-only flow)", () => {
    for (const p of ["/api/v1/auth/refresh", "/api/v1/auth/logout"]) {
      const op = paths[p]!["post"] as { requestBody?: { required?: boolean } };
      expect(op.requestBody?.required ?? false).toBe(false);
    }
  });
});

describe("registration contract", () => {
  test("BuyerRegistrationRequest keeps the persisted company/contact fields", () => {
    expectExactly("BuyerRegistrationRequest", [
      "username",
      "email",
      "password",
      "company_name",
      "contact_name",
      "phone",
      "country",
    ]);
  });

  test("VendorRegistrationRequest additionally requires supply_categories", () => {
    expect(props("VendorRegistrationRequest")).toContain("supply_categories");
    expect(required("VendorRegistrationRequest")).toContain("supply_categories");
    // supply_categories is a LIST, not a string.
    const sc = (schema("VendorRegistrationRequest").properties as Record<string, { type?: string }>)
      .supply_categories;
    expect(sc?.type).toBe("array");
  });

  test("RegistrationResponse includes company_name and message", () => {
    expectHasAll("RegistrationResponse", [
      "id",
      "username",
      "email",
      "user_type",
      "status",
      "company_name",
      "message",
    ]);
    expect(required("RegistrationResponse")).toContain("company_name");
  });
});

describe("pagination envelope contract", () => {
  test("PageMeta uses page/page_size/total_items/total_pages", () => {
    expectExactly("PageMeta", ["page", "page_size", "total_items", "total_pages"]);
  });

  test("list endpoints return {items, meta}", () => {
    for (const name of [
      "Page_UserSummary_",
      "Page_LoginAttemptResponse_",
      "Page_StatusHistoryResponse_",
    ]) {
      expectExactly(name, ["items", "meta"]);
    }
  });
});

describe("admin list/detail field contract", () => {
  test("UserSummary has must_change_password and NO roles field", () => {
    expectExactly("UserSummary", [
      "id",
      "username",
      "email",
      "user_type",
      "status",
      "company_name",
      "failed_login_attempts",
      "must_change_password",
      "last_login_at",
      "created_at",
    ]);
    expect(props("UserSummary")).not.toContain("roles");
  });

  test("UserDetail exposes roles, permissions, suspended_by and auth_version", () => {
    expectHasAll("UserDetail", [
      "normalized_username",
      "normalized_email",
      "locked_at",
      "approved_at",
      "approved_by",
      "suspended_at",
      "suspended_by",
      "suspension_reason",
      "temporary_password_expires_at",
      "auth_version",
      "roles",
      "permissions",
      "updated_at",
    ]);
  });

  test("StatusHistoryResponse uses previous_status/new_status/actor_type/ip_address", () => {
    expectExactly("StatusHistoryResponse", [
      "id",
      "previous_status",
      "new_status",
      "reason",
      "actor_type",
      "actor_id",
      "request_id",
      "ip_address",
      "created_at",
    ]);
  });

  test("LoginAttemptResponse uses `successful` and `ip_address`", () => {
    expectExactly("LoginAttemptResponse", [
      "id",
      "identifier",
      "successful",
      "failure_reason",
      "ip_address",
      "user_agent",
      "created_at",
    ]);
    expect(props("LoginAttemptResponse")).not.toContain("succeeded");
    expect(props("LoginAttemptResponse")).not.toContain("source_ip");
  });

  test("AdminActionResponse uses user_id/action_at/audit_id", () => {
    expectExactly("AdminActionResponse", ["user_id", "status", "action_at", "audit_id"]);
  });

  test("ResetPasswordResponse returns the one-time temporary password fields", () => {
    expectHasAll("ResetPasswordResponse", [
      "user_id",
      "temporary_password",
      "temporary_password_expires_at",
      "must_change_password",
      "audit_id",
    ]);
  });

  test("AccountSummaryResponse matches the dashboard tiles", () => {
    expectExactly("AccountSummaryResponse", [
      "total_users",
      "buyers",
      "vendors",
      "admins",
      "pending_approval",
      "active",
      "locked",
      "suspended",
      "rejected",
      "disabled",
      "registered_last_7_days",
    ]);
  });
});

describe("enum contract", () => {
  test("ActorType uses USER (not SELF)", () => {
    expect(schema("ActorType").enum).toEqual(["SYSTEM", "ADMIN", "USER"]);
  });

  test("LoginFailureReason matches the backend enum", () => {
    expect(schema("LoginFailureReason").enum).toEqual([
      "NONE",
      "UNKNOWN_IDENTIFIER",
      "BAD_PASSWORD",
      "NOT_ACTIVE",
      "LOCKED",
    ]);
  });

  test("AccountStatus enum matches ACCOUNT_STATUSES", () => {
    expect(schema("AccountStatus").enum).toEqual([
      "PENDING_APPROVAL",
      "ACTIVE",
      "LOCKED",
      "SUSPENDED",
      "REJECTED",
      "DISABLED",
    ]);
  });
});

describe("admin user list query contract", () => {
  test("search param is `q` and `company` (not `query`)", () => {
    const op = paths["/api/v1/admin/users"]!["get"] as {
      parameters: { name: string; in: string }[];
    };
    const names = op.parameters.filter((p) => p.in === "query").map((p) => p.name);
    expect(names).toContain("q");
    expect(names).toContain("company");
    expect(names).toContain("page");
    expect(names).toContain("page_size");
    expect(names).not.toContain("query");
    // The list endpoint must not filter by role (OpenAPI omits it).
    expect(names).not.toContain("role");
  });
});
