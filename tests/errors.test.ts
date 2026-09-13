import { test, expect, describe } from "bun:test";
import {
  apiErrorFromResponse,
  kindFromStatus,
  networkError,
  isApiError,
  ApiError,
} from "../src/lib/api/errors";

describe("kindFromStatus", () => {
  test("maps status codes to kinds", () => {
    expect(kindFromStatus(400)).toBe("validation");
    expect(kindFromStatus(422)).toBe("validation");
    expect(kindFromStatus(401)).toBe("unauthorized");
    expect(kindFromStatus(403)).toBe("forbidden");
    expect(kindFromStatus(404)).toBe("not_found");
    expect(kindFromStatus(409)).toBe("conflict");
    expect(kindFromStatus(429)).toBe("rate_limited");
    expect(kindFromStatus(500)).toBe("server");
    expect(kindFromStatus(503)).toBe("server");
    expect(kindFromStatus(418)).toBe("unknown");
  });
});

describe("apiErrorFromResponse", () => {
  test("reads a structured error envelope", () => {
    const err = apiErrorFromResponse(409, {
      error: {
        code: "INVALID_TRANSITION",
        message: "Cannot suspend a locked account",
        request_id: "req-123",
      },
    });
    expect(err.kind).toBe("conflict");
    expect(err.status).toBe(409);
    expect(err.code).toBe("INVALID_TRANSITION");
    expect(err.message).toBe("Cannot suspend a locked account");
    expect(err.requestId).toBe("req-123");
  });

  test("reads a FastAPI string detail", () => {
    const err = apiErrorFromResponse(403, { detail: "Not enough permissions" });
    expect(err.kind).toBe("forbidden");
    expect(err.message).toBe("Not enough permissions");
  });

  test("extracts field errors from the backend structured envelope details", () => {
    const err = apiErrorFromResponse(422, {
      error: {
        code: "validation_error",
        message: "Request validation failed.",
        request_id: "req-9",
        details: [
          {
            location: ["body", "email"],
            message: "value is not a valid email address",
            type: "value_error",
          },
          {
            location: ["body", "supply_categories", 0],
            message: "String should have at least 2 characters",
            type: "string_too_short",
          },
        ],
      },
    });
    expect(err.kind).toBe("validation");
    expect(err.code).toBe("validation_error");
    expect(err.requestId).toBe("req-9");
    expect(err.fieldErrors).toHaveLength(2);
    // The leading "body" segment is stripped so it lines up with form fields.
    expect(err.fieldErrors[0]).toEqual({
      field: "email",
      message: "value is not a valid email address",
    });
    expect(err.fieldErrors[1]!.field).toBe("supply_categories.0");
    // Envelope message wins over the first field error for the top-level message.
    expect(err.message).toBe("Request validation failed.");
  });

  test("extracts FastAPI field validation errors", () => {
    const err = apiErrorFromResponse(422, {
      detail: [
        { loc: ["body", "email"], msg: "value is not a valid email address" },
        { loc: ["body", "password"], msg: "ensure this value has at least 12 characters" },
      ],
    });
    expect(err.kind).toBe("validation");
    expect(err.fieldErrors).toHaveLength(2);
    // The leading "body" request-part segment is stripped so the path lines up
    // with client-side form field names.
    expect(err.fieldErrors[0]).toEqual({
      field: "email",
      message: "value is not a valid email address",
    });
    expect(err.fieldErrors[1]!.field).toBe("password");
    // Message falls back to the first field error.
    expect(err.message).toBe("value is not a valid email address");
  });

  test("falls back to a generic message when body is empty", () => {
    const err = apiErrorFromResponse(500, null);
    expect(err.kind).toBe("server");
    expect(err.message.length).toBeGreaterThan(0);
  });
});

describe("networkError", () => {
  test("produces a connection error", () => {
    const err = networkError(new Error("Failed to fetch"));
    expect(isApiError(err)).toBe(true);
    expect(err.isConnectionError).toBe(true);
    expect(err.status).toBe(0);
    expect(err.kind).toBe("network");
  });
});

describe("isApiError", () => {
  test("distinguishes ApiError from other errors", () => {
    expect(isApiError(new ApiError({ message: "x", kind: "unknown", status: 0 }))).toBe(true);
    expect(isApiError(new Error("plain"))).toBe(false);
    expect(isApiError("string")).toBe(false);
    expect(isApiError(null)).toBe(false);
  });
});
