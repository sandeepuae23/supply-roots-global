/**
 * Typed API error handling.
 *
 * The backend emits a single structured envelope for EVERY error (see
 * `app/core/errors.py`):
 *
 *   { "error": { "code", "message", "details": [ ... ], "request_id" } }
 *
 * where each `details` entry is `{ location: (string|int)[], message, type }`
 * for field-level validation failures. We also accept FastAPI's raw default
 * (`{ detail: string | ValidationError[] }`) as a fallback so a
 * mis-configured/edge response never surfaces as `[object Object]`.
 */

/** One field-level validation problem (FastAPI/Pydantic style). */
export interface FieldError {
  /** Dotted path to the offending field, e.g. `body.email`. */
  field: string;
  /** Human-readable message. */
  message: string;
}

/** Categories callers can branch on without inspecting status codes. */
export type ApiErrorKind =
  | "network" // request never reached the server / no response
  | "validation" // 422 / 400 field errors
  | "unauthorized" // 401
  | "forbidden" // 403
  | "not_found" // 404
  | "conflict" // 409 invalid state transition
  | "rate_limited" // 429
  | "server" // 5xx
  | "unknown";

/**
 * Raised for any non-2xx response OR any transport failure. Always carries a
 * user-safe `message`; never contains secrets.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  /** HTTP status, or 0 when the request never got a response. */
  readonly status: number;
  /** Machine-readable code from the backend envelope, if any. */
  readonly code: string | undefined;
  /** Correlation id echoed by the backend, useful for support. */
  readonly requestId: string | undefined;
  /** Field-level validation errors, when applicable. */
  readonly fieldErrors: FieldError[];

  constructor(init: {
    message: string;
    kind: ApiErrorKind;
    status: number;
    code?: string | undefined;
    requestId?: string | undefined;
    fieldErrors?: FieldError[];
  }) {
    super(init.message);
    this.name = "ApiError";
    this.kind = init.kind;
    this.status = init.status;
    this.code = init.code;
    this.requestId = init.requestId;
    this.fieldErrors = init.fieldErrors ?? [];
  }

  /** True when the failure is a lost connection / unreachable API. */
  get isConnectionError(): boolean {
    return this.kind === "network";
  }
}

/** Type guard for `unknown` values caught in query/mutation handlers. */
export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

/** Map an HTTP status to a coarse {@link ApiErrorKind}. */
export function kindFromStatus(status: number): ApiErrorKind {
  switch (status) {
    case 400:
    case 422:
      return "validation";
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "not_found";
    case 409:
      return "conflict";
    case 429:
      return "rate_limited";
    default:
      if (status >= 500) return "server";
      return "unknown";
  }
}

interface StructuredEnvelope {
  error?: {
    code?: unknown;
    message?: unknown;
    request_id?: unknown;
    details?: unknown;
  };
  detail?: unknown;
  request_id?: unknown;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Extract field errors from a list of detail entries. Handles BOTH the backend
 * structured shape (`{ location: [...], message }`) and FastAPI's raw default
 * (`{ loc: [...], msg }`). The leading `body`/`query` segment is dropped from
 * the reported field path so it lines up with form field names.
 */
function parseFieldErrors(detail: unknown): FieldError[] {
  if (!Array.isArray(detail)) return [];
  const out: FieldError[] = [];
  for (const item of detail) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const rawLoc = Array.isArray(rec["location"])
      ? rec["location"]
      : Array.isArray(rec["loc"])
        ? rec["loc"]
        : [];
    // Drop a leading request-part segment ("body" | "query" | "path") so the
    // field path matches client-side field names.
    const segments = rawLoc.map(String);
    const trimmed =
      segments.length > 1 && ["body", "query", "path"].includes(segments[0]!)
        ? segments.slice(1)
        : segments;
    const field = trimmed.join(".");
    const msg = asString(rec["message"]) ?? asString(rec["msg"]);
    if (msg) out.push({ field, message: msg });
  }
  return out;
}

/**
 * Build an {@link ApiError} from a parsed response body + status. Falls back to
 * a generic message so we never surface `[object Object]` to users.
 */
export function apiErrorFromResponse(status: number, body: unknown): ApiError {
  const kind = kindFromStatus(status);
  const env = (body ?? {}) as StructuredEnvelope;

  const structured = env.error && typeof env.error === "object" ? env.error : undefined;
  // Prefer the backend structured `error.details`; fall back to FastAPI `detail`.
  const fieldErrors =
    structured && Array.isArray(structured.details)
      ? parseFieldErrors(structured.details)
      : parseFieldErrors(env.detail);

  const message =
    asString(structured?.message) ??
    (typeof env.detail === "string" ? env.detail : undefined) ??
    (fieldErrors.length > 0 ? fieldErrors[0]!.message : undefined) ??
    defaultMessageForKind(kind, status);

  return new ApiError({
    message,
    kind,
    status,
    code: asString(structured?.code),
    requestId: asString(structured?.request_id) ?? asString(env.request_id),
    fieldErrors,
  });
}

/** Human-friendly fallback copy per error kind. */
export function defaultMessageForKind(kind: ApiErrorKind, status: number): string {
  switch (kind) {
    case "network":
      return "Cannot reach the server. Check your connection and try again.";
    case "validation":
      return "Some of the information provided is invalid.";
    case "unauthorized":
      return "Your session has expired. Please sign in again.";
    case "forbidden":
      return "You do not have permission to perform this action.";
    case "not_found":
      return "The requested item could not be found.";
    case "conflict":
      return "This action conflicts with the current account state.";
    case "rate_limited":
      return "Too many attempts. Please wait a moment and try again.";
    case "server":
      return "The server encountered an error. Please try again shortly.";
    default:
      return `Request failed (${status}).`;
  }
}

/** Error used when the network request itself fails (DNS, CORS, offline). */
export function networkError(cause?: unknown): ApiError {
  return new ApiError({
    message: defaultMessageForKind("network", 0),
    kind: "network",
    status: 0,
    code: cause instanceof Error ? cause.name : undefined,
  });
}
