/**
 * API configuration.
 *
 * The portal talks to the FastAPI backend through a single origin configured at
 * build/runtime via `VITE_API_BASE_URL`. We treat that value as the server
 * ORIGIN (e.g. `https://api.example.com` or `http://localhost:8000`) and append
 * the versioned `/api/v1` prefix ourselves so the base URL stays stable across
 * API versions.
 *
 * Integration note: if the final deployment serves the API from the same origin
 * as the frontend, set `VITE_API_BASE_URL=""` (empty) and requests become
 * relative (`/api/v1/...`), which keeps the refresh cookie same-site.
 */

/** Raw origin from the environment, with any trailing slash removed. */
export const API_ORIGIN: string = (import.meta.env["VITE_API_BASE_URL"] ?? "").replace(/\/+$/, "");

/** Versioned API prefix used by every request in this layer. */
export const API_V1_PREFIX = "/api/v1";

/** Fully-qualified base for `/api/v1` endpoints. */
export const API_V1_BASE = `${API_ORIGIN}${API_V1_PREFIX}`;

/**
 * True when no API base URL was configured. Screens can surface an honest
 * "not configured" state instead of firing requests that will always fail.
 */
export const API_IS_CONFIGURED = API_ORIGIN.length > 0 || import.meta.env.PROD;
