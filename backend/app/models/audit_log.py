"""The ``admin_audit_logs`` table — append-only privileged-action trail.

Rows are only ever inserted through the service layer. There is no update or
delete path exposed via the API; this preserves an immutable audit record.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.db.base import Base, UUIDPrimaryKeyMixin
from app.db.types import enum_column
from app.models.enums import ActorType, AuditAction

# JSONB on PostgreSQL, plain JSON elsewhere (unit tests on SQLite).
_JSON_TYPE = JSON().with_variant(JSONB(), "postgresql")


class AdminAuditLog(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "admin_audit_logs"

    action: Mapped[AuditAction] = mapped_column(
        enum_column(AuditAction, name="audit_action"), nullable=False
    )
    actor_type: Mapped[ActorType] = mapped_column(
        enum_column(ActorType, name="audit_actor_type"), nullable=False
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    # The affected user (when applicable).
    target_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reason: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    request_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    # Additional non-sensitive structured context.
    context: Mapped[dict | None] = mapped_column(_JSON_TYPE, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_admin_audit_logs_target_user_id", "target_user_id"),
        Index("ix_admin_audit_logs_actor_id", "actor_id"),
        Index("ix_admin_audit_logs_action", "action"),
        Index("ix_admin_audit_logs_created_at", "created_at"),
    )
