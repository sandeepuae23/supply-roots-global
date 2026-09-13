# Leo Infinity Trade Portal — Backend (Phase 0 & Phase 1)

Production-quality FastAPI + PostgreSQL service delivering the foundation
(Phase 0) and identity stack (Phase 1) of the Leo Infinity Trade Portal:
authentication, buyer/vendor registration with administrator approval,
transactional account lockout, rotating refresh-token sessions, administrator
account governance with an immutable audit trail, and role-based access control.

> Scope: **Phase 0 and Phase 1 only.** Later phases (companies, catalog,
> enquiries, orders, logistics, finance, etc.) are intentionally not implemented.

---

## Stack

| Layer | Choice |
| --- | --- |
| Language | Python 3.12+ |
| API | FastAPI (ASGI), Uvicorn/Gunicorn |
| Validation | Pydantic 2 + pydantic-settings |
| ORM | SQLAlchemy 2 (async) |
| Driver | asyncpg |
| Migrations | Alembic (async env) |
| Password hashing | Argon2id (`argon2-cffi`) |
| Tokens | JWT access tokens (PyJWT) + opaque, hashed, rotating refresh tokens |
| Logging | structlog (JSON, request-id correlated, secret-redacting) |
| Tests | pytest, pytest-asyncio, httpx, coverage |

## Project layout

```
backend/
├── app/
│   ├── main.py                 # app factory, middleware, error handlers, lifespan
│   ├── core/                   # config, logging, security, errors, pagination, middleware, context
│   ├── db/                     # declarative base, async session, shared types
│   ├── models/                 # SQLAlchemy models (users, rbac, tokens, history, audit)
│   ├── modules/
│   │   ├── auth/               # registration, transactional login, refresh rotation, sessions
│   │   ├── accounts/           # admin actions + status state machine
│   │   ├── rbac/               # permission catalog, roles, seeding, resolution
│   │   └── audit.py            # append-only status-history & audit-log helpers
│   ├── api/
│   │   ├── deps.py             # DB, auth, and permission dependencies
│   │   ├── cookies.py          # refresh-token cookie helpers
│   │   └── v1/routes/          # health, auth, admin routers
│   └── scripts/                # admin bootstrap CLI, RBAC seed CLI
├── alembic/                    # async migration env + initial identity migration
├── tests/                      # unit, service, and PostgreSQL concurrency tests
├── docker/entrypoint.sh
├── Dockerfile
├── pyproject.toml
├── alembic.ini
├── .env.example
└── INTEGRATION_NOTES.md        # exact root Compose / env / CI changes needed
```

## Quick start (local)

```bash
cd backend
python -m venv .venv && . .venv/Scripts/activate   # Windows; use bin/activate on POSIX
pip install -e ".[dev]"

cp .env.example .env            # then set LEO_DATABASE_URL and a REAL LEO_JWT_SECRET_KEY
# LEO_JWT_SECRET_KEY is required in every environment; the app refuses to start
# with an unset/placeholder value. Generate one:
#   python -c "import secrets; print(secrets.token_urlsafe(48))"

# Apply migrations (requires a running PostgreSQL 16)
alembic upgrade head

# Seed the role/permission catalog so registration can assign default roles.
python -m app.scripts.seed_rbac

# (Optional) create the first administrator (also seeds RBAC; prompts or uses env)
ADMIN_USERNAME=superadmin ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='<strong-pass>' \
  python -m app.scripts.bootstrap_admin

# Run the API
uvicorn app.main:app --reload
```

> In the container, `RUN_MIGRATIONS=1` runs `alembic upgrade head` **and** the
> idempotent RBAC seed on start; either failing aborts startup with a nonzero
> exit, so a freshly migrated install can always register. `BOOTSTRAP_ADMIN=1`
> optionally creates the first admin and does not swallow errors.

- Swagger UI: `http://localhost:8000/api/v1/docs`
- OpenAPI JSON: `http://localhost:8000/api/v1/openapi.json`
- Liveness: `GET /api/v1/health/live` · Readiness (DB check): `GET /api/v1/health/ready`

### With Docker

The backend image runs Gunicorn+Uvicorn and can optionally migrate and bootstrap
on start:

```bash
docker build -t leo-portal-backend backend
docker run --rm -p 8000:8000 \
  -e LEO_DATABASE_URL=postgresql+asyncpg://leo:leo@host.docker.internal:5432/leo_portal \
  -e LEO_JWT_SECRET_KEY=$(python -c "import secrets;print(secrets.token_urlsafe(48))") \
  -e RUN_MIGRATIONS=1 -e BOOTSTRAP_ADMIN=1 \
  -e ADMIN_USERNAME=superadmin -e ADMIN_EMAIL=admin@example.com -e ADMIN_PASSWORD='<strong-pass>' \
  leo-portal-backend
```

See `INTEGRATION_NOTES.md` for the root `docker-compose.yml` / `.env.example` /
CI additions (these are owned by the INTEGRATION lane and are documented, not
applied here).

## API surface (Phase 1)

Authentication & profile (`/api/v1`):

```
POST /auth/register/buyer      POST /auth/register/vendor
POST /auth/login               POST /auth/refresh
POST /auth/logout              POST /auth/logout-all
POST /auth/change-password     GET  /auth/me
GET  /auth/sessions            DELETE /auth/sessions/{session_id}
```

Administrator account governance (`/api/v1/admin`, permission-gated):

```
GET  /dashboard/account-summary
GET  /users                    GET  /users/{id}
POST /users/{id}/approve       POST /users/{id}/reject
POST /users/{id}/lock          POST /users/{id}/unlock
POST /users/{id}/suspend       POST /users/{id}/reactivate
POST /users/{id}/disable       POST /users/{id}/reset-password
GET  /users/{id}/login-attempts
GET  /users/{id}/status-history
GET  /audit-logs
```

Every administrator mutation **requires a `reason`** and returns the new status,
action timestamp, and an audit reference. Responses use a consistent error
envelope: `{"error": {"code", "message", "details?", "request_id"}}`.

### Auth contract (browser-safe)

- **Registration** requires the company profile. Buyer body:
  `{username, email, password, company_name, contact_name, phone, country}`.
  Vendor body adds `supply_categories: [..]` (non-empty). Unexpected fields are
  **rejected** with `422` (not silently dropped). The user and its company
  profile (`business_clients` / `vendors`) are created in one transaction.
- **Login / refresh** return the access token plus the **complete current-user
  object** (`user`: id, username, email, user_type, status, company_name, roles,
  permissions, must_change_password, …). The refresh token is **never** in the
  JSON body — it is delivered only as an `HttpOnly`, `SameSite=Lax` cookie scoped
  to `/api/v1/auth` (`Secure` in staging/production).
- `POST /auth/refresh` and `POST /auth/logout` accept **no body** (cookie-only
  browser flow); they do not `422` when the body is empty. Refresh rotation and
  replay-family-revocation are preserved.
- **Change password** is **session-invalidating**: it revokes all sessions,
  bumps `auth_version`, clears the refresh cookie, and returns
  `{"message": "Password changed. Please log in again."}` — the client must
  re-authenticate.
- Pages use the envelope `{"items": [...], "meta": {page, page_size,
  total_items, total_pages}}`. The admin summary includes
  `registered_last_7_days`. Admin `/users` supports `?q=` (username/email/company)
  and `?company=` (company-name filter); `company_name` appears in the user
  summary and detail.

## Security model (summary)

- **Registration** creates buyer/vendor accounts as `PENDING_APPROVAL`, together
  with their company profile (`business_clients` for buyers, `vendors` for
  vendors) in a single atomic transaction. The correct profile is enforced per
  user type and unexpected request fields are rejected. Public admin
  registration is refused.
- **JWT signing key** (`LEO_JWT_SECRET_KEY`) is **required in every
  environment**. An unset/empty/placeholder value fails startup immediately
  (fail-closed), even in development; staging/production additionally require
  >= 32 characters.
- **Client IP** for audit records defaults to the direct socket peer;
  `X-Forwarded-For` is honoured only when `LEO_TRUST_FORWARDED_FOR=true` (behind
  a trusted proxy), reading the `LEO_TRUSTED_PROXY_HOPS`-th entry from the right.
- **Login** is transactional: the user row is `SELECT ... FOR UPDATE`-locked so
  concurrent wrong-password attempts serialize and the account locks *exactly
  once* on the third failure. A successful active login resets the counter.
  Unknown identifiers are verified against a dummy Argon2id hash to equalise
  timing. Only `ACTIVE` accounts receive tokens; a correct password on a
  non-active account returns a status-specific (non-enumerating) error.
- **Tokens:** short-lived JWT access tokens (carry `auth_version` + forced-change
  flag + roles); opaque refresh tokens stored only as SHA-256 hashes, rotated on
  every refresh, tracked by family. Reusing a rotated token revokes the whole
  family.
- **auth_version** is bumped (and sessions revoked) on lock, suspend, disable,
  reject, password change, and admin reset — invalidating outstanding access
  tokens immediately.
- **Admin password reset** issues a one-time temporary password (returned once,
  hashed at rest, expiring), sets `must_change_password`, and **never** changes
  account status. Forced-change sessions are restricted to change-password and
  logout.
- **Audit:** every transition writes immutable `account_status_history` and an
  append-only `admin_audit_logs` row (actor, reason, target, request id, IP).
- Passwords, tokens, and secrets are redacted from logs and never returned.

See the account state machine in `app/modules/accounts/transitions.py` and the
roadmap for full transition rules.

## Verification

```bash
ruff check app tests          # lint
mypy app                      # type check
pytest -q                     # unit + service tests (SQLite; PG tests auto-skip)

# PostgreSQL concurrency + migration tests:
export TEST_DATABASE_URL=postgresql+asyncpg://leo:leo@localhost:5432/leo_test
pytest -q                     # runs the lockout/refresh race tests too
```

Identity-service coverage (auth/accounts/rbac) is ≥ 90% with branch coverage
reported (see `pyproject.toml [tool.coverage]`).

## Known limitations / deferred

- Phase 2+ domains (companies, profiles, catalog, trade, logistics, finance) are
  out of scope and not implemented.
- No rate limiting / trusted-host / TLS termination in-app — these are Phase 8
  hardening concerns and belong at the edge/compose layer (noted in
  `INTEGRATION_NOTES.md`).
- `email`/OTP verification, self-service forgot-password, and 2FA are explicitly
  excluded per the approved roadmap.
- A compromised-password deny-list hook is defined by policy but not wired to an
  offline list yet.
