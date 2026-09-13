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


# --- Phase 2: companies, membership, privacy --------------------------------


class CompanyType(StrEnum):
    """Mirrors the buyer/vendor split of ``UserType`` for company rows."""

    BUYER = "BUYER"
    VENDOR = "VENDOR"


class CompanyStatus(StrEnum):
    PENDING_APPROVAL = "PENDING_APPROVAL"
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    REJECTED = "REJECTED"


class CompanyRole(StrEnum):
    """Company-scoped roles.

    Deliberately separate from :class:`RoleName` in the global RBAC catalogue:
    company authority is read from ``company_members`` on every request and is
    never sourced from the access token's ``roles`` claim, which is stale by
    construction (contract section 1.3).
    """

    OWNER = "OWNER"
    ADMIN_MEMBER = "ADMIN_MEMBER"
    MEMBER = "MEMBER"
    VIEWER = "VIEWER"


class MembershipStatus(StrEnum):
    """An ``INVITED`` member has no company access whatsoever until acceptance."""

    INVITED = "INVITED"
    ACTIVE = "ACTIVE"
    REVOKED = "REVOKED"
    EXPIRED = "EXPIRED"


class AddressRole(StrEnum):
    BILLING = "BILLING"
    DELIVERY = "DELIVERY"
    PICKUP = "PICKUP"
    WAREHOUSE = "WAREHOUSE"


class NotificationChannel(StrEnum):
    EMAIL = "EMAIL"
    IN_APP = "IN_APP"
    WHATSAPP = "WHATSAPP"


class NotificationTopic(StrEnum):
    ACCOUNT_SECURITY = "ACCOUNT_SECURITY"
    COMPANY_REVIEW = "COMPANY_REVIEW"
    ENQUIRY = "ENQUIRY"
    QUOTATION = "QUOTATION"
    ORDER = "ORDER"
    DOCUMENT = "DOCUMENT"
    SHIPMENT = "SHIPMENT"
    MARKETING = "MARKETING"


class ConsentType(StrEnum):
    TERMS_OF_SERVICE = "TERMS_OF_SERVICE"
    PRIVACY_POLICY = "PRIVACY_POLICY"
    MARKETING = "MARKETING"
    DATA_PROCESSING = "DATA_PROCESSING"


class DeletionRequestStatus(StrEnum):
    REQUESTED = "REQUESTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    RETENTION_HOLD = "RETENTION_HOLD"
    ANONYMIZED = "ANONYMIZED"
    CANCELLED = "CANCELLED"


# ``ACCOUNT_SECURITY`` on ``EMAIL`` can never be switched off: lockouts,
# password changes and deletion decisions must always reach the account holder
# (contract section 4).
UNDISABLEABLE_NOTIFICATIONS: frozenset[tuple[NotificationTopic, NotificationChannel]] = (
    frozenset({(NotificationTopic.ACCOUNT_SECURITY, NotificationChannel.EMAIL)})
)

# Opt-in rather than opt-out.
OPT_IN_TOPICS: frozenset[NotificationTopic] = frozenset({NotificationTopic.MARKETING})

# Deletion states from which no further transition is possible.
TERMINAL_DELETION_STATUSES: frozenset[DeletionRequestStatus] = frozenset(
    {
        DeletionRequestStatus.REJECTED,
        DeletionRequestStatus.ANONYMIZED,
        DeletionRequestStatus.CANCELLED,
    }
)
