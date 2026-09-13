# Phase 1 — Implementation sign-off

| Field | Value |
| --- | --- |
| Phase | 1 — Authentication, approval, and RBAC |
| Reviewed commit / tree | working tree on `v5`, base `e18799d` |
| Environment | local Docker Desktop, `portal` compose profile |
| Date | 13 September 2026 |
| Result | **APPROVED for commit** |

This records implementation review of Phase 1. It is distinct from the
planning sign-off in `portal-backend-roadmap.md` section 18, which approved
the roadmap only.

## Scope reviewed

- `backend/` — 83 tracked files: FastAPI app, SQLAlchemy models, two Alembic
  migrations, RBAC seed, admin bootstrap, 20 test modules.
- Frontend — 21 portal routes, `src/lib/api/` (7 files), `src/lib/auth/`
  (5 files), `src/components/portal/` (14 files), 8 test files.
- INTEGRATION — root `docker-compose.yml`, `.env.example`, `.dockerignore`,
  `.gitignore`, `.github/workflows/ci.yml`.

## Evidence

### Automated tests

| Suite | Result |
| --- | --- |
| Backend unit + API (`pytest`) | **130 passed**, 7 skipped |
| Backend PostgreSQL concurrency (`TEST_DATABASE_URL` set, PG 16) | **7 passed** |
| Frontend (`bun test`) | **54 passed**, 0 failed, 202 assertions |
| **Total** | **191 passing** |

The 7 concurrency tests are skipped by default and were run explicitly against
the live PostgreSQL 16 container. They are the gate for the transactional
lockout and refresh-rotation claims, so a run where they skip is not evidence.

### Combined-stack API verification (live, not mocked)

| Check | Result |
| --- | --- |
| `db → api` startup ordering | `db Waiting → Healthy → api Starting` |
| `/api/v1/health/live`, `/health/ready` | 200, 200 |
| OpenAPI schema | 200, **26 endpoints** |
| `/auth/me`, `/admin/users`, `/auth/sessions` unauthenticated | 401, 401, 401 |
| Unknown identifier vs. wrong password | Identical body and code; 0.40s vs 0.34s — dummy Argon2id verification confirmed, no user enumeration |
| Registration | 201, status `PENDING_APPROVAL` |
| Login before approval | 403 `account_pending_approval` |
| Double approval | 409 `invalid_state_transition` |
| `suspend` / `lock` / `disable` without reason | **422 / 422 / 422** |
| Admin approve | 200, audit record carries reason |

### Frontend verification

All portal routes server-render: `/login`, `/register`, `/register/buyer`,
`/register/vendor`, `/account/pending`, `/account/locked`,
`/change-temporary-password` return 200. Protected roots `/admin`, `/buyer`,
`/vendor` return **307** to login when unauthenticated. Pre-existing public
site (`/`, `/products`, `/quality`) unaffected.

## Roadmap commitments verified in code

- Argon2id hashing via `argon2-cffi`; fixed dummy hash verified for unknown
  identifiers (`app/core/security.py`).
- Transactional lockout: user row selected `FOR UPDATE` so concurrent failures
  serialize and lock exactly once on threshold (`modules/auth/service.py`).
- `auth_version` incremented and sessions revoked on system lock.
- Refresh tokens persisted as `token_hash` only, never in plaintext.
- `LEO_JWT_SECRET_KEY` fails closed at startup — unset, empty and placeholder
  values rejected in every environment, >= 32 chars required in production
  (`app/core/config.py::_validate_secrets`).
- Migrations run from the container entrypoint under `set -eu`, not implied by
  compose health ordering; a failed upgrade exits non-zero.
- Access token held in memory only — no `localStorage`/`sessionStorage`.
- Post-login redirect guarded by an allowlist against open redirect
  (`src/lib/auth/safe-redirect.ts`).

## Findings — accepted, no change required

1. **`approve` defaults `reason` to `REGISTRATION_VERIFIED`** while `suspend`,
   `lock` and `disable` reject a missing reason with 422. This matches roadmap
   section 9 ("Approval can use a controlled reason such as
   `REGISTRATION_VERIFIED`") and the audit record always carries a reason. It is
   looser than the one-line summary in section 18 ("mandatory for every account
   action"). **Recommendation:** reword section 18 to match section 9 rather
   than tighten the code, so the two documents agree.

2. **Backend env vars are `LEO_`-prefixed.** Deliberate — it stops the service
   consuming generic host variables (`HOST`, `PORT`, `DEBUG`). Root compose and
   `.env.example` were aligned to match `backend/.env.example`.

## Carried forward

- **`tmp/` — 103 tracked files** (build logs, scratch JSON, pipeline scripts)
  remain tracked. Now git-ignored for new files; untracking the existing ones is
  a separate reviewed task.
- **`.env` was not git-ignored** before this phase; a rule was added. No real
  `.env` was ever committed.
- **CI `web-format` job is advisory** (`continue-on-error: true`) — roughly 151
  pre-existing `prettier/prettier` violations. Flip to required after a repo-wide
  `bun run format`.
- Both Phase 1 worktrees remain at `9d5f82d` and are now stale; the work was
  merged into `v5` directly. They can be removed.
