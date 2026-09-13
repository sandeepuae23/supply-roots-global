"""End-to-end API flow and endpoint authorization matrix."""

from __future__ import annotations

import pytest

from app.core.security import create_access_token
from app.models.enums import AccountStatus
from tests.helpers import DEFAULT_PASSWORD, auth_header, login, make_admin, make_user

pytestmark = pytest.mark.asyncio


async def _admin_token(client, db) -> str:
    await make_admin(db)
    resp = await login(client, "root_admin")
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


async def test_full_registration_approval_login_flow(client, db) -> None:
    # 1. Buyer registers (with company profile).
    reg = await client.post(
        "/api/v1/auth/register/buyer",
        json={
            "username": "flowbuyer",
            "email": "flow@example.com",
            "password": DEFAULT_PASSWORD,
            "company_name": "Flow Buyer Co",
            "contact_name": "Flo Buyer",
            "phone": "+15550001111",
            "country": "USA",
        },
    )
    assert reg.status_code == 201
    buyer_id = reg.json()["id"]

    # 2. Buyer cannot log in while pending.
    pending_login = await login(client, "flowbuyer")
    assert pending_login.status_code == 403
    assert pending_login.json()["error"]["code"] == "account_pending_approval"

    # 3. Admin logs in and approves the buyer.
    admin_token = await _admin_token(client, db)
    approve = await client.post(
        f"/api/v1/admin/users/{buyer_id}/approve",
        json={"reason": "REGISTRATION_VERIFIED"},
        headers=auth_header(admin_token),
    )
    assert approve.status_code == 200, approve.text
    assert approve.json()["status"] == "ACTIVE"
    assert approve.json()["audit_id"]

    # 4. Buyer can now log in. The response carries the access token + full user
    #    object, and the refresh token is NOT in the JSON body (cookie only).
    ok = await login(client, "flowbuyer")
    assert ok.status_code == 200
    access = ok.json()["access_token"]
    assert "refresh_token" not in ok.json()
    assert ok.json()["user"]["username"] == "flowbuyer"
    assert ok.json()["user"]["company_name"] == "Flow Buyer Co"
    assert "BUYER_OWNER" in ok.json()["user"]["roles"]
    # The refresh token is delivered as an HttpOnly cookie.
    assert client.cookies.get("refresh_token")

    # 5. /auth/me reflects the account.
    me = await client.get("/api/v1/auth/me", headers=auth_header(access))
    assert me.status_code == 200
    assert me.json()["username"] == "flowbuyer"
    assert "BUYER_OWNER" in me.json()["roles"]

    # 6. Refresh with no body rotates the token via the cookie alone.
    refresh = await client.post("/api/v1/auth/refresh")
    assert refresh.status_code == 200, refresh.text
    assert refresh.json()["access_token"]
    assert "refresh_token" not in refresh.json()
    assert refresh.json()["user"]["username"] == "flowbuyer"


async def test_admin_reason_required(client, db) -> None:
    admin_token = await _admin_token(client, db)
    user = await make_user(
        db, username="needsreason", email="nr@example.com", status=AccountStatus.PENDING_APPROVAL
    )
    # Missing reason → 422 validation error.
    resp = await client.post(
        f"/api/v1/admin/users/{user.id}/reject",
        json={},
        headers=auth_header(admin_token),
    )
    assert resp.status_code == 422


async def test_invalid_transition_returns_409(client, db) -> None:
    admin_token = await _admin_token(client, db)
    active_user = await make_user(db, username="alreadyactive", email="aa@example.com")
    resp = await client.post(
        f"/api/v1/admin/users/{active_user.id}/approve",
        json={"reason": "trying to approve an active user"},
        headers=auth_header(admin_token),
    )
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "invalid_state_transition"


# --------------------------------------------------------------------------- #
# Authorization matrix
# --------------------------------------------------------------------------- #
async def test_admin_endpoint_requires_token(client) -> None:
    resp = await client.get("/api/v1/admin/users")
    assert resp.status_code == 401


async def test_admin_endpoint_forbidden_for_buyer(client, db) -> None:
    await make_user(db, username="justbuyer", email="jb@example.com", role="BUYER_OWNER")
    token = (await login(client, "justbuyer")).json()["access_token"]
    resp = await client.get("/api/v1/admin/users", headers=auth_header(token))
    assert resp.status_code == 403
    assert resp.json()["error"]["code"] == "permission_denied"


async def test_admin_endpoint_allowed_for_admin(client, db) -> None:
    token = await _admin_token(client, db)
    resp = await client.get("/api/v1/admin/users", headers=auth_header(token))
    assert resp.status_code == 200
    assert "items" in resp.json()
    assert "meta" in resp.json()


async def test_invalid_and_expired_tokens_denied(client, db) -> None:
    # Garbage token.
    resp = await client.get("/api/v1/auth/me", headers=auth_header("not.a.jwt"))
    assert resp.status_code == 401
    # Expired token for a real user.
    user = await make_user(db, username="expuser", email="exp@example.com")
    token, _ = create_access_token(
        subject=user.id, auth_version=user.auth_version, must_change_password=False,
        expires_minutes=-1,
    )
    resp2 = await client.get("/api/v1/auth/me", headers=auth_header(token))
    assert resp2.status_code == 401


async def test_stale_auth_version_denied(client, db) -> None:
    user = await make_user(db, username="staleuser", email="stale@example.com")
    # Token minted with an old auth_version.
    token, _ = create_access_token(
        subject=user.id, auth_version=user.auth_version - 1, must_change_password=False
    )
    resp = await client.get("/api/v1/auth/me", headers=auth_header(token))
    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "stale_token"


async def test_must_change_password_restriction(client, db) -> None:
    await make_user(db, username="mcp", email="mcp@example.com", must_change_password=True)
    token = (await login(client, "mcp")).json()["access_token"]
    # Normal protected endpoint is blocked.
    sessions = await client.get("/api/v1/auth/sessions", headers=auth_header(token))
    assert sessions.status_code == 403
    assert sessions.json()["error"]["code"] == "password_change_required"
    # But change-password is allowed.
    changed = await client.post(
        "/api/v1/auth/change-password",
        json={"current_password": DEFAULT_PASSWORD, "new_password": "a-fresh-password-1234"},
        headers=auth_header(token),
    )
    assert changed.status_code == 200


async def test_reset_password_returns_temp_once_and_forces_change(client, db) -> None:
    admin_token = await _admin_token(client, db)
    user = await make_user(db, username="resetflow", email="rf@example.com")
    resp = await client.post(
        f"/api/v1/admin/users/{user.id}/reset-password",
        json={"reason": "user forgot password"},
        headers=auth_header(admin_token),
    )
    assert resp.status_code == 200
    temp = resp.json()["temporary_password"]
    assert temp and resp.json()["must_change_password"] is True
    # Logging in with the temp password succeeds but flags forced change.
    login_resp = await login(client, "resetflow", password=temp)
    assert login_resp.status_code == 200
    assert login_resp.json()["must_change_password"] is True
