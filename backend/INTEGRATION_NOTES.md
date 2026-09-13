# Integration Notes — root-level changes needed for the backend

This backend deliberately **does not modify** root `docker-compose.yml`, root
`.env.example`, root CI, frontend files, docs, or generated route files. Those
artifacts are owned by the `INTEGRATION` lane. This document specifies the exact
additions needed to wire the backend into the repository root.

All backend configuration is namespaced with the **`LEO_`** prefix so it never
collides with generic host environment variables (`DEBUG`, `HOST`, `PORT`, …).

---

## 1. Root `docker-compose.yml`

There is currently **no** `docker-compose.yml` at the repo root. Add services
equivalent to the following (merge into any future frontend compose):

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-leo}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-leo}
      POSTGRES_DB: ${POSTGRES_DB:-leo_portal}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-leo}"]
      interval: 5s
      timeout: 5s
      retries: 10

  api:
    build: ./backend
    depends_on:
      db:
        condition: service_healthy
    environment:
      LEO_ENVIRONMENT: ${LEO_ENVIRONMENT:-development}
      LEO_DATABASE_URL: postgresql+asyncpg://${POSTGRES_USER:-leo}:${POSTGRES_PASSWORD:-leo}@db:5432/${POSTGRES_DB:-leo_portal}
      LEO_JWT_SECRET_KEY: ${LEO_JWT_SECRET_KEY:?set a strong secret}
      LEO_CORS_ALLOW_ORIGINS: ${LEO_CORS_ALLOW_ORIGINS:-http://localhost:5173}
      RUN_MIGRATIONS: "1"            # apply Alembic migrations on start
      BOOTSTRAP_ADMIN: ${BOOTSTRAP_ADMIN:-0}
      ADMIN_USERNAME: ${ADMIN_USERNAME:-}
      ADMIN_EMAIL: ${ADMIN_EMAIL:-}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD:-}
    ports:
      - "8000:8000"

  # (existing / future) frontend service proxies /api to the api service.

volumes:
  pgdata:
```

Notes:
- The backend image's entrypoint, when `RUN_MIGRATIONS=1`, runs
  `alembic upgrade head` **and then** the idempotent RBAC seed
  (`python -m app.scripts.seed_rbac`). Either step failing aborts startup with a
  nonzero exit, so a freshly migrated database can always register (its default
  roles exist). When `BOOTSTRAP_ADMIN=1` and `ADMIN_*` are set it also creates
  the first admin (idempotent) without swallowing genuine failures.
- `LEO_JWT_SECRET_KEY` is **required in every environment** (not just
  staging/production). Startup fails closed on an unset/empty/placeholder value.
- For a separate test database, add `leo_test` (and, for the migration
  up/down CI check, `leo_migrate`).

## 2. Root `.env.example`

There is no root `.env.example` yet. Add the following (values are placeholders;
never commit real secrets). The full per-setting template lives in
`backend/.env.example`.

```dotenv
# PostgreSQL service
POSTGRES_USER=leo
POSTGRES_PASSWORD=leo
POSTGRES_DB=leo_portal

# Backend (LEO_-prefixed)
LEO_ENVIRONMENT=development
LEO_DATABASE_URL=postgresql+asyncpg://leo:leo@db:5432/leo_portal
LEO_JWT_SECRET_KEY=change-me-generate-with-secrets-token_urlsafe-48
LEO_CORS_ALLOW_ORIGINS=http://localhost:5173

# First-admin bootstrap (optional; used only when BOOTSTRAP_ADMIN=1)
BOOTSTRAP_ADMIN=0
ADMIN_USERNAME=
ADMIN_EMAIL=
ADMIN_PASSWORD=

# Frontend → API base URL (existing TanStack app)
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Required before staging/production start: a strong `LEO_JWT_SECRET_KEY`
(>= 32 chars). The app refuses to boot in staging/production with a weak/default
key.

## 3. Root CI (`.github/workflows/`)

There is no `.github/` directory yet. A ready-to-use workflow is provided at
`backend/ci/backend-ci.proposed.yml`. To activate, copy it to
`.github/workflows/backend-ci.yml`. It runs:

1. `ruff check app tests` (lint)
2. `mypy app` (type check)
3. Alembic `upgrade head` → `downgrade -1` → `upgrade head` against PostgreSQL 16
4. `pytest` with PostgreSQL concurrency tests and `--cov-fail-under=90`
5. OpenAPI schema generation
6. `docker build` of the backend image

## 4. Frontend wiring (FE-FOUNDATION lane)

- Point the API client base URL at `${VITE_API_BASE_URL}` (`/api/v1`).
- Access token: keep in memory; send as `Authorization: Bearer <token>`.
- **Login / refresh responses** carry `{access_token, token_type, expires_at,
  must_change_password, user}` where `user` is the complete current-user object
  (id, username, email, user_type, status, company_name, roles, permissions,
  …). The **refresh token is NOT in the JSON body** — it is delivered only as an
  `HttpOnly`, `SameSite=Lax` cookie scoped to `/api/v1/auth` (`Secure` in
  staging/production). Call `POST /api/v1/auth/refresh` **with credentials
  included and no body**; the cookie rotates automatically. `POST
  /api/v1/auth/logout` likewise needs no body.
- **Registration** requires the company profile. Buyer:
  `{username, email, password, company_name, contact_name, phone, country}`;
  vendor additionally `supply_categories: [..]`. Unexpected fields are rejected
  with `422`.
- **Change password** invalidates all sessions: on `200` the client must
  discard the access token and re-authenticate (the refresh cookie is cleared).
- Generate the typed client from `GET /api/v1/openapi.json` once the backend is
  integrated (the P1-S2b typed-client gate).
- Handle the structured error envelope `{"error":{code,message,details?,request_id}}`
  and the `password_change_required` (403) code to route to the forced
  temporary-password-change screen.

## 4a. Acceptance mismatches to reconcile in the frontend correction

These are **backend-canonical** and documented in OpenAPI; the frontend lane
must align to them (rather than the backend changing):

- Auth response field names: access token in `access_token`; user object under
  `user`; **no** `refresh_token` field (cookie only).
- Page envelope: `{items, meta:{page, page_size, total_items, total_pages}}`
  (not `data`/`total`/`limit`).
- History/login rows use `created_at`, `failure_reason`, `request_id`,
  `previous_status`/`new_status`.
- Admin action responses use `user_id`, `status`, `action_at`, `audit_id`;
  reset-password uses `temporary_password`, `temporary_password_expires_at`.

## 5. Operational / hardening (Phase 8, not in this scope)

Configure at the edge / compose / ingress layer: TLS termination, rate limiting
for login/refresh/registration, trusted-host allowlist, security headers,
database backups + PITR, and secret management/rotation.
