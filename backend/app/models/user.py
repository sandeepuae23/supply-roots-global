"""The ``users`` table — the identity root for every portal account."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    Index,
    Integer,
    String,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.db.types import enum_column
from app.models.enums import AccountStatus, UserType

if TYPE_CHECKING:
    from app.models.company import BusinessClient, Vendor
    from app.models.rbac import UserRole
    from app.models.refresh_token import RefreshToken


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    # -- Identity ----------------------------------------------------------
    username: Mapped[str] = mapped_column(String(150), nullable=False)
    normalized_username: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    normalized_email: Mapped[str] = mapped_column(String(320), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    # -- Classification / state -------------------------------------------
    user_type: Mapped[UserType] = mapped_column(
        enum_column(UserType, name="user_type"), nullable=False
    )
    status: Mapped[AccountStatus] = mapped_column(
        enum_column(AccountStatus, name="account_status"),
        nullable=False,
        default=AccountStatus.PENDING_APPROVAL,
        server_default=AccountStatus.PENDING_APPROVAL.value,
    )

    # -- Lockout tracking --------------------------------------------------
    failed_login_attempts: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=text("0")
    )
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # -- Approval / suspension metadata -----------------------------------
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_by: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    suspended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    suspended_by: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    suspension_reason: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    # -- Password lifecycle -----------------------------------------------
    must_change_password: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    temporary_password_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    password_changed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # -- Session invalidation & login bookkeeping -------------------------
    auth_version: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default=text("1")
    )
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # -- Relationships -----------------------------------------------------
    roles: Mapped[list[UserRole]] = relationship(
        back_populates="user", cascade="all, delete-orphan", lazy="selectin"
    )
    refresh_tokens: Mapped[list[RefreshToken]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    # Company profiles (one-to-one; exactly one is present per user_type).
    business_client: Mapped[BusinessClient | None] = relationship(
        back_populates="user", cascade="all, delete-orphan", lazy="selectin", uselist=False
    )
    vendor: Mapped[Vendor | None] = relationship(
        back_populates="user", cascade="all, delete-orphan", lazy="selectin", uselist=False
    )

    @property
    def company_name(self) -> str | None:
        """The registered company name from whichever profile exists (or None)."""
        if self.business_client is not None:
            return self.business_client.company_name
        if self.vendor is not None:
            return self.vendor.company_name
        return None

    __table_args__ = (
        # Case-insensitive uniqueness is enforced by storing normalized values
        # and adding unique indexes over them.
        Index("uq_users_normalized_username", "normalized_username", unique=True),
        Index("uq_users_normalized_email", "normalized_email", unique=True),
        Index("ix_users_status", "status"),
        Index("ix_users_user_type", "user_type"),
    )

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"<User {self.username!r} type={self.user_type} status={self.status}>"
