/**
 * Public entry point for the portal API layer.
 *
 * Import everything through `@/lib/api` so the underlying modules (and the
 * hand-authored types) can be swapped for OpenAPI-generated code later without
 * touching call sites.
 */

export * from "./config";
export * from "./errors";
export * from "./types";
export { apiRequest, configureAuthBridge, type AuthBridge, type RequestOptions } from "./client";

export * as authApi from "./auth";
export * as adminApi from "./admin";
export { type AdminActionName } from "./admin";
