"""Helpers to append immutable status-history and audit-log records."""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.context import get_request_id
from app.models.audit_log import AdminAuditLog
from app.models.enums import AccountStatus, ActorType, AuditAction
from app.models.status_history import AccountStatusHistory


def record_status_history(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    previous_status: AccountStatus | None,
    new_status: AccountStatus,
    reason: str,
    actor_type: ActorType,
    actor_id: uuid.UUID | None,
    ip_address: str | None = None,
) -> AccountStatusHistory:
    record = AccountStatusHistory(
        user_id=user_id,
        previous_status=previous_status,
        new_status=new_status,
        reason=reason,
        actor_type=actor_type,
        actor_id=actor_id,
        request_id=get_request_id(),
        ip_address=ip_address,
    )
    session.add(record)
    return record


def record_audit(
    session: AsyncSession,
    *,
    action: AuditAction,
    actor_type: ActorType,
    actor_id: uuid.UUID | None,
    target_user_id: uuid.UUID | None = None,
    reason: str | None = None,
    ip_address: str | None = None,
    context: dict | None = None,
) -> AdminAuditLog:
    record = AdminAuditLog(
        action=action,
        actor_type=actor_type,
        actor_id=actor_id,
        target_user_id=target_user_id,
        reason=reason,
        request_id=get_request_id(),
        ip_address=ip_address,
        context=context,
    )
    session.add(record)
    return record
