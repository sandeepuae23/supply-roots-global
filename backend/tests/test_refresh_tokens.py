"""Refresh-token rotation, replay detection, and password-change revocation."""

from __future__ import annotations

import pytest
from sqlalchemy import func, select

from app.core.errors import AuthenticationError, ConflictError
from app.models.refresh_token import RefreshToken
from app.modules.auth import service as auth_service
from tests.helpers import DEFAULT_PASSWORD, make_user

pytestmark = pytest.mark.asyncio


async def _login(db) -> auth_service.IssuedTokens:
    await make_user(db, username="refresher", email="refresher@example.com")
    return await auth_service.authenticate(db, identifier="refresher", password=DEFAULT_PASSWORD)


async def test_rotation_issues_new_and_revokes_old(db, seeded) -> None:
    issued = await _login(db)
    first = issued.refresh_token
    rotated = await auth_service.refresh(db, presented_value=first)
    assert rotated.refresh_token != first
    # The original token is now revoked; presenting it again is replay.
    with pytest.raises(AuthenticationError) as exc:
        await auth_service.refresh(db, presented_value=first)
    assert exc.value.code == "token_reuse_detected"


async def test_replay_revokes_entire_family(db, seeded) -> None:
    issued = await _login(db)
    r1 = issued.refresh_token
    rotated = await auth_service.refresh(db, presented_value=r1)
    r2 = rotated.refresh_token
    # Replay the old token → family revoked.
    with pytest.raises(AuthenticationError):
        await auth_service.refresh(db, presented_value=r1)
    # Now even the (previously valid) rotated token is dead.
    with pytest.raises(AuthenticationError):
        await auth_service.refresh(db, presented_value=r2)
    active = await db.scalar(
        select(func.count()).select_from(RefreshToken).where(RefreshToken.revoked_at.is_(None))
    )
    assert active == 0


async def test_logout_revokes_current_session(db, seeded) -> None:
    issued = await _login(db)
    await auth_service.logout(db, user=issued.user, presented_value=issued.refresh_token)
    with pytest.raises(AuthenticationError):
        await auth_service.refresh(db, presented_value=issued.refresh_token)


async def test_logout_all_revokes_every_session(db, seeded) -> None:
    await make_user(db, username="multi", email="multi@example.com")
    a = await auth_service.authenticate(db, identifier="multi", password=DEFAULT_PASSWORD)
    await auth_service.authenticate(db, identifier="multi", password=DEFAULT_PASSWORD)
    count = await auth_service.logout_all(db, user=a.user)
    assert count == 2
    with pytest.raises(AuthenticationError):
        await auth_service.refresh(db, presented_value=a.refresh_token)


async def test_change_password_bumps_auth_version_and_revokes(db, seeded) -> None:
    issued = await _login(db)
    before = issued.user.auth_version
    await auth_service.change_password(
        db,
        user_id=issued.user.id,
        current_password=DEFAULT_PASSWORD,
        new_password="a-brand-new-password-99",
    )
    await db.refresh(issued.user)
    assert issued.user.auth_version == before + 1
    # Old refresh session is revoked.
    with pytest.raises(AuthenticationError):
        await auth_service.refresh(db, presented_value=issued.refresh_token)
    # Old password no longer works; new one does.
    with pytest.raises(AuthenticationError):
        await auth_service.authenticate(db, identifier="refresher", password=DEFAULT_PASSWORD)
    ok = await auth_service.authenticate(
        db, identifier="refresher", password="a-brand-new-password-99"
    )
    assert ok.access_token


async def test_change_password_rejects_reuse(db, seeded) -> None:
    issued = await _login(db)
    with pytest.raises(ConflictError):
        await auth_service.change_password(
            db,
            user_id=issued.user.id,
            current_password=DEFAULT_PASSWORD,
            new_password=DEFAULT_PASSWORD,
        )
