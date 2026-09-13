"""Administrator account-governance service behaviour."""

from __future__ import annotations

import pytest

from app.core.errors import InvalidStateTransitionError
from app.models.audit_log import AdminAuditLog
from app.models.enums import AccountStatus
from app.modules.accounts import service as accounts_service
from app.modules.accounts.transitions import AdminAction
from app.modules.auth import service as auth_service
from tests.helpers import DEFAULT_PASSWORD, make_admin, make_user

pytestmark = pytest.mark.asyncio


async def test_approve_activates_and_audits(db, seeded) -> None:
    admin = await make_admin(db)
    user = await make_user(
        db, username="pending", email="pending@example.com", status=AccountStatus.PENDING_APPROVAL
    )
    result = await accounts_service.perform_admin_action(
        db,
        admin_id=admin.id,
        target_user_id=user.id,
        action=AdminAction.APPROVE,
        reason="REGISTRATION_VERIFIED",
    )
    assert result.status == AccountStatus.ACTIVE
    await db.refresh(user)
    assert user.approved_at is not None
    assert user.approved_by == admin.id
    # Audit row with actor + reason + target exists.
    audit = await db.get(AdminAuditLog, result.audit_id)
    assert audit is not None
    assert audit.actor_id == admin.id
    assert audit.reason == "REGISTRATION_VERIFIED"
    assert audit.target_user_id == user.id


async def test_lock_then_unlock_resets_counter(db, seeded) -> None:
    admin = await make_admin(db)
    user = await make_user(db, username="u1", email="u1@example.com")
    await accounts_service.perform_admin_action(
        db, admin_id=admin.id, target_user_id=user.id, action=AdminAction.LOCK, reason="abuse"
    )
    await db.refresh(user)
    assert user.status == AccountStatus.LOCKED
    await accounts_service.perform_admin_action(
        db, admin_id=admin.id, target_user_id=user.id, action=AdminAction.UNLOCK, reason="resolved"
    )
    await db.refresh(user)
    assert user.status == AccountStatus.ACTIVE
    assert user.failed_login_attempts == 0


async def test_suspend_cannot_bypass_unlock(db, seeded) -> None:
    admin = await make_admin(db)
    user = await make_user(db, username="u2", email="u2@example.com", status=AccountStatus.LOCKED)
    with pytest.raises(InvalidStateTransitionError):
        await accounts_service.perform_admin_action(
            db, admin_id=admin.id, target_user_id=user.id, action=AdminAction.SUSPEND, reason="x"
        )


async def test_suspend_and_reactivate(db, seeded) -> None:
    admin = await make_admin(db)
    user = await make_user(db, username="u3", email="u3@example.com")
    await accounts_service.perform_admin_action(
        db, admin_id=admin.id, target_user_id=user.id, action=AdminAction.SUSPEND, reason="review"
    )
    await db.refresh(user)
    assert user.status == AccountStatus.SUSPENDED
    assert user.suspension_reason == "review"
    await accounts_service.perform_admin_action(
        db, admin_id=admin.id, target_user_id=user.id, action=AdminAction.REACTIVATE, reason="ok"
    )
    await db.refresh(user)
    assert user.status == AccountStatus.ACTIVE
    assert user.suspended_at is None


async def test_disable_from_active(db, seeded) -> None:
    admin = await make_admin(db)
    user = await make_user(db, username="u4", email="u4@example.com")
    await accounts_service.perform_admin_action(
        db, admin_id=admin.id, target_user_id=user.id, action=AdminAction.DISABLE, reason="gone"
    )
    await db.refresh(user)
    assert user.status == AccountStatus.DISABLED


async def test_reset_password_does_not_change_status(db, seeded) -> None:
    admin = await make_admin(db)
    # Reset on a LOCKED account must NOT unlock it.
    user = await make_user(
        db, username="u5", email="u5@example.com", status=AccountStatus.LOCKED
    )
    before_version = user.auth_version
    result = await accounts_service.reset_password(
        db, admin_id=admin.id, target_user_id=user.id, reason="user request"
    )
    await db.refresh(user)
    assert user.status == AccountStatus.LOCKED  # unchanged
    assert user.must_change_password is True
    assert user.temporary_password_expires_at is not None
    assert user.auth_version == before_version + 1
    assert result.temporary_password  # returned once
    # The temporary password is not stored in plaintext anywhere on the user.
    assert result.temporary_password != user.password_hash


async def test_reset_password_revokes_sessions(db, seeded) -> None:
    admin = await make_admin(db)
    await make_user(db, username="u6", email="u6@example.com")
    issued = await auth_service.authenticate(db, identifier="u6", password=DEFAULT_PASSWORD)
    await accounts_service.reset_password(
        db, admin_id=admin.id, target_user_id=issued.user.id, reason="reset"
    )
    from app.core.errors import AuthenticationError

    with pytest.raises(AuthenticationError):
        await auth_service.refresh(db, presented_value=issued.refresh_token)


async def test_account_summary_counts(db, seeded) -> None:
    await make_admin(db)
    await make_user(db, username="b1", email="b1@example.com")
    await make_user(
        db, username="p1", email="p1@example.com", status=AccountStatus.PENDING_APPROVAL
    )
    summary = await accounts_service.account_summary(db)
    assert summary["admins"] == 1
    assert summary["buyers"] == 2
    assert summary["pending_approval"] == 1
    assert summary["active"] == 2
    assert summary["total_users"] == 3
