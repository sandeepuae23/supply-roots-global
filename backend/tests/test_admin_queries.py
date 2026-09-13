"""Coverage for admin read endpoints, filters, history, and session management."""

from __future__ import annotations

import pytest

from app.models.enums import AccountStatus, UserType
from tests.helpers import auth_header, login, make_admin, make_user

pytestmark = pytest.mark.asyncio


async def _admin_token(client, db) -> str:
    await make_admin(db)
    return (await login(client, "root_admin")).json()["access_token"]


async def test_user_detail_includes_roles_and_permissions(client, db) -> None:
    token = await _admin_token(client, db)
    user = await make_user(db, username="detailme", email="d@example.com", role="BUYER_OWNER")
    resp = await client.get(f"/api/v1/admin/users/{user.id}", headers=auth_header(token))
    assert resp.status_code == 200
    body = resp.json()
    assert body["username"] == "detailme"
    assert "BUYER_OWNER" in body["roles"]
    assert body["auth_version"] == 1


async def test_user_detail_404(client, db) -> None:
    token = await _admin_token(client, db)
    import uuid

    resp = await client.get(f"/api/v1/admin/users/{uuid.uuid4()}", headers=auth_header(token))
    assert resp.status_code == 404


async def test_user_list_filters(client, db) -> None:
    token = await _admin_token(client, db)
    await make_user(db, username="filterbuyer", email="fb@example.com", user_type=UserType.BUYER)
    await make_user(
        db, username="filtervendor", email="fv@example.com", user_type=UserType.VENDOR
    )
    await make_user(
        db, username="pendingone", email="po@example.com", status=AccountStatus.PENDING_APPROVAL
    )
    # Filter by user_type.
    r1 = await client.get("/api/v1/admin/users?user_type=VENDOR", headers=auth_header(token))
    assert r1.status_code == 200
    assert all(u["user_type"] == "VENDOR" for u in r1.json()["items"])
    # Filter by status.
    r2 = await client.get(
        "/api/v1/admin/users?status=PENDING_APPROVAL", headers=auth_header(token)
    )
    assert all(u["status"] == "PENDING_APPROVAL" for u in r2.json()["items"])
    # Search query.
    r3 = await client.get("/api/v1/admin/users?q=filtervendor", headers=auth_header(token))
    assert any(u["username"] == "filtervendor" for u in r3.json()["items"])


async def test_login_attempts_and_status_history_endpoints(client, db) -> None:
    token = await _admin_token(client, db)
    user = await make_user(db, username="history", email="h@example.com")
    # Generate a failed + successful attempt.
    await login(client, "history", password="wrong")
    await login(client, "history")
    # Lock then unlock to create status history.
    await client.post(
        f"/api/v1/admin/users/{user.id}/lock",
        json={"reason": "testing history"},
        headers=auth_header(token),
    )
    attempts = await client.get(
        f"/api/v1/admin/users/{user.id}/login-attempts", headers=auth_header(token)
    )
    assert attempts.status_code == 200
    assert attempts.json()["meta"]["total_items"] >= 2

    history = await client.get(
        f"/api/v1/admin/users/{user.id}/status-history", headers=auth_header(token)
    )
    assert history.status_code == 200
    assert history.json()["meta"]["total_items"] >= 1


async def test_audit_logs_filters(client, db) -> None:
    token = await _admin_token(client, db)
    user = await make_user(
        db, username="audittarget", email="at@example.com", status=AccountStatus.PENDING_APPROVAL
    )
    await client.post(
        f"/api/v1/admin/users/{user.id}/approve",
        json={"reason": "REGISTRATION_VERIFIED", "notes": "looks good"},
        headers=auth_header(token),
    )
    # Filter by target user.
    by_user = await client.get(
        f"/api/v1/admin/audit-logs?target_user_id={user.id}", headers=auth_header(token)
    )
    assert by_user.status_code == 200
    assert by_user.json()["meta"]["total_items"] >= 1
    # Filter by action.
    by_action = await client.get(
        "/api/v1/admin/audit-logs?action=APPROVE", headers=auth_header(token)
    )
    assert all(row["action"] == "APPROVE" for row in by_action.json()["items"])


async def test_session_listing_and_revocation(client, db) -> None:
    await make_user(db, username="sessionuser", email="su@example.com")
    login_resp = await login(client, "sessionuser")
    token = login_resp.json()["access_token"]
    sessions = await client.get("/api/v1/auth/sessions", headers=auth_header(token))
    assert sessions.status_code == 200
    assert len(sessions.json()) >= 1
    session_id = sessions.json()[0]["id"]
    revoke = await client.delete(
        f"/api/v1/auth/sessions/{session_id}", headers=auth_header(token)
    )
    assert revoke.status_code == 200
    # Revoking an unknown session 404s.
    import uuid

    missing = await client.delete(
        f"/api/v1/auth/sessions/{uuid.uuid4()}", headers=auth_header(token)
    )
    assert missing.status_code == 404


async def test_logout_and_logout_all_endpoints(client, db) -> None:
    await make_user(db, username="logoutuser", email="lo@example.com")
    login_resp = await login(client, "logoutuser")
    token = login_resp.json()["access_token"]
    # Logout with no body — the refresh cookie set on login is used.
    out = await client.post("/api/v1/auth/logout", headers=auth_header(token))
    assert out.status_code == 200
    # A fresh login, then logout-all.
    login2 = await login(client, "logoutuser")
    token2 = login2.json()["access_token"]
    out_all = await client.post("/api/v1/auth/logout-all", headers=auth_header(token2))
    assert out_all.status_code == 200
