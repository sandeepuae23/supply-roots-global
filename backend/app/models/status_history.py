"""The ``account_status_history`` table — immutable record of status changes."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UUIDPrimaryKeyMixin
from app.db.types import enum_column
from app.models.enums import AccountStatus, ActorType


class AccountStatusHistory(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "account_status_history"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    # Null previous_status denotes the initial registration record.
    previous_status: Mapped[AccountStatus | None] = mapped_column(
        enum_column(AccountStatus, name="account_status_prev"), nullable=True
    )
    new_status: Mapped[AccountStatus] = mapped_column(
        enum_column(AccountStatus, name="account_status_new"), nullable=False
    )
    reason: Mapped[str] = mapped_column(String(1000), nullable=False)
    actor_type: Mapped[ActorType] = mapped_column(
        enum_column(ActorType, name="status_actor_type"), nullable=False
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    request_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_account_status_history_user_id", "user_id"),
        Index("ix_account_status_history_created_at", "created_at"),
    )
