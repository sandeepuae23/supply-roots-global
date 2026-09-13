"""The ``login_attempts`` table — an append-only record of authentication tries."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UUIDPrimaryKeyMixin
from app.db.types import enum_column
from app.models.enums import LoginFailureReason


class LoginAttempt(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "login_attempts"

    # Nullable: an attempt with an unknown identifier has no associated user.
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    # The identifier as submitted (normalized) — never the password.
    identifier: Mapped[str] = mapped_column(String(320), nullable=False)
    successful: Mapped[bool] = mapped_column(Boolean, nullable=False)
    failure_reason: Mapped[LoginFailureReason] = mapped_column(
        enum_column(LoginFailureReason, name="login_failure_reason"),
        nullable=False,
        default=LoginFailureReason.NONE,
    )
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)
    request_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_login_attempts_user_id", "user_id"),
        Index("ix_login_attempts_created_at", "created_at"),
    )
