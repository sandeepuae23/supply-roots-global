"""Phase 2: company identity, membership, profiles, preferences and privacy.

Converts the Phase 1 1:1 link (``business_clients`` / ``vendors`` keyed by
``user_id``) into 1:N membership:

* ``companies`` becomes the canonical company row;
* ``company_members`` becomes the sole authority for who may act for a company;
* the profile tables are re-keyed to ``company_id``;
* the registering user is backfilled as that company's single ``ACTIVE``
  ``OWNER``.

The conversion rewrites the ownership model of live data, so it follows the
explicit order in contract section 8.1 and asserts its own correctness before
dropping anything (8.2). Every assertion runs inside the migration
transaction — a failure rolls back, and because the container entrypoint runs
under ``set -eu`` the container then refuses to serve rather than starting on a
half-migrated schema.

Revision ID: 0003_companies_and_membership
Revises: 0002_company_profiles
Create Date: 2026-09-14

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0003_companies_and_membership"
down_revision: str | None = "0002_company_profiles"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

JSON_TYPE = sa.JSON().with_variant(postgresql.JSONB(), "postgresql")

COMPANY_TYPES = "'BUYER', 'VENDOR'"
COMPANY_STATUSES = "'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'REJECTED'"
COMPANY_ROLES = "'OWNER', 'ADMIN_MEMBER', 'MEMBER', 'VIEWER'"
MEMBERSHIP_STATUSES = "'INVITED', 'ACTIVE', 'REVOKED', 'EXPIRED'"
ADDRESS_ROLES = "'BILLING', 'DELIVERY', 'PICKUP', 'WAREHOUSE'"
NOTIFICATION_TOPICS = (
    "'ACCOUNT_SECURITY', 'COMPANY_REVIEW', 'ENQUIRY', 'QUOTATION', "
    "'ORDER', 'DOCUMENT', 'SHIPMENT', 'MARKETING'"
)
NOTIFICATION_CHANNELS = "'EMAIL', 'IN_APP', 'WHATSAPP'"
CONSENT_TYPES = "'TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'MARKETING', 'DATA_PROCESSING'"
DELETION_STATUSES = (
    "'REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', "
    "'RETENTION_HOLD', 'ANONYMIZED', 'CANCELLED'"
)

# Company roles removed from the GLOBAL RBAC catalogue (contract section 1.4).
# Safe to delete: all four carry an empty permission set, so no capability is
# lost. Company authority now lives only in company_members.role.
LEGACY_COMPANY_ROLES = ("BUYER_OWNER", "BUYER_MEMBER", "VENDOR_OWNER", "VENDOR_MEMBER")

_TIMESTAMPS = (
    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
)


def _assert(condition_sql: str, message: str) -> None:
    """Raise unless the scalar SQL expression evaluates truthy.

    Used for the section 8.2 preflight assertions. Raising inside the migration
    transaction rolls the whole conversion back.
    """
    result = op.get_bind().execute(sa.text(condition_sql)).scalar()
    if not result:
        raise RuntimeError(f"0003 migration aborted: {message}")


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    # -- 8.1 step 1: new tables ------------------------------------------- #
    op.create_table(
        "companies",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("legal_name", sa.String(255), nullable=False),
        sa.Column("trading_name", sa.String(255), nullable=True),
        sa.Column("company_type", sa.String(16), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("registration_number", sa.String(100), nullable=True),
        sa.Column("tax_id", sa.String(100), nullable=True),
        sa.Column("country", sa.String(100), nullable=False),
        sa.Column("website", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        *_TIMESTAMPS,
        sa.CheckConstraint(f"company_type IN ({COMPANY_TYPES})", name="ck_companies_company_type_valid"),
        sa.CheckConstraint(f"status IN ({COMPANY_STATUSES})", name="ck_companies_status_valid"),
    )
    op.create_index("ix_companies_company_type_status", "companies", ["company_type", "status"])
    op.create_index("ix_companies_legal_name", "companies", ["legal_name"])

    op.create_table(
        "company_members",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("company_id", sa.Uuid(), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(32), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("user_type", sa.String(16), nullable=False),
        sa.Column("company_type", sa.String(16), nullable=False),
        sa.Column("invited_by_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("invited_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("invitation_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=True),
        *_TIMESTAMPS,
        sa.UniqueConstraint("company_id", "user_id", name="uq_company_members_company_user"),
        sa.CheckConstraint(f"role IN ({COMPANY_ROLES})", name="ck_company_members_role_valid"),
        sa.CheckConstraint(f"status IN ({MEMBERSHIP_STATUSES})", name="ck_company_members_status_valid"),
        # Same-type membership, enforced by the database so a buyer can never
        # join a vendor company even through a manual query.
        sa.CheckConstraint("user_type = company_type", name="ck_company_members_member_type_matches_company"),
    )
    op.create_index("ix_company_members_user_id_status", "company_members", ["user_id", "status"])
    # Exactly one ACTIVE OWNER per company: a partial unique index makes a
    # second owner impossible rather than merely unlikely (contract 1.7).
    op.create_index(
        "uq_company_members_single_active_owner",
        "company_members",
        ["company_id"],
        unique=True,
        postgresql_where=sa.text("role = 'OWNER' AND status = 'ACTIVE'"),
        sqlite_where=sa.text("role = 'OWNER' AND status = 'ACTIVE'"),
    )

    op.create_table(
        "company_addresses",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("company_id", sa.Uuid(), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(32), nullable=False),
        sa.Column("label", sa.String(120), nullable=True),
        sa.Column("line1", sa.String(255), nullable=False),
        sa.Column("line2", sa.String(255), nullable=True),
        sa.Column("city", sa.String(120), nullable=False),
        sa.Column("region", sa.String(120), nullable=True),
        sa.Column("postal_code", sa.String(32), nullable=True),
        sa.Column("country", sa.String(100), nullable=False),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.false()),
        *_TIMESTAMPS,
        sa.CheckConstraint(f"role IN ({ADDRESS_ROLES})", name="ck_company_addresses_role_valid"),
    )
    op.create_index("ix_company_addresses_company_id_role", "company_addresses", ["company_id", "role"])

    op.create_table(
        "company_contacts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("company_id", sa.Uuid(), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("role_title", sa.String(120), nullable=True),
        sa.Column("email", sa.String(320), nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.false()),
        *_TIMESTAMPS,
    )
    op.create_index("ix_company_contacts_company_id", "company_contacts", ["company_id"])

    op.create_table(
        "vendor_facilities",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("company_id", sa.Uuid(), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("facility_type", sa.String(64), nullable=True),
        sa.Column("city", sa.String(120), nullable=True),
        sa.Column("country", sa.String(100), nullable=False),
        sa.Column("capacity_note", sa.Text(), nullable=True),
        sa.Column("certifications", JSON_TYPE, nullable=False),
        *_TIMESTAMPS,
    )
    op.create_index("ix_vendor_facilities_company_id", "vendor_facilities", ["company_id"])

    op.create_table(
        "vendor_sourcing_locations",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("company_id", sa.Uuid(), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("region", sa.String(255), nullable=False),
        sa.Column("country", sa.String(100), nullable=False),
        sa.Column("products", JSON_TYPE, nullable=False),
        sa.Column("season_note", sa.Text(), nullable=True),
        *_TIMESTAMPS,
    )
    op.create_index("ix_vendor_sourcing_locations_company_id", "vendor_sourcing_locations", ["company_id"])

    op.create_table(
        "user_profiles",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("full_name", sa.String(255), nullable=True),
        sa.Column("job_title", sa.String(120), nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("avatar_url", sa.String(512), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        *_TIMESTAMPS,
    )

    op.create_table(
        "user_preferences",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("language", sa.String(16), nullable=False, server_default="en"),
        sa.Column("currency", sa.String(8), nullable=False, server_default="AED"),
        sa.Column("timezone", sa.String(64), nullable=False, server_default="UTC"),
        *_TIMESTAMPS,
    )

    op.create_table(
        "notification_preferences",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("topic", sa.String(32), nullable=False),
        sa.Column("channel", sa.String(32), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        *_TIMESTAMPS,
        sa.UniqueConstraint("user_id", "topic", "channel", name="uq_notification_preferences_user_topic_channel"),
        sa.CheckConstraint(f"topic IN ({NOTIFICATION_TOPICS})", name="ck_notification_preferences_topic_valid"),
        sa.CheckConstraint(f"channel IN ({NOTIFICATION_CHANNELS})", name="ck_notification_preferences_channel_valid"),
    )
    op.create_index("ix_notification_preferences_user_id", "notification_preferences", ["user_id"])

    op.create_table(
        "user_devices",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("device_key", sa.String(64), nullable=False),
        sa.Column("label", sa.String(120), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        *_TIMESTAMPS,
        sa.UniqueConstraint("user_id", "device_key", name="uq_user_devices_user_device_key"),
    )
    op.create_index("ix_user_devices_user_id", "user_devices", ["user_id"])

    op.create_table(
        "privacy_consents",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("consent_type", sa.String(32), nullable=False),
        sa.Column("policy_version", sa.String(32), nullable=False),
        sa.Column("granted", sa.Boolean(), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("source_ip", sa.String(45), nullable=True),
        *_TIMESTAMPS,
        sa.CheckConstraint(f"consent_type IN ({CONSENT_TYPES})", name="ck_privacy_consents_consent_type_valid"),
    )
    op.create_index("ix_privacy_consents_user_id_recorded_at", "privacy_consents", ["user_id", "recorded_at"])

    op.create_table(
        "account_deletion_requests",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("company_id", sa.Uuid(), sa.ForeignKey("companies.id", ondelete="SET NULL"), nullable=True),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("decided_by_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decision_reason", sa.Text(), nullable=True),
        sa.Column("hold_reason", sa.Text(), nullable=True),
        sa.Column("anonymized_at", sa.DateTime(timezone=True), nullable=True),
        *_TIMESTAMPS,
        sa.CheckConstraint(f"status IN ({DELETION_STATUSES})", name="ck_account_deletion_requests_status_valid"),
    )
    op.create_index("ix_account_deletion_requests_user_id_status", "account_deletion_requests", ["user_id", "status"])
    op.create_index("ix_account_deletion_requests_status", "account_deletion_requests", ["status"])

    # -- 8.1 steps 2-3: backfill companies and owner memberships ----------- #
    # A company row per existing profile, then the registrant as its single
    # ACTIVE OWNER. Company status is derived from the owner's account status:
    # an account still awaiting approval must not yield an ACTIVE company.
    uuid_fn = "gen_random_uuid()" if is_postgres else "lower(hex(randomblob(16)))"
    for source, company_type in (("business_clients", "BUYER"), ("vendors", "VENDOR")):
        op.execute(
            sa.text(
                f"""
                INSERT INTO companies (
                    id, legal_name, company_type, status, country, phone,
                    created_at, updated_at
                )
                SELECT {uuid_fn}, s.company_name, '{company_type}',
                       CASE WHEN u.status = 'ACTIVE' THEN 'ACTIVE'
                            WHEN u.status = 'REJECTED' THEN 'REJECTED'
                            WHEN u.status IN ('SUSPENDED', 'LOCKED', 'DISABLED') THEN 'SUSPENDED'
                            ELSE 'PENDING_APPROVAL' END,
                       s.country, s.phone, s.created_at, s.updated_at
                FROM {source} s
                JOIN users u ON u.id = s.user_id
                """
            )
        )

    # -- 8.1 step 4: add company_id to the profile tables ------------------ #
    for source, company_type in (("business_clients", "BUYER"), ("vendors", "VENDOR")):
        op.add_column(source, sa.Column("company_id", sa.Uuid(), nullable=True))
        # Match on the tuple that uniquely identifies the backfilled row.
        op.execute(
            sa.text(
                f"""
                UPDATE {source}
                SET company_id = (
                    SELECT c.id FROM companies c
                    WHERE c.legal_name = {source}.company_name
                      AND c.company_type = '{company_type}'
                      AND c.country = {source}.country
                      AND c.created_at = {source}.created_at
                    LIMIT 1
                )
                """
            )
        )
        op.execute(
            sa.text(
                f"""
                INSERT INTO company_members (
                    id, company_id, user_id, role, status, user_type,
                    company_type, joined_at, created_at, updated_at
                )
                SELECT {uuid_fn}, s.company_id, s.user_id, 'OWNER', 'ACTIVE',
                       u.user_type, '{company_type}', s.created_at,
                       s.created_at, s.updated_at
                FROM {source} s
                JOIN users u ON u.id = s.user_id
                WHERE s.company_id IS NOT NULL
                """
            )
        )

    # -- 8.2 assertions: abort rather than half-complete ------------------- #
    _assert(
        """
        SELECT (SELECT COUNT(*) FROM companies)
             = (SELECT COUNT(*) FROM business_clients) + (SELECT COUNT(*) FROM vendors)
        """,
        "company count does not equal the number of source profile rows — "
        "a source row was lost or duplicated during backfill",
    )
    for source in ("business_clients", "vendors"):
        _assert(
            f"SELECT NOT EXISTS (SELECT 1 FROM {source} WHERE company_id IS NULL)",
            f"{source} has rows with no company_id after backfill",
        )
    _assert(
        """
        SELECT NOT EXISTS (
            SELECT company_id FROM company_members
            WHERE role = 'OWNER' AND status = 'ACTIVE'
            GROUP BY company_id HAVING COUNT(*) <> 1
        )
        """,
        "a company does not have exactly one ACTIVE OWNER",
    )
    _assert(
        "SELECT NOT EXISTS (SELECT 1 FROM company_members WHERE user_type <> company_type)",
        "a membership has a user_type that differs from its company_type",
    )
    _assert(
        """
        SELECT NOT EXISTS (
            SELECT 1 FROM company_members m
            LEFT JOIN companies c ON c.id = m.company_id
            WHERE c.id IS NULL
        )
        """,
        "orphaned company_id reference in company_members",
    )

    # -- 8.1 step 5: only now drop the old user_id link -------------------- #
    for source in ("business_clients", "vendors"):
        with op.batch_alter_table(source) as batch:
            batch.alter_column("company_id", existing_type=sa.Uuid(), nullable=False)
            batch.create_unique_constraint(f"uq_{source}_company_id", ["company_id"])
            batch.drop_column("user_id")

    # -- 8.1 step 6: de-authorise the global company roles ----------------- #
    role_list = ", ".join(f"'{r}'" for r in LEGACY_COMPANY_ROLES)
    op.execute(
        sa.text(
            f"DELETE FROM user_roles WHERE role_id IN "
            f"(SELECT id FROM roles WHERE name IN ({role_list}))"
        )
    )
    op.execute(
        sa.text(
            f"DELETE FROM role_permissions WHERE role_id IN "
            f"(SELECT id FROM roles WHERE name IN ({role_list}))"
        )
    )
    op.execute(sa.text(f"DELETE FROM roles WHERE name IN ({role_list})"))


def downgrade() -> None:
    """Reverse the conversion, refusing when it cannot be done faithfully.

    Contract section 8.3: the pre-0003 schema has no way to represent a company
    with more than one member, so a downgrade that proceeded would silently
    discard team members. It refuses instead. A downgrade that stops is better
    than one that loses data quietly.
    """
    _assert(
        """
        SELECT NOT EXISTS (
            SELECT company_id FROM company_members
            WHERE status = 'ACTIVE'
            GROUP BY company_id HAVING COUNT(*) > 1
        )
        """,
        "refusing to downgrade: at least one company has more than one ACTIVE "
        "member, and the pre-0003 schema cannot represent that. Remove the "
        "additional memberships first if this downgrade is genuinely intended.",
    )

    # Restore user_id on the profile tables from the OWNER membership.
    for source in ("business_clients", "vendors"):
        op.add_column(source, sa.Column("user_id", sa.Uuid(), nullable=True))
        op.execute(
            sa.text(
                f"""
                UPDATE {source}
                SET user_id = (
                    SELECT m.user_id FROM company_members m
                    WHERE m.company_id = {source}.company_id
                      AND m.role = 'OWNER' AND m.status = 'ACTIVE'
                    LIMIT 1
                )
                """
            )
        )
        _assert(
            f"SELECT NOT EXISTS (SELECT 1 FROM {source} WHERE user_id IS NULL)",
            f"{source} row has no owner to restore user_id from",
        )
        with op.batch_alter_table(source) as batch:
            batch.alter_column("user_id", existing_type=sa.Uuid(), nullable=False)
            batch.create_unique_constraint(f"uq_{source}_user_id", ["user_id"])
            batch.drop_constraint(f"uq_{source}_company_id", type_="unique")
            batch.drop_column("company_id")

    for table in (
        "account_deletion_requests",
        "privacy_consents",
        "user_devices",
        "notification_preferences",
        "user_preferences",
        "user_profiles",
        "vendor_sourcing_locations",
        "vendor_facilities",
        "company_contacts",
        "company_addresses",
        "company_members",
        "companies",
    ):
        op.drop_table(table)

    # Re-create the global company roles this migration removed.
    uuid_fn = (
        "gen_random_uuid()"
        if op.get_bind().dialect.name == "postgresql"
        else "lower(hex(randomblob(16)))"
    )
    for role in LEGACY_COMPANY_ROLES:
        op.execute(
            sa.text(
                f"INSERT INTO roles (id, name, description, created_at, updated_at) "
                f"SELECT {uuid_fn}, '{role}', 'Restored by 0003 downgrade', "
                f"CURRENT_TIMESTAMP, CURRENT_TIMESTAMP "
                f"WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = '{role}')"
            )
        )
