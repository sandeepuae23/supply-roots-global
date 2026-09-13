"""Type-specific company profile extensions.

Phase 2 moved company identity up a level: ``companies`` is now the canonical
row and these tables are **extensions of a company**, keyed by ``company_id``,
not of the registering user. The user reaches them through their ``OWNER`` row
in ``company_members``.

Keying these to a user was what made teams impossible — a company was reachable
only through the single account that registered it. See
``app/models/organization.py`` and contract section 0.1.
"""

from __future__ import annotations

import uuid
from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

# JSONB on PostgreSQL, plain JSON elsewhere (unit tests on SQLite).
_JSON_TYPE = JSON().with_variant(JSONB(), "postgresql")


class BusinessClient(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Buyer-specific profile, one row per buyer company."""

    __tablename__ = "business_clients"

    company_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    country: Mapped[str] = mapped_column(String(100), nullable=False)

    __table_args__ = (
        Index("ix_business_clients_company_name", "company_name"),
    )


class Vendor(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Vendor-specific profile, one row per vendor company."""

    __tablename__ = "vendors"

    company_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    # Non-empty list of product/supply categories the vendor can supply.
    supply_categories: Mapped[list[str]] = mapped_column(_JSON_TYPE, nullable=False)

    __table_args__ = (
        Index("ix_vendors_company_name", "company_name"),
    )
