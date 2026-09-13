"""Regression tests for the acceptance-review corrections.

Covers: JWT secret fail-closed validation, trusted-proxy client-IP handling,
login-attempt request-id capture, active-session expiry exclusion, admin company
search/filter, the ``registered_last_7_days`` summary metric, and the
session-invalidating password-change contract.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from app.api.deps import get_client_ip
from app.core.config import Settings
from app.core.context import set_request_id
from app.models.login_attempt import LoginAttempt
from app.models.refresh_token import RefreshToken
from app.modules.accounts import service as accounts_service
from app.modules.auth import service as auth_service
from app.modules.auth import tokens as token_ops
from tests.helpers import DEFAULT_PASSWORD, auth_header, login, make_admin, make_user

# NOTE: no module-level asyncio mark — this module mixes sync (config/IP) and
# async (service/API) tests; asyncio_mode="auto" handles the async ones.

_STRONG_SECRET = "a" * 40


# --------------------------------------------------------------------------- #
# Blocker 1 — JWT signing secret fails closed everywhere
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize(
    "bad_secret",
    ["", "   ", "change-me-in-non-development-environments", "secret", "changeme"],
)
def test_empty_or_placeholder_jwt_secret_rejected_in_development(bad_secret: str) -> None:
    with pytest.raises(ValueError, match="LEO_JWT_SECRET_KEY"):
        Settings(environment="development", jwt_secret_key=bad_secret)


def test_short_secret_rejected_in_production() -> None:
    with pytest.raises(ValueError, match="at least 32"):
        Settings(environment="production", jwt_secret_key="tooshort")


def test_strong_secret_accepted() -> None:
    s = Settings(environment="production", jwt_secret_key=_STRONG_SECRET)
    assert s.jwt_secret_key == _STRONG_SECRET


# --------------------------------------------------------------------------- #
# Blocker 7 — do not blindly trust X-Forwarded-For
# --------------------------------------------------------------------------- #
class _FakeClient:
    def __init__(self, host: str) -> None:
        self.host = host


class _FakeRequest:
    def __init__(self, *, peer: str, xff: str | None = None) -> None:
        self.client = _FakeClient(peer)
        self.headers = {"x-forwarded-for": xff} if xff else {}


def test_client_ip_ignores_forwarded_for_by_default(monkeypatch) -> None:
    from app.api import deps

    monkeypatch.setattr(deps.settings, "trust_forwarded_for", False)
    req = _FakeRequest(peer="10.0.0.5", xff="1.2.3.4, 5.6.7.8")
    assert get_client_ip(req) == "10.0.0.5"  # spoofable header ignored


def test_client_ip_uses_trusted_hop_when_enabled(monkeypatch) -> None:
    from app.api import deps

    monkeypatch.setattr(deps.settings, "trust_forwarded_for", True)
    monkeypatch.setattr(deps.settings, "trusted_proxy_hops", 1)
    # With one trusted hop, the client IP is the last (right-most) XFF entry,
    # which the outermost trusted proxy appended.
    req = _FakeRequest(peer="10.0.0.5", xff="1.2.3.4, 203.0.113.9")
    assert get_client_ip(req) == "203.0.113.9"


def test_client_ip_falls_back_to_peer_without_header(monkeypatch) -> None:
    from app.api import deps

    monkeypatch.setattr(deps.settings, "trust_forwarded_for", True)
    req = _FakeRequest(peer="10.0.0.5", xff=None)
    assert get_client_ip(req) == "10.0.0.5"


# --------------------------------------------------------------------------- #
# Blocker 7 — login attempts capture the request id
# --------------------------------------------------------------------------- #
async def test_login_attempt_records_request_id(db, seeded) -> None:
    set_request_id("req-abc-123")
    await make_user(db, username="ripuser", email="rip@example.com")
    await auth_service.authenticate(db, identifier="ripuser", password=DEFAULT_PASSWORD)
    attempt = await db.scalar(
        select(LoginAttempt).where(LoginAttempt.identifier == "ripuser")
    )
    assert attempt is not None
    assert attempt.request_id == "req-abc-123"


# --------------------------------------------------------------------------- #
# Blocker 7 — active sessions exclude expired tokens
# --------------------------------------------------------------------------- #
async def test_active_sessions_exclude_expired(db, seeded) -> None:
    await make_user(db, username="expsess", email="es@example.com")
    issued = await auth_service.authenticate(db, identifier="expsess", password=DEFAULT_PASSWORD)
    active = await token_ops.list_active_sessions(db, user_id=issued.user.id)
    assert len(active) == 1
    # Force the token to be expired.
    token = await db.scalar(select(RefreshToken).where(RefreshToken.user_id == issued.user.id))
    token.expires_at = datetime.now(UTC) - timedelta(days=1)
    await db.commit()
    active_after = await token_ops.list_active_sessions(db, user_id=issued.user.id)
    assert active_after == []


# --------------------------------------------------------------------------- #
# Blocker 2 — admin company search/filter and company_name exposure
# --------------------------------------------------------------------------- #
async def test_admin_company_search_and_filter(client, db) -> None:
    await make_admin(db)
    token = (await login(client, "root_admin")).json()["access_token"]
    # Register a buyer with a distinctive company name.
    await client.post(
        "/api/v1/auth/register/buyer",
        json={
            "username": "searchbuyer",
            "email": "sb@example.com",
            "password": DEFAULT_PASSWORD,
            "company_name": "Zephyr Global Imports",
            "contact_name": "Zed",
            "phone": "+15550002222",
            "country": "USA",
        },
    )
    # ?company= filters by company name substring.
    by_company = await client.get(
        "/api/v1/admin/users?company=zephyr", headers=auth_header(token)
    )
    assert by_company.status_code == 200
    names = [u["username"] for u in by_company.json()["items"]]
    assert "searchbuyer" in names
    assert by_company.json()["items"][0]["company_name"] == "Zephyr Global Imports"
    # Free-text q also matches company name.
    by_q = await client.get("/api/v1/admin/users?q=zephyr", headers=auth_header(token))
    assert "searchbuyer" in [u["username"] for u in by_q.json()["items"]]


async def test_admin_user_detail_includes_company_name(client, db) -> None:
    await make_admin(db)
    token = (await login(client, "root_admin")).json()["access_token"]
    reg = await client.post(
        "/api/v1/auth/register/vendor",
        json={
            "username": "detailvendor",
            "email": "dv@example.com",
            "password": DEFAULT_PASSWORD,
            "company_name": "Detail Vendor GmbH",
            "contact_name": "Dee",
            "phone": "+15550003333",
            "country": "Germany",
            "supply_categories": ["Machinery"],
        },
    )
    user_id = reg.json()["id"]
    detail = await client.get(f"/api/v1/admin/users/{user_id}", headers=auth_header(token))
    assert detail.status_code == 200
    assert detail.json()["company_name"] == "Detail Vendor GmbH"


# --------------------------------------------------------------------------- #
# Blocker 5 — registered_last_7_days in the admin summary
# --------------------------------------------------------------------------- #
async def test_summary_registered_last_7_days(db, seeded) -> None:
    await make_user(db, username="recent", email="recent@example.com")
    summary = await accounts_service.account_summary(db)
    assert "registered_last_7_days" in summary
    assert summary["registered_last_7_days"] >= 1


async def test_summary_endpoint_exposes_new_metric(client, db) -> None:
    await make_admin(db)
    token = (await login(client, "root_admin")).json()["access_token"]
    resp = await client.get(
        "/api/v1/admin/dashboard/account-summary", headers=auth_header(token)
    )
    assert resp.status_code == 200
    assert "registered_last_7_days" in resp.json()


# --------------------------------------------------------------------------- #
# Blocker 4 — password change invalidates sessions and requires re-login
# --------------------------------------------------------------------------- #
async def test_change_password_endpoint_message_and_invalidates(client, db) -> None:
    await make_user(db, username="pwchange", email="pw@example.com")
    login_resp = await login(client, "pwchange")
    token = login_resp.json()["access_token"]
    resp = await client.post(
        "/api/v1/auth/change-password",
        json={"current_password": DEFAULT_PASSWORD, "new_password": "brand-new-password-42"},
        headers=auth_header(token),
    )
    assert resp.status_code == 200
    assert resp.json()["message"] == "Password changed. Please log in again."
    # The old access token is now stale (auth_version bumped).
    me = await client.get("/api/v1/auth/me", headers=auth_header(token))
    assert me.status_code == 401
    # The refresh cookie was cleared, so a cookie-only refresh now fails.
    refresh = await client.post("/api/v1/auth/refresh")
    assert refresh.status_code == 401


# --------------------------------------------------------------------------- #
# Blocker 3 — refresh replay protection preserved with the new response shape
# --------------------------------------------------------------------------- #
async def test_refresh_rotation_and_replay_via_cookie(client, db) -> None:
    await make_user(db, username="cookierot", email="cr@example.com")
    await login(client, "cookierot")
    first_cookie = client.cookies.get("refresh_token")
    # Rotate via cookie.
    r1 = await client.post("/api/v1/auth/refresh")
    assert r1.status_code == 200
    # Replay the original (now-rotated) token explicitly → family revoked.
    replay = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": first_cookie}
    )
    assert replay.status_code == 401
    assert replay.json()["error"]["code"] == "token_reuse_detected"
