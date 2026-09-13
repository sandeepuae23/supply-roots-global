"""Initial identity & governance schema (Phase 1).

Creates users, roles/permissions and their joins, login attempts, rotating
refresh tokens, password history, immutable account status history, and the
append-only admin audit log — with case-insensitive identity uniqueness and the
status/type/history/token indexes required by the roadmap.

Revision ID: 0001_initial_identity
Revises:
Create Date: 2026-09-13

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001_initial_identity"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Enum value sets (stored as constrained VARCHARs; native_enum=False).
_USER_TYPE = ("ADMIN", "BUYER", "VENDOR")
_ACCOUNT_STATUS = (
    "PENDING_APPROVAL",
    "ACTIVE",
    "LOCKED",
    "SUSPENDED",
    "REJECTED",
    "DISABLED",
)
_LOGIN_FAILURE_REASON = (
    "NONE",
    "UNKNOWN_IDENTIFIER",
    "BAD_PASSWORD",
    "NOT_ACTIVE",
    "LOCKED",
)
_ACTOR_TYPE = ("SYSTEM", "ADMIN", "USER")
_AUDIT_ACTION = (
    "REGISTER",
    "APPROVE",
    "REJECT",
    "LOCK",
    "UNLOCK",
    "SUSPEND",
    "REACTIVATE",
    "DISABLE",
    "RESET_PASSWORD",
    "LOGIN_SUCCESS",
    "LOGIN_FAILURE",
    "PASSWORD_CHANGE",
    "LOGOUT",
    "LOGOUT_ALL",
    "TOKEN_REUSE_DETECTED",
)


def _enum(*values: str, name: str) -> sa.Enum:
    return sa.Enum(*values, name=name, native_enum=False, length=64)


def _json() -> sa.types.TypeEngine:
    return sa.JSON().with_variant(postgresql.JSONB(), "postgresql")


def upgrade() -> None:
    now = sa.text("now()")

    # -- users -------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("username", sa.String(length=150), nullable=False),
        sa.Column("normalized_username", sa.String(length=150), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("normalized_email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("user_type", _enum(*_USER_TYPE, name="user_type"), nullable=False),
        sa.Column(
            "status",
            _enum(*_ACCOUNT_STATUS, name="account_status"),
            nullable=False,
            server_default="PENDING_APPROVAL",
        ),
        sa.Column(
            "failed_login_attempts",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_by", sa.Uuid(), nullable=True),
        sa.Column("suspended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("suspended_by", sa.Uuid(), nullable=True),
        sa.Column("suspension_reason", sa.String(length=1000), nullable=True),
        sa.Column(
            "must_change_password",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("temporary_password_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("auth_version", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=now),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=now),
        sa.CheckConstraint(
            "failed_login_attempts >= 0", name="ck_users_failed_login_attempts_nonneg"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
    )
    op.create_index(
        "uq_users_normalized_username", "users", ["normalized_username"], unique=True
    )
    op.create_index("uq_users_normalized_email", "users", ["normalized_email"], unique=True)
    op.create_index("ix_users_status", "users", ["status"], unique=False)
    op.create_index("ix_users_user_type", "users", ["user_type"], unique=False)

    # -- roles -------------------------------------------------------------
    op.create_table(
        "roles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=now),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=now),
        sa.PrimaryKeyConstraint("id", name="pk_roles"),
        sa.UniqueConstraint("name", name="uq_roles_name"),
    )

    # -- permissions -------------------------------------------------------
    op.create_table(
        "permissions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=now),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=now),
        sa.PrimaryKeyConstraint("id", name="pk_permissions"),
        sa.UniqueConstraint("name", name="uq_permissions_name"),
    )

    # -- role_permissions --------------------------------------------------
    op.create_table(
        "role_permissions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("role_id", sa.Uuid(), nullable=False),
        sa.Column("permission_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["role_id"], ["roles.id"], name="fk_role_permissions_role_id_roles", ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["permission_id"],
            ["permissions.id"],
            name="fk_role_permissions_permission_id_permissions",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_role_permissions"),
        sa.UniqueConstraint("role_id", "permission_id", name="uq_role_permissions_role_permission"),
    )

    # -- user_roles --------------------------------------------------------
    op.create_table(
        "user_roles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("role_id", sa.Uuid(), nullable=False),
        sa.Column("assigned_by", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=now),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=now),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_user_roles_user_id_users", ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["role_id"], ["roles.id"], name="fk_user_roles_role_id_roles", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="pk_user_roles"),
        sa.UniqueConstraint("user_id", "role_id", name="uq_user_roles_user_role"),
    )

    # -- login_attempts ----------------------------------------------------
    op.create_table(
        "login_attempts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("identifier", sa.String(length=320), nullable=False),
        sa.Column("successful", sa.Boolean(), nullable=False),
        sa.Column(
            "failure_reason",
            _enum(*_LOGIN_FAILURE_REASON, name="login_failure_reason"),
            nullable=False,
        ),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.String(length=512), nullable=True),
        sa.Column("request_id", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=now),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_login_attempts_user_id_users",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_login_attempts"),
    )
    op.create_index("ix_login_attempts_user_id", "login_attempts", ["user_id"], unique=False)
    op.create_index("ix_login_attempts_created_at", "login_attempts", ["created_at"], unique=False)

    # -- refresh_tokens ----------------------------------------------------
    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("family_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("parent_id", sa.Uuid(), nullable=True),
        sa.Column("replaced_by_id", sa.Uuid(), nullable=True),
        sa.Column("auth_version", sa.Integer(), nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False, server_default=now),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_reason", sa.String(length=64), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.String(length=512), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_refresh_tokens_user_id_users",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["parent_id"],
            ["refresh_tokens.id"],
            name="fk_refresh_tokens_parent_id_refresh_tokens",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["replaced_by_id"],
            ["refresh_tokens.id"],
            name="fk_refresh_tokens_replaced_by_id_refresh_tokens",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_refresh_tokens"),
        sa.UniqueConstraint("token_hash", name="uq_refresh_tokens_token_hash"),
    )
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"], unique=False)
    op.create_index("ix_refresh_tokens_family_id", "refresh_tokens", ["family_id"], unique=False)

    # -- password_history --------------------------------------------------
    op.create_table(
        "password_history",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("set_reason", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=now),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_password_history_user_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_password_history"),
    )
    op.create_index("ix_password_history_user_id", "password_history", ["user_id"], unique=False)

    # -- account_status_history -------------------------------------------
    op.create_table(
        "account_status_history",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column(
            "previous_status",
            _enum(*_ACCOUNT_STATUS, name="account_status_prev"),
            nullable=True,
        ),
        sa.Column(
            "new_status",
            _enum(*_ACCOUNT_STATUS, name="account_status_new"),
            nullable=False,
        ),
        sa.Column("reason", sa.String(length=1000), nullable=False),
        sa.Column(
            "actor_type", _enum(*_ACTOR_TYPE, name="status_actor_type"), nullable=False
        ),
        sa.Column("actor_id", sa.Uuid(), nullable=True),
        sa.Column("request_id", sa.String(length=64), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=now),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_account_status_history_user_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_account_status_history"),
    )
    op.create_index(
        "ix_account_status_history_user_id", "account_status_history", ["user_id"], unique=False
    )
    op.create_index(
        "ix_account_status_history_created_at",
        "account_status_history",
        ["created_at"],
        unique=False,
    )

    # -- admin_audit_logs --------------------------------------------------
    op.create_table(
        "admin_audit_logs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("action", _enum(*_AUDIT_ACTION, name="audit_action"), nullable=False),
        sa.Column("actor_type", _enum(*_ACTOR_TYPE, name="audit_actor_type"), nullable=False),
        sa.Column("actor_id", sa.Uuid(), nullable=True),
        sa.Column("target_user_id", sa.Uuid(), nullable=True),
        sa.Column("reason", sa.String(length=1000), nullable=True),
        sa.Column("request_id", sa.String(length=64), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("context", _json(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=now),
        sa.ForeignKeyConstraint(
            ["target_user_id"],
            ["users.id"],
            name="fk_admin_audit_logs_target_user_id_users",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_admin_audit_logs"),
    )
    op.create_index(
        "ix_admin_audit_logs_target_user_id", "admin_audit_logs", ["target_user_id"], unique=False
    )
    op.create_index("ix_admin_audit_logs_actor_id", "admin_audit_logs", ["actor_id"], unique=False)
    op.create_index("ix_admin_audit_logs_action", "admin_audit_logs", ["action"], unique=False)
    op.create_index(
        "ix_admin_audit_logs_created_at", "admin_audit_logs", ["created_at"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_admin_audit_logs_created_at", table_name="admin_audit_logs")
    op.drop_index("ix_admin_audit_logs_action", table_name="admin_audit_logs")
    op.drop_index("ix_admin_audit_logs_actor_id", table_name="admin_audit_logs")
    op.drop_index("ix_admin_audit_logs_target_user_id", table_name="admin_audit_logs")
    op.drop_table("admin_audit_logs")

    op.drop_index("ix_account_status_history_created_at", table_name="account_status_history")
    op.drop_index("ix_account_status_history_user_id", table_name="account_status_history")
    op.drop_table("account_status_history")

    op.drop_index("ix_password_history_user_id", table_name="password_history")
    op.drop_table("password_history")

    op.drop_index("ix_refresh_tokens_family_id", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_user_id", table_name="refresh_tokens")
    op.drop_table("refresh_tokens")

    op.drop_index("ix_login_attempts_created_at", table_name="login_attempts")
    op.drop_index("ix_login_attempts_user_id", table_name="login_attempts")
    op.drop_table("login_attempts")

    op.drop_table("user_roles")
    op.drop_table("role_permissions")
    op.drop_table("permissions")
    op.drop_table("roles")

    op.drop_index("ix_users_user_type", table_name="users")
    op.drop_index("ix_users_status", table_name="users")
    op.drop_index("uq_users_normalized_email", table_name="users")
    op.drop_index("uq_users_normalized_username", table_name="users")
    op.drop_table("users")
