"""First-admin bootstrap: email validation, creation, and idempotency.

These exercise ``app.scripts.bootstrap_admin.create_admin`` against the shared
in-memory SQLite session factory (patched in via ``get_session_factory``). The
key regression guarded here: an ``ADMIN_EMAIL`` the API's ``EmailStr`` models
would reject (e.g. the reserved ``example.test`` domain) must fail before any
row is written — otherwise the row later crashes login serialization (HTTP 500).
"""

from __future__ import annotations

import pytest
from sqlalchemy import func, select

from app.models.enums import AccountStatus, UserType
from app.models.user import User
from app.modules.rbac import service as rbac_service
from app.modules.rbac.constants import RoleName
from app.scripts import bootstrap_admin

pytestmark = pytest.mark.asyncio

_VALID_EMAIL = "acceptance-admin@example.com"
_INVALID_EMAIL = "acceptance-admin@example.test"  # reserved special-use domain
_PASSWORD = "a-strong-password-123"


@pytest.fixture
def factory(session_factory, monkeypatch):
    """Point the bootstrap script at the test's in-memory session factory."""
    monkeypatch.setattr(bootstrap_admin, "get_session_factory", lambda: session_factory)
    return session_factory


async def _count_users(factory) -> int:
    async with factory() as session:
        return await session.scalar(select(func.count()).select_from(User))


async def test_valid_email_creates_super_admin(factory) -> None:
    created, message = await bootstrap_admin.create_admin(
        username="rootadmin", email=_VALID_EMAIL, password=_PASSWORD
    )
    assert created is True
    assert _VALID_EMAIL in message

    async with factory() as session:
        user = await session.scalar(
            select(User).where(User.normalized_email == _VALID_EMAIL)
        )
        assert user is not None
        assert user.user_type == UserType.ADMIN
        assert user.status == AccountStatus.ACTIVE
        roles = await rbac_service.get_user_role_names(session, user.id)
        assert RoleName.SUPER_ADMIN in roles


async def test_bootstrap_is_idempotent(factory) -> None:
    first, _ = await bootstrap_admin.create_admin(
        username="rootadmin", email=_VALID_EMAIL, password=_PASSWORD
    )
    second, message = await bootstrap_admin.create_admin(
        username="rootadmin", email=_VALID_EMAIL, password=_PASSWORD
    )
    assert first is True
    assert second is False
    assert "already exists" in message
    # No second row was created.
    assert await _count_users(factory) == 1


async def test_invalid_email_fails_before_persistence(factory) -> None:
    with pytest.raises(SystemExit) as excinfo:
        await bootstrap_admin.create_admin(
            username="rootadmin", email=_INVALID_EMAIL, password=_PASSWORD
        )
    # Clear, non-zero failure that names the offending address.
    assert excinfo.value.code != 0
    assert _INVALID_EMAIL in str(excinfo.value)
    # Critically: no admin row was written.
    assert await _count_users(factory) == 0
