"""Administrator account-governance service.

Every mutation requires a reason, records immutable status history and an audit
log entry (actor, timestamp, reason, target, request id), and — for
security-sensitive transitions — bumps ``auth_version`` and revokes sessions.
Password reset never changes account status.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import ColumnElement, Select, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import NotFoundError
from app.core.security import generate_temporary_password, hash_password
from app.models.audit_log import AdminAuditLog
from app.models.company import BusinessClient, Vendor
from app.models.enums import AccountStatus, ActorType, AuditAction, UserType
from app.models.login_attempt import LoginAttempt
from app.models.password_history import PasswordHistory
from app.models.status_history import AccountStatusHistory
from app.models.user import User
from app.modules import audit
from app.modules.accounts.transitions import (
    AdminAction,
    audit_action_for,
    invalidates_sessions,
    resolve_transition,
)
from app.modules.auth import tokens
from app.modules.rbac import service as rbac_service


def _now() -> datetime:
    return datetime.now(UTC)


@dataclass
class ActionResult:
    user: User
    status: AccountStatus
    action_at: datetime
    audit_id: uuid.UUID


async def _get_user_locked(session: AsyncSession, user_id: uuid.UUID) -> User:
    user = await session.get(User, user_id, with_for_update=True)
    if user is None:
        raise NotFoundError("User not found.", code="user_not_found")
    return user


async def perform_admin_action(
    session: AsyncSession,
    *,
    admin_id: uuid.UUID,
    target_user_id: uuid.UUID,
    action: AdminAction,
    reason: str,
    notes: str | None = None,
    ip_address: str | None = None,
) -> ActionResult:
    """Apply an administrator status transition atomically."""
    user = await _get_user_locked(session, target_user_id)
    previous_status = user.status
    new_status = resolve_transition(action, previous_status)

    now = _now()
    user.status = new_status

    # Per-action side effects.
    if action == AdminAction.APPROVE:
        user.approved_at = now
        user.approved_by = admin_id
    elif action == AdminAction.UNLOCK:
        user.failed_login_attempts = 0
        user.locked_at = None
    elif action == AdminAction.SUSPEND:
        user.suspended_at = now
        user.suspended_by = admin_id
        user.suspension_reason = reason
    elif action == AdminAction.REACTIVATE:
        user.suspended_at = None
        user.suspended_by = None
        user.suspension_reason = None
    elif action == AdminAction.LOCK:
        user.locked_at = now

    if invalidates_sessions(action):
        user.auth_version += 1
        await tokens.revoke_all_for_user(
            session, user_id=user.id, reason=f"ADMIN_{action.value}"
        )

    audit.record_status_history(
        session,
        user_id=user.id,
        previous_status=previous_status,
        new_status=new_status,
        reason=reason,
        actor_type=ActorType.ADMIN,
        actor_id=admin_id,
        ip_address=ip_address,
    )
    context: dict = {"notes": notes} if notes else {}
    audit_record = audit.record_audit(
        session,
        action=audit_action_for(action),
        actor_type=ActorType.ADMIN,
        actor_id=admin_id,
        target_user_id=user.id,
        reason=reason,
        ip_address=ip_address,
        context=context or None,
    )
    await session.flush()
    audit_id = audit_record.id
    await session.commit()
    await session.refresh(user)
    return ActionResult(user=user, status=user.status, action_at=now, audit_id=audit_id)


@dataclass
class ResetResult:
    user_id: uuid.UUID
    temporary_password: str
    expires_at: datetime
    audit_id: uuid.UUID


async def reset_password(
    session: AsyncSession,
    *,
    admin_id: uuid.UUID,
    target_user_id: uuid.UUID,
    reason: str,
    notes: str | None = None,
    ip_address: str | None = None,
) -> ResetResult:
    """Reset a user's password to a one-time temporary password.

    Changes credentials, sets the temporary-password expiry and
    ``must_change_password``, bumps ``auth_version``, and revokes sessions. It
    never approves, reactivates, or unlocks the account — the status is untouched.
    """
    user = await _get_user_locked(session, target_user_id)
    temp_password = generate_temporary_password()
    now = _now()
    expires_at = now + timedelta(minutes=settings.temporary_password_expire_minutes)

    user.password_hash = hash_password(temp_password)
    user.must_change_password = True
    user.temporary_password_expires_at = expires_at
    user.password_changed_at = now
    user.auth_version += 1
    # NOTE: user.status is deliberately NOT modified.

    session.add(
        PasswordHistory(
            user_id=user.id, password_hash=user.password_hash, set_reason="ADMIN_RESET"
        )
    )
    await tokens.revoke_all_for_user(session, user_id=user.id, reason="ADMIN_PASSWORD_RESET")
    context: dict = {"notes": notes} if notes else {}
    audit_record = audit.record_audit(
        session,
        action=AuditAction.RESET_PASSWORD,
        actor_type=ActorType.ADMIN,
        actor_id=admin_id,
        target_user_id=user.id,
        reason=reason,
        ip_address=ip_address,
        context=context or None,
    )
    await session.flush()
    audit_id = audit_record.id
    await session.commit()
    return ResetResult(
        user_id=user.id,
        temporary_password=temp_password,
        expires_at=expires_at,
        audit_id=audit_id,
    )


# --------------------------------------------------------------------------- #
# Read queries
# --------------------------------------------------------------------------- #
def _company_name_matches(pattern: str) -> ColumnElement[bool]:
    """A correlated EXISTS matching either profile table's company_name."""
    buyer_match = select(BusinessClient.id).where(
        BusinessClient.user_id == User.id,
        func.lower(BusinessClient.company_name).like(pattern),
    )
    vendor_match = select(Vendor.id).where(
        Vendor.user_id == User.id,
        func.lower(Vendor.company_name).like(pattern),
    )
    return or_(buyer_match.exists(), vendor_match.exists())


def _apply_user_filters(
    stmt: Select,
    *,
    user_type: UserType | None,
    status: AccountStatus | None,
    query: str | None,
    company: str | None,
) -> Select:
    if user_type is not None:
        stmt = stmt.where(User.user_type == user_type)
    if status is not None:
        stmt = stmt.where(User.status == status)
    if query:
        like = f"%{query.strip().lower()}%"
        # Free-text search spans username, email, and company name.
        stmt = stmt.where(
            or_(
                User.normalized_username.like(like),
                User.normalized_email.like(like),
                _company_name_matches(like),
            )
        )
    if company:
        stmt = stmt.where(_company_name_matches(f"%{company.strip().lower()}%"))
    return stmt


async def list_users(
    session: AsyncSession,
    *,
    user_type: UserType | None = None,
    status: AccountStatus | None = None,
    query: str | None = None,
    company: str | None = None,
    offset: int = 0,
    limit: int = 20,
) -> tuple[list[User], int]:
    base = _apply_user_filters(
        select(User), user_type=user_type, status=status, query=query, company=company
    )
    total = await session.scalar(
        _apply_user_filters(
            select(func.count()).select_from(User),
            user_type=user_type,
            status=status,
            query=query,
            company=company,
        )
    )
    result = await session.execute(
        base.order_by(User.created_at.desc()).offset(offset).limit(limit)
    )
    return list(result.scalars().all()), int(total or 0)


async def get_user(session: AsyncSession, user_id: uuid.UUID) -> User:
    user = await session.get(User, user_id)
    if user is None:
        raise NotFoundError("User not found.", code="user_not_found")
    return user


async def get_user_roles_and_permissions(
    session: AsyncSession, user_id: uuid.UUID
) -> tuple[list[str], list[str]]:
    roles = await rbac_service.get_user_role_names(session, user_id)
    perms = await rbac_service.get_user_permissions(session, user_id)
    return roles, sorted(perms)


async def list_login_attempts(
    session: AsyncSession, *, user_id: uuid.UUID, offset: int = 0, limit: int = 20
) -> tuple[list[LoginAttempt], int]:
    total = await session.scalar(
        select(func.count()).select_from(LoginAttempt).where(LoginAttempt.user_id == user_id)
    )
    result = await session.execute(
        select(LoginAttempt)
        .where(LoginAttempt.user_id == user_id)
        .order_by(LoginAttempt.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all()), int(total or 0)


async def list_status_history(
    session: AsyncSession, *, user_id: uuid.UUID, offset: int = 0, limit: int = 20
) -> tuple[list[AccountStatusHistory], int]:
    total = await session.scalar(
        select(func.count())
        .select_from(AccountStatusHistory)
        .where(AccountStatusHistory.user_id == user_id)
    )
    result = await session.execute(
        select(AccountStatusHistory)
        .where(AccountStatusHistory.user_id == user_id)
        .order_by(AccountStatusHistory.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all()), int(total or 0)


async def list_audit_logs(
    session: AsyncSession,
    *,
    target_user_id: uuid.UUID | None = None,
    action: AuditAction | None = None,
    offset: int = 0,
    limit: int = 20,
) -> tuple[list[AdminAuditLog], int]:
    stmt = select(AdminAuditLog)
    count_stmt = select(func.count()).select_from(AdminAuditLog)
    if target_user_id is not None:
        stmt = stmt.where(AdminAuditLog.target_user_id == target_user_id)
        count_stmt = count_stmt.where(AdminAuditLog.target_user_id == target_user_id)
    if action is not None:
        stmt = stmt.where(AdminAuditLog.action == action)
        count_stmt = count_stmt.where(AdminAuditLog.action == action)
    total = await session.scalar(count_stmt)
    result = await session.execute(
        stmt.order_by(AdminAuditLog.created_at.desc()).offset(offset).limit(limit)
    )
    return list(result.scalars().all()), int(total or 0)


async def account_summary(session: AsyncSession) -> dict[str, int]:
    """Aggregate counts for the administrator account dashboard."""
    type_rows = (
        await session.execute(select(User.user_type, func.count()).group_by(User.user_type))
    ).all()
    status_rows = (
        await session.execute(select(User.status, func.count()).group_by(User.status))
    ).all()
    by_type: dict[UserType, int] = {row[0]: row[1] for row in type_rows}
    by_status: dict[AccountStatus, int] = {row[0]: row[1] for row in status_rows}
    since = _now() - timedelta(days=7)
    registered_last_7_days = await session.scalar(
        select(func.count()).select_from(User).where(User.created_at >= since)
    )
    return {
        "total_users": sum(by_type.values()),
        "buyers": by_type.get(UserType.BUYER, 0),
        "vendors": by_type.get(UserType.VENDOR, 0),
        "admins": by_type.get(UserType.ADMIN, 0),
        "pending_approval": by_status.get(AccountStatus.PENDING_APPROVAL, 0),
        "active": by_status.get(AccountStatus.ACTIVE, 0),
        "locked": by_status.get(AccountStatus.LOCKED, 0),
        "suspended": by_status.get(AccountStatus.SUSPENDED, 0),
        "rejected": by_status.get(AccountStatus.REJECTED, 0),
        "disabled": by_status.get(AccountStatus.DISABLED, 0),
        "registered_last_7_days": int(registered_last_7_days or 0),
    }
