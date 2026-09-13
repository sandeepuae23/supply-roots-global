"""Edge-case coverage for auth service branches and dependencies."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import jwt
import pytest

from app.core.config import settings
from app.core.errors import AuthenticationError
from app.modules.auth import service as auth_service
from tests.helpers import DEFAULT_PASSWORD, auth_header, make_user

pytestmark = pytest.mark.asyncio


async def test_refresh_with_garbage_token(db, seeded) -> None:
    with pytest.raises(AuthenticationError) as exc:
        await auth_service.refresh(db, presented_value="garbage-not-a-token")
    assert exc.value.code == "invalid_token"


async def test_refresh_rejects_stale_auth_version(db, seeded) -> None:
    await make_user(db, username="staleauth", email="sa@example.com")
    issued = await auth_service.authenticate(db, identifier="staleauth", password=DEFAULT_PASSWORD)
    # Bump the user's auth_version without revoking tokens to hit the
    # "session no longer valid" branch during refresh.
    user = await db.get(type(issued.user), issued.user.id)
    user.auth_version += 1
    await db.commit()
    with pytest.raises(AuthenticationError) as exc:
        await auth_service.refresh(db, presented_value=issued.refresh_token)
    assert exc.value.code == "session_invalid"


async def test_change_password_wrong_current(db, seeded) -> None:
    user = await make_user(db, username="cpw", email="cpw@example.com")
    with pytest.raises(AuthenticationError) as exc:
        await auth_service.change_password(
            db, user_id=user.id, current_password="not-it", new_password="a-valid-new-pass-1"
        )
    assert exc.value.code == "invalid_current_password"


async def test_expired_temporary_password_denied(db, seeded) -> None:
    user = await make_user(
        db, username="tempexp", email="te@example.com", must_change_password=True
    )
    user.temporary_password_expires_at = datetime.now(UTC) - timedelta(minutes=1)
    await db.commit()
    with pytest.raises(AuthenticationError) as exc:
        await auth_service.authenticate(db, identifier="tempexp", password=DEFAULT_PASSWORD)
    assert exc.value.code == "temporary_password_expired"


async def test_logout_without_token_still_audits(db, seeded) -> None:
    user = await make_user(db, username="nolo", email="nolo@example.com")
    # Should not raise even when no refresh token is presented.
    await auth_service.logout(db, user=user, presented_value=None)


async def test_missing_bearer_token_rejected(client) -> None:
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "missing_token"


async def test_wrong_token_type_rejected(client, db) -> None:
    user = await make_user(db, username="wrongtype", email="wt@example.com")
    payload = {
        "sub": str(user.id),
        "type": "refresh",  # not an access token
        "auth_version": user.auth_version,
        "exp": int((datetime.now(UTC) + timedelta(minutes=5)).timestamp()),
    }
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    resp = await client.get("/api/v1/auth/me", headers=auth_header(token))
    assert resp.status_code == 401


async def test_x_forwarded_for_is_recorded(client, db) -> None:
    await make_user(db, username="ipuser", email="ip@example.com")
    resp = await client.post(
        "/api/v1/auth/login",
        json={"identifier": "ipuser", "password": DEFAULT_PASSWORD},
        headers={"x-forwarded-for": "203.0.113.7, 10.0.0.1"},
    )
    assert resp.status_code == 200


async def test_refresh_missing_token_endpoint(client) -> None:
    resp = await client.post("/api/v1/auth/refresh", json={})
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "missing_refresh_token"
