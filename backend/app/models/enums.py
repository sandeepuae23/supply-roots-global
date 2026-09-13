"""Enumerations used across the identity domain.

Stored as constrained VARCHARs (``native_enum=False``) so the same schema works
on PostgreSQL (production/integration) and SQLite (fast unit tests) while still
enforcing allowed values with CHECK constraints.
"""

from __future__ import annotations

from enum import StrEnum


class UserType(StrEnum):
    ADMIN = "ADMIN"
    BUYER = "BUYER"
    VENDOR = "VENDOR"


class AccountStatus(StrEnum):
    PENDING_APPROVAL = "PENDING_APPROVAL"
    ACTIVE = "ACTIVE"
    LOCKED = "LOCKED"
    SUSPENDED = "SUSPENDED"
    REJECTED = "REJECTED"
    DISABLED = "DISABLED"


class ActorType(StrEnum):
    SYSTEM = "SYSTEM"
    ADMIN = "ADMIN"
    USER = "USER"


class LoginFailureReason(StrEnum):
    NONE = "NONE"
    UNKNOWN_IDENTIFIER = "UNKNOWN_IDENTIFIER"
    BAD_PASSWORD = "BAD_PASSWORD"
    NOT_ACTIVE = "NOT_ACTIVE"
    LOCKED = "LOCKED"


class AuditAction(StrEnum):
    REGISTER = "REGISTER"
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    LOCK = "LOCK"
    UNLOCK = "UNLOCK"
    SUSPEND = "SUSPEND"
    REACTIVATE = "REACTIVATE"
    DISABLE = "DISABLE"
    RESET_PASSWORD = "RESET_PASSWORD"
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    LOGIN_FAILURE = "LOGIN_FAILURE"
    PASSWORD_CHANGE = "PASSWORD_CHANGE"
    LOGOUT = "LOGOUT"
    LOGOUT_ALL = "LOGOUT_ALL"
    TOKEN_REUSE_DETECTED = "TOKEN_REUSE_DETECTED"


# Terminal statuses cannot transition further in the first release.
TERMINAL_STATUSES: frozenset[AccountStatus] = frozenset(
    {AccountStatus.REJECTED, AccountStatus.DISABLED}
)

# Statuses that permit issuing normal access tokens on login.
LOGIN_ALLOWED_STATUSES: frozenset[AccountStatus] = frozenset({AccountStatus.ACTIVE})
