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
from app.models.enums import AccountStatus, CompanyRole, MembershipStatus, UserType

if TYPE_CHECKING:
    from app.models.organization import CompanyMember
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
    # Company memberships. A user may belong to several companies, but only to
    # companies matching their immutable user_type (contract section 1.1). The
    # direct 1:1 link to a company profile was removed in Phase 2 — a company is
    # reached through membership, not ownership of a row.
    memberships: Mapped[list[CompanyMember]] = relationship(
        back_populates="user",
        foreign_keys="CompanyMember.user_id",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    @property
    def company_name(self) -> str | None:
        """Legal name of the company this user owns, if any.

        Convenience for admin screens that still show a single company per
        account. It reads the OWNER membership rather than a direct profile
        link, so it stays correct once a user belongs to several companies.
        """
        for member in self.memberships:
            if (
                member.role == CompanyRole.OWNER.value
                and member.status == MembershipStatus.ACTIVE.value
                and member.company is not None
            ):
                return member.company.legal_name
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
