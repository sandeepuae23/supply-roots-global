"""Company profile tables persisted at registration.

Every buyer account owns exactly one ``business_clients`` row and every vendor
account owns exactly one ``vendors`` row. The profile captures the company
information supplied during registration (company name, contact person, phone,
country; vendors additionally record their supply categories). Profiles are
created atomically with the user in a single transaction.
"""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User

# JSONB on PostgreSQL, plain JSON elsewhere (unit tests on SQLite).
_JSON_TYPE = JSON().with_variant(JSONB(), "postgresql")


class BusinessClient(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Buyer company profile (one-to-one with a BUYER user)."""

    __tablename__ = "business_clients"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    country: Mapped[str] = mapped_column(String(100), nullable=False)

    user: Mapped[User] = relationship(back_populates="business_client")

    __table_args__ = (
        Index("ix_business_clients_company_name", "company_name"),
    )


class Vendor(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Vendor company profile (one-to-one with a VENDOR user)."""

    __tablename__ = "vendors"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    # Non-empty list of product/supply categories the vendor can supply.
    supply_categories: Mapped[list[str]] = mapped_column(_JSON_TYPE, nullable=False)

    user: Mapped[User] = relationship(back_populates="vendor")

    __table_args__ = (
        Index("ix_vendors_company_name", "company_name"),
    )
