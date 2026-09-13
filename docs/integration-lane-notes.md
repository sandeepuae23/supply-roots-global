# INTEGRATION lane — notes for the Phase 0/1 agents

Owner: INTEGRATION (root `docker-compose.yml`, root `.env.example`, root
docs/scripts, CI workflow files), per the lane table in
`portal-phase-task-breakdown.md`.

These are contracts the backend and frontend lanes should build against, so
integration is a merge rather than a rewrite.

## Service contract

| Service | Image / build | Container port | Host port (default) |
| --- | --- | --- | --- |
| `web` | root `Dockerfile` (existing site) | 3000 | `WEB_PORT`, 3100 |
| `api` | `backend/Dockerfile` — **BE-FOUNDATION owns this file** | 8000 | `API_PORT`, 8000 |
| `db` | `postgres:16-alpine` | 5432 | `DB_PORT`, 5433 |

The portal services sit behind the `portal` compose profile, so the existing
site keeps starting with a plain `docker compose up -d` while `backend/` does
not exist yet. Start the full stack with:

    docker compose --profile portal up -d --build

## What the backend lane needs to provide

> Contract corrected after acceptance review to match the backend worktree
> (`app/core/config.py`, `docker/entrypoint.sh`, `app/api/v1/routes/health.py`,
> `app/scripts/bootstrap_admin.py`). Backend settings are **`LEO_`-namespaced**
> (`env_prefix="LEO_"`), so root compose and CI pass `LEO_`-prefixed variables.

- `backend/Dockerfile` exposing **8000**. Compose builds `context: ./backend`.
- `backend/pyproject.toml` with a `[dev]` extra (CI runs `pip install -e ".[dev]"`).
  Its presence is what switches the backend CI gates on — they are skipped
  until then, so CI stays green in the meantime.
- A **`GET /api/v1/health/live`** liveness endpoint returning 200 (there is also
  `GET /api/v1/health/ready` for DB readiness). The compose healthcheck calls
  the `live` path with stdlib `urllib`, so no curl is needed in the image. The
  API is mounted under `LEO_` config's `api_v1_prefix` (`/api/v1`), which also
  serves `/api/v1/openapi.json`, `/api/v1/docs`, and `/api/v1/redoc`.
- **Migrations run from the backend container's startup command**, gated on
  `RUN_MIGRATIONS=1` (compose sets this for the `api` service). Compose's
  `depends_on: db: condition: service_healthy` is *ordering only* - it
  guarantees the API does not start against a server that is refusing
  connections, and nothing more. **It does not apply migrations.** The
  entrypoint (`docker/entrypoint.sh`) runs `alembic upgrade head` under
  `set -e`, so a failed upgrade exits non-zero and the container fails rather
  than serving a running API on a stale schema.
- Reading config from the **`LEO_`-prefixed** environment variables in root
  `.env.example`: `LEO_DATABASE_URL` (async DSN `postgresql+asyncpg://...`,
  also consumed by Alembic's `env.py`), `LEO_JWT_SECRET_KEY`,
  `LEO_ACCESS_TOKEN_EXPIRE_MINUTES`, `LEO_REFRESH_TOKEN_EXPIRE_DAYS`,
  `LEO_CORS_ALLOW_ORIGINS`, and `LEO_ENVIRONMENT`.
- **Startup validation that refuses to boot with a weak/empty
  `LEO_JWT_SECRET_KEY`** in staging/production. Compose deliberately defaults it
  to empty rather than a dev fallback, because a baked-in default signing key is
  exactly the kind of thing that reaches production. Compose cannot enforce this
  (a `${VAR:?}` required-variable marker breaks interpolation for every profile,
  including the site-only default), so the check lives in backend settings
  validation and fails closed at startup.
- **Optional first-admin bootstrap**, gated on `BOOTSTRAP_ADMIN=1`. When set,
  the entrypoint runs `python -m app.scripts.bootstrap_admin` (idempotent),
  which reads `ADMIN_USERNAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. Left off
  (`BOOTSTRAP_ADMIN=0`) by default so the portal starts without seeding an admin.
- A single Alembic head. CI asserts `alembic heads` returns exactly one, which
  catches competing heads from parallel lanes (task-breakdown rule 3).

## What the frontend lane needs to know

- The API is reachable at `http://localhost:8000` from the host, and at
  `http://api:8000` from inside the compose network.
- `LEO_CORS_ALLOW_ORIGINS` defaults to `http://localhost:3100` — the site's
  host port, not 3000. If you change `WEB_PORT`, change this too.
- There is already a server-side request pattern in this repo worth copying
  rather than reinventing: `src/lib/quote.server.ts` uses `createServerFn`, and
  `src/start.ts` wires `createCsrfMiddleware` filtered to `handlerType ===
  "serverFn"`. Decide deliberately whether portal calls go browser-to-FastAPI
  or proxy through server functions — the CSRF posture differs.

## Known integration risks

1. **Both worktrees branched from `9d5f82d`**, which is 7 commits behind the
   current work. They do not contain the Docker setup, the current
   `styles.css`, `home-experience.css`, `quality-*.css`, or
   `src/lib/quote.server.ts`. Frontend work styled against that base will
   conflict on merge.
2. **`package.json` is shared.** If the frontend lane needs a dependency, note
   it for INTEGRATION rather than running `bun add` in a worktree — two lanes
   editing `package.json`/`bun.lock` is the classic worktree conflict.
3. **`src/routeTree.gen.ts` is generated** and is assigned to `FE-FOUNDATION`.
   It will churn whenever routes are added; regenerate rather than hand-merge.
