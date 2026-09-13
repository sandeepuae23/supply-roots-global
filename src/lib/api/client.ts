/**
 * Typed fetch wrapper for the portal API.
 *
 * Responsibilities:
 *  - Prefix requests with the configured `/api/v1` base.
 *  - Always send credentials so the HttpOnly refresh cookie flows.
 *  - Attach the in-memory access token as a Bearer header.
 *  - Normalize every failure into a typed {@link ApiError}.
 *  - Transparently refresh the access token once on a 401 and retry.
 *
 * The access token and refresh routine live in the auth provider, not here.
 * They are injected via {@link configureAuthBridge} to avoid a circular
 * dependency between the client and the React auth context.
 */

import { API_V1_BASE } from "./config";
import { ApiError, apiErrorFromResponse, isApiError, networkError } from "./errors";

/** Bridge the client uses to read/refresh the access token. */
export interface AuthBridge {
  /** Current in-memory access token, or null when signed out. */
  getAccessToken: () => string | null;
  /**
   * Attempt to refresh the access token using the refresh cookie.
   * Returns the new token on success, or null when refresh is not possible.
   * Must be safe to call concurrently (implementation should de-duplicate).
   */
  refreshAccessToken: () => Promise<string | null>;
  /** Called when a refresh definitively fails so the app can sign out. */
  onAuthExpired: () => void;
}

let authBridge: AuthBridge | null = null;

/** Register the auth bridge (called once by the auth provider on mount). */
export function configureAuthBridge(bridge: AuthBridge | null): void {
  authBridge = bridge;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** JSON-serializable body. */
  body?: unknown;
  /** Query-string parameters; `undefined`/`null` values are dropped. */
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Abort signal for cancellation. */
  signal?: AbortSignal | undefined;
  /** Attach the Bearer access token (default: true). */
  authenticated?: boolean;
  /** Attempt a token refresh + retry on 401 (default: true when authenticated). */
  retryOnUnauthorized?: boolean;
}

function buildUrl(path: string, query: RequestOptions["query"]): string {
  const url = `${API_V1_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.append(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function parseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (response.status === 204 || response.status === 205) return null;
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  try {
    const text = await response.text();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

async function rawRequest(path: string, options: RequestOptions): Promise<Response> {
  const { method = "GET", body, query, signal, authenticated = true } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (authenticated) {
    const token = authBridge?.getAccessToken() ?? null;
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const init: RequestInit = {
    method,
    headers,
    // Required so the HttpOnly refresh cookie is sent/stored cross-origin.
    credentials: "include",
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    ...(signal ? { signal } : {}),
  };

  try {
    return await fetch(buildUrl(path, query), init);
  } catch (cause) {
    // fetch only rejects on transport-level failures (offline, DNS, CORS).
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw networkError(cause);
  }
}

/**
 * Perform an API request and return the parsed JSON body typed as `T`.
 * Throws {@link ApiError} on any non-2xx response or transport failure.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { authenticated = true, retryOnUnauthorized = authenticated } = options;

  let response = await rawRequest(path, options);

  // Transparent single refresh + retry on 401.
  if (response.status === 401 && authenticated && retryOnUnauthorized && authBridge) {
    const refreshed = await authBridge.refreshAccessToken();
    if (refreshed) {
      response = await rawRequest(path, { ...options, retryOnUnauthorized: false });
    } else {
      authBridge.onAuthExpired();
    }
  }

  const parsed = await parseBody(response);

  if (!response.ok) {
    throw apiErrorFromResponse(response.status, parsed);
  }

  return parsed as T;
}

/** Re-exports so callers only ever import from `@/lib/api`. */
export { ApiError, isApiError };
