#!/usr/bin/env sh
# Fail closed: any failing step below aborts container startup with a nonzero
# exit code. `set -e` (errexit) + `set -u` (nounset) guarantee we never start
# the server on a half-provisioned database.
set -eu

# Optionally apply database migrations and seed the RBAC catalog before serving.
# Enable by setting RUN_MIGRATIONS=1 in the container environment. Both the
# migration and the (idempotent) RBAC seed MUST succeed; a failure in either
# stops startup with a nonzero exit so a fresh installation can always register.
if [ "${RUN_MIGRATIONS:-0}" = "1" ]; then
  echo "[entrypoint] Running Alembic migrations to head..."
  alembic upgrade head
  echo "[entrypoint] Seeding RBAC roles and permissions (idempotent)..."
  python -m app.scripts.seed_rbac
fi

# Optionally bootstrap the first administrator if BOOTSTRAP_ADMIN=1 is set.
# This is idempotent (skips if the account already exists) but does NOT swallow
# failures: a genuine error (e.g. bad credentials, DB error) aborts startup.
if [ "${BOOTSTRAP_ADMIN:-0}" = "1" ]; then
  echo "[entrypoint] Bootstrapping administrator (idempotent)..."
  python -m app.scripts.bootstrap_admin
fi

exec "$@"
