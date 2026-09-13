"""Company identity, membership and the type-specific profile extensions.

Phase 1 linked ``business_clients`` / ``vendors`` 1:1 to the registering user,
so a company was reachable only through that one account and teams could not be
added on top. Phase 2 lifts company identity up a level:

``companies``
    the canonical company row.
``company_members``
    the sole authority for who may act for a company, and in what capacity.
``business_clients`` / ``vendors``
    type-specific profile extensions keyed by ``company_id``.

Two invariants are enforced in the database rather than in service code,
because service code is where they get forgotten:

* a company has **exactly one** ``ACTIVE`` ``OWNER`` — a partial unique index
  makes a second one impossible, not merely unlikely (contract section 1.7);
* a member's account type always equals the company's type — a ``CHECK`` on
  denormalised columns blocks a buyer joining a vendor company even if a bug
  or a manual query tries it (contract section 1.1).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import (
    AddressRole,
    CompanyRole,
    CompanyStatus,
    CompanyType,
    MembershipStatus,
)

if TYPE_CHECKING:
    from app.models.user import User

# JSONB on PostgreSQL, plain JSON elsewhere (unit tests run on SQLite).
_JSON_TYPE = JSON().with_variant(JSONB(), "postgresql")


def _enum_values(enum_cls: type) -> str:
    """Render a CHECK constraint value list for a StrEnum."""
    return ", ".join(f"'{m.value}'" for m in enum_cls)


class Company(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Canonical company row shared by buyers and vendors."""

    __tablename__ = "companies"

    legal_name: Mapped[str] = mapped_column(String(255), nullable=False)
    trading_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    company_type: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=CompanyStatus.PENDING_APPROVAL.value
    )
    registration_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tax_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    members: Mapped[list[CompanyMember]] = relationship(
        back_populates="company", cascade="all, delete-orphan"
    )
    addresses: Mapped[list[CompanyAddress]] = relationship(
        back_populates="company", cascade="all, delete-orphan"
    )
    contacts: Mapped[list[CompanyContact]] = relationship(
        back_populates="company", cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint(
            f"company_type IN ({_enum_values(CompanyType)})",
            name="company_type_valid",
        ),
        CheckConstraint(
            f"status IN ({_enum_values(CompanyStatus)})", name="status_valid"
        ),
        Index("ix_companies_company_type_status", "company_type", "status"),
        Index("ix_companies_legal_name", "legal_name"),
    )


class CompanyMember(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Who may act for a company, and in what capacity.

    ``user_type`` and ``company_type`` are denormalised copies carried solely so
    the ``CHECK`` below can compare them. They are written from the authoritative
    rows at insert time and are never the source of truth for either value.
    """

    __tablename__ = "company_members"

    company_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=MembershipStatus.INVITED.value
    )
    user_type: Mapped[str] = mapped_column(String(16), nullable=False)
    company_type: Mapped[str] = mapped_column(String(16), nullable=False)

    invited_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    invited_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    invitation_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    joined_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Eager-loaded: User.memberships is selectin, and User.company_name walks
    # membership -> company. A lazy load there raises MissingGreenlet under the
    # async session, mid-serialization, where there is no greenlet to run it.
    company: Mapped[Company] = relationship(back_populates="members", lazy="selectin")
    user: Mapped[User] = relationship(foreign_keys=[user_id], lazy="selectin")

    __table_args__ = (
        UniqueConstraint("company_id", "user_id", name="uq_company_members_company_user"),
        CheckConstraint(f"role IN ({_enum_values(CompanyRole)})", name="role_valid"),
        CheckConstraint(
            f"status IN ({_enum_values(MembershipStatus)})", name="status_valid"
        ),
        # Same-type membership. A BUYER user can never join a VENDOR company,
        # regardless of what the service layer believes.
        CheckConstraint("user_type = company_type", name="member_type_matches_company"),
        # Exactly one active owner per company. Partial indexes are supported on
        # PostgreSQL; on SQLite (unit tests) this also applies.
        Index(
            "uq_company_members_single_active_owner",
            "company_id",
            unique=True,
            sqlite_where=text("role = 'OWNER' AND status = 'ACTIVE'"),
            postgresql_where=text("role = 'OWNER' AND status = 'ACTIVE'"),
        ),
        Index("ix_company_members_user_id_status", "user_id", "status"),
    )


class CompanyAddress(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Billing / delivery / pickup / warehouse addresses owned by a company."""

    __tablename__ = "company_addresses"

    company_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    line1: Mapped[str] = mapped_column(String(255), nullable=False)
    line2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str] = mapped_column(String(120), nullable=False)
    region: Mapped[str | None] = mapped_column(String(120), nullable=True)
    postal_code: Mapped[str | None] = mapped_column(String(32), nullable=True)
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    is_primary: Mapped[bool] = mapped_column(nullable=False, default=False)

    company: Mapped[Company] = relationship(back_populates="addresses")

    __table_args__ = (
        CheckConstraint(f"role IN ({_enum_values(AddressRole)})", name="role_valid"),
        Index("ix_company_addresses_company_id_role", "company_id", "role"),
    )


class CompanyContact(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Named contact people for a company."""

    __tablename__ = "company_contacts"

    company_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role_title: Mapped[str | None] = mapped_column(String(120), nullable=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_primary: Mapped[bool] = mapped_column(nullable=False, default=False)

    company: Mapped[Company] = relationship(back_populates="contacts")

    __table_args__ = (Index("ix_company_contacts_company_id", "company_id"),)


class VendorFacility(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Processing / packing / storage sites belonging to a vendor company.

    A child of the company, never of a user, so it survives membership changes.
    """

    __tablename__ = "vendor_facilities"

    company_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    facility_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    capacity_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    certifications: Mapped[list[str]] = mapped_column(
        _JSON_TYPE, nullable=False, default=list
    )

    __table_args__ = (Index("ix_vendor_facilities_company_id", "company_id"),)


class VendorSourcingLocation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Growing / sourcing regions a vendor draws from."""

    __tablename__ = "vendor_sourcing_locations"

    company_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    region: Mapped[str] = mapped_column(String(255), nullable=False)
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    products: Mapped[list[str]] = mapped_column(
        _JSON_TYPE, nullable=False, default=list
    )
    season_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (Index("ix_vendor_sourcing_locations_company_id", "company_id"),)
