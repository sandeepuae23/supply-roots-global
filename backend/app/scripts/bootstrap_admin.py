"""Administrator bootstrap CLI.

Creates the first ``SUPER_ADMIN`` account and seeds the role/permission catalog.
Credentials are read securely from the environment (preferred for automation) or
interactively prompted; the password is never echoed or logged.

Usage::

    # from the backend/ directory, with the database migrated to head
    python -m app.scripts.bootstrap_admin
    # or via the console script
    bootstrap-admin

Environment variables (optional; prompted when absent):
    ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD
    ADMIN_MUST_CHANGE_PASSWORD=true|false  (default false)
"""

from __future__ import annotations

import argparse
import asyncio
import getpass
import os
import sys
from datetime import UTC, datetime

from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import dispose_engine, get_session_factory
from app.models.enums import AccountStatus, ActorType, AuditAction, UserType
from app.models.password_history import PasswordHistory
from app.models.user import User
from app.modules import audit
from app.modules.auth.service import normalize_email, normalize_username
from app.modules.rbac import service as rbac_service
from app.modules.rbac.constants import RoleName

# Validate the admin email with the SAME semantics the API user schemas use:
# their request/response models type the email field as ``pydantic.EmailStr``
# (see app.modules.auth.schemas). Bootstrapping an address those models later
# reject — e.g. a reserved special-use domain such as ``example.test`` — would
# insert an admin row that then crashes login response serialization (HTTP 500).
_EMAIL_ADAPTER = TypeAdapter(EmailStr)


def _validate_email(email: str) -> None:
    """Reject an admin email the API's ``EmailStr`` models would refuse.

    Raises ``SystemExit`` (non-zero) with a clear message so an invalid
    configuration fails loudly *before* any database row is written.
    """
    try:
        _EMAIL_ADAPTER.validate_python(email.strip())
    except ValidationError as exc:
        raise SystemExit(
            f"ADMIN_EMAIL {email!r} is not a valid email address; no admin was created."
        ) from exc


def _read_credential(name: str, env_var: str, *, secret: bool = False) -> str:
    value = os.environ.get(env_var)
    if value:
        return value
    if not sys.stdin.isatty():
        raise SystemExit(
            f"{env_var} is not set and no interactive terminal is available to prompt for {name}."
        )
    if secret:
        return getpass.getpass(f"{name}: ")
    return input(f"{name}: ").strip()


async def create_admin(
    *,
    username: str,
    email: str,
    password: str,
    must_change_password: bool = False,
) -> tuple[bool, str]:
    """Seed roles and create the super-admin. Returns (created, message)."""
    # Validate inputs BEFORE opening a session so an invalid configuration fails
    # loudly and leaves no partially-provisioned database.
    _validate_email(email)
    if len(password) < settings.password_min_length:
        raise SystemExit(
            f"Password must be at least {settings.password_min_length} characters."
        )

    factory = get_session_factory()
    async with factory() as session:
        await rbac_service.seed_roles_and_permissions(session)
        await session.commit()

        norm_user = normalize_username(username)
        norm_email = normalize_email(email)
        existing = await session.execute(
            select(User).where(
                (User.normalized_username == norm_user)
                | (User.normalized_email == norm_email)
            )
        )
        if existing.scalar_one_or_none() is not None:
            return False, (
                f"An account with username {username!r} or email {email!r} already exists."
            )

        now = datetime.now(UTC)
        admin = User(
            username=username.strip(),
            normalized_username=norm_user,
            email=email.strip(),
            normalized_email=norm_email,
            password_hash=hash_password(password),
            user_type=UserType.ADMIN,
            status=AccountStatus.ACTIVE,
            must_change_password=must_change_password,
            approved_at=now,
            password_changed_at=now,
        )
        session.add(admin)
        await session.flush()

        session.add(
            PasswordHistory(
                user_id=admin.id, password_hash=admin.password_hash, set_reason="BOOTSTRAP"
            )
        )
        await rbac_service.assign_role(
            session, user_id=admin.id, role_name=RoleName.SUPER_ADMIN
        )
        audit.record_status_history(
            session,
            user_id=admin.id,
            previous_status=None,
            new_status=AccountStatus.ACTIVE,
            reason="ADMIN_BOOTSTRAP",
            actor_type=ActorType.SYSTEM,
            actor_id=None,
        )
        audit.record_audit(
            session,
            action=AuditAction.REGISTER,
            actor_type=ActorType.SYSTEM,
            actor_id=None,
            target_user_id=admin.id,
            reason="ADMIN_BOOTSTRAP",
            context={"role": RoleName.SUPER_ADMIN},
        )
        await session.commit()
        return True, f"Created SUPER_ADMIN {username!r} ({email})."


async def _async_main(must_change_password: bool) -> int:
    username = _read_credential("Admin username", "ADMIN_USERNAME")
    email = _read_credential("Admin email", "ADMIN_EMAIL")
    password = _read_credential("Admin password", "ADMIN_PASSWORD", secret=True)
    try:
        _, message = await create_admin(
            username=username,
            email=email,
            password=password,
            must_change_password=must_change_password,
        )
    finally:
        await dispose_engine()
    # Both "created" and "already exists" are idempotent successes (exit 0). Only
    # genuine errors (validation, DB, missing credentials) raise and exit nonzero,
    # so container startup is not aborted by re-running an already-provisioned DB.
    print(message)
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Bootstrap the first administrator account.")
    parser.add_argument(
        "--must-change-password",
        action="store_true",
        default=os.environ.get("ADMIN_MUST_CHANGE_PASSWORD", "false").lower() == "true",
        help="Force the admin to change the password on first login.",
    )
    args = parser.parse_args()
    raise SystemExit(asyncio.run(_async_main(args.must_change_password)))


if __name__ == "__main__":
    main()
