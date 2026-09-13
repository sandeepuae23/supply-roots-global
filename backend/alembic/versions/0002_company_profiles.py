"""Company profile tables persisted at registration (Phase 1).

Adds ``business_clients`` (buyer company profile) and ``vendors`` (vendor company
profile, incl. supply categories). Each is one-to-one with a ``users`` row via a
unique ``user_id`` and cascades on user deletion.

Revision ID: 0002_company_profiles
Revises: 0001_initial_identity
Create Date: 2026-09-13

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0002_company_profiles"
down_revision: str | None = "0001_initial_identity"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _json() -> sa.types.TypeEngine:
    return sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    now = sa.text("now()")

    # -- business_clients (buyer profiles) --------------------------------
    op.create_table(
        "business_clients",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("company_name", sa.String(length=255), nullable=False),
        sa.Column("contact_name", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=50), nullable=False),
        sa.Column("country", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=now),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=now),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_business_clients_user_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_business_clients"),
        sa.UniqueConstraint("user_id", name="uq_business_clients_user_id"),
    )
    op.create_index(
        "ix_business_clients_company_name", "business_clients", ["company_name"], unique=False
    )

    # -- vendors (vendor profiles) ----------------------------------------
    op.create_table(
        "vendors",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("company_name", sa.String(length=255), nullable=False),
        sa.Column("contact_name", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=50), nullable=False),
        sa.Column("country", sa.String(length=100), nullable=False),
        sa.Column("supply_categories", _json(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=now),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=now),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_vendors_user_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_vendors"),
        sa.UniqueConstraint("user_id", name="uq_vendors_user_id"),
    )
    op.create_index("ix_vendors_company_name", "vendors", ["company_name"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_vendors_company_name", table_name="vendors")
    op.drop_table("vendors")
    op.drop_index("ix_business_clients_company_name", table_name="business_clients")
    op.drop_table("business_clients")
