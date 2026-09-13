"""Stable permission and role catalog.

Permission names are stable, dotted identifiers (``<resource>.<action>``). The
role → permission mapping below is the single source of truth used both for
seeding the database and for reasoning about authorization. Phase 1 defines the
identity/account-governance permissions; later phases extend this catalog.
"""

from __future__ import annotations

from app.models.enums import UserType


class Perm:
    """Namespaced permission-name constants."""

    # Account governance
    USERS_READ = "users.read"
    ACCOUNTS_APPROVE = "accounts.approve"
    ACCOUNTS_REJECT = "accounts.reject"
    USERS_LOCK = "users.lock"
    USERS_UNLOCK = "users.unlock"
    USERS_SUSPEND = "users.suspend"
    USERS_REACTIVATE = "users.reactivate"
    USERS_DISABLE = "users.disable"
    USERS_RESET_PASSWORD = "users.reset_password"

    # Read-only governance views
    USERS_READ_LOGIN_ATTEMPTS = "users.read_login_attempts"
    USERS_READ_STATUS_HISTORY = "users.read_status_history"
    AUDIT_READ = "audit.read"
    DASHBOARD_READ = "dashboard.read"

    # Role administration
    ROLES_MANAGE = "roles.manage"


# name -> human description
PERMISSIONS: dict[str, str] = {
    Perm.USERS_READ: "List and view user accounts.",
    Perm.ACCOUNTS_APPROVE: "Approve a pending registration.",
    Perm.ACCOUNTS_REJECT: "Reject a pending registration.",
    Perm.USERS_LOCK: "Manually lock an active account.",
    Perm.USERS_UNLOCK: "Unlock a locked account.",
    Perm.USERS_SUSPEND: "Suspend an active account.",
    Perm.USERS_REACTIVATE: "Reactivate a suspended account.",
    Perm.USERS_DISABLE: "Permanently disable an account.",
    Perm.USERS_RESET_PASSWORD: "Reset an account password (issues a temporary password).",
    Perm.USERS_READ_LOGIN_ATTEMPTS: "View an account's login attempts.",
    Perm.USERS_READ_STATUS_HISTORY: "View an account's status history.",
    Perm.AUDIT_READ: "Search the administrator audit log.",
    Perm.DASHBOARD_READ: "View the administrator account dashboard.",
    Perm.ROLES_MANAGE: "Create, edit, and assign roles and permissions.",
}


class RoleName:
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    SALES = "SALES"
    QUALITY = "QUALITY"
    DOCUMENTATION = "DOCUMENTATION"
    LOGISTICS = "LOGISTICS"
    FINANCE = "FINANCE"
    BUYER_OWNER = "BUYER_OWNER"
    BUYER_MEMBER = "BUYER_MEMBER"
    VENDOR_OWNER = "VENDOR_OWNER"
    VENDOR_MEMBER = "VENDOR_MEMBER"


ROLE_DESCRIPTIONS: dict[str, str] = {
    RoleName.SUPER_ADMIN: "All system and role-management actions.",
    RoleName.ADMIN: "Account approval and operational administration.",
    RoleName.SALES: "Enquiries, sourcing, quotations, clients, and orders.",
    RoleName.QUALITY: "Specifications, samples, inspections, tests, incidents, evidence.",
    RoleName.DOCUMENTATION: "Commercial, quality, certificate, and shipment documents.",
    RoleName.LOGISTICS: "Shipments, routes, milestones, tracking, and cold chain.",
    RoleName.FINANCE: "Invoices, schedules, balances, refunds, and payment evidence.",
    RoleName.BUYER_OWNER: "Buyer company administration and all buyer workflows.",
    RoleName.BUYER_MEMBER: "Buyer workflows granted by the company owner.",
    RoleName.VENDOR_OWNER: "Supplier company administration and all vendor workflows.",
    RoleName.VENDOR_MEMBER: "Vendor workflows granted by the company owner.",
}

# Account-governance permissions granted to operational admin roles.
_ACCOUNT_ADMIN_PERMS: set[str] = {
    Perm.USERS_READ,
    Perm.ACCOUNTS_APPROVE,
    Perm.ACCOUNTS_REJECT,
    Perm.USERS_LOCK,
    Perm.USERS_UNLOCK,
    Perm.USERS_SUSPEND,
    Perm.USERS_REACTIVATE,
    Perm.USERS_DISABLE,
    Perm.USERS_RESET_PASSWORD,
    Perm.USERS_READ_LOGIN_ATTEMPTS,
    Perm.USERS_READ_STATUS_HISTORY,
    Perm.AUDIT_READ,
    Perm.DASHBOARD_READ,
}

# role name -> set of permission names (Phase 1 relevant subset).
ROLE_PERMISSIONS: dict[str, set[str]] = {
    RoleName.SUPER_ADMIN: set(PERMISSIONS.keys()),
    RoleName.ADMIN: set(_ACCOUNT_ADMIN_PERMS),
    RoleName.SALES: set(),
    RoleName.QUALITY: set(),
    RoleName.DOCUMENTATION: set(),
    RoleName.LOGISTICS: set(),
    RoleName.FINANCE: set(),
    RoleName.BUYER_OWNER: set(),
    RoleName.BUYER_MEMBER: set(),
    RoleName.VENDOR_OWNER: set(),
    RoleName.VENDOR_MEMBER: set(),
}

# Default role assigned to a freshly registered account, by user type.
DEFAULT_ROLE_BY_USER_TYPE: dict[UserType, str] = {
    UserType.BUYER: RoleName.BUYER_OWNER,
    UserType.VENDOR: RoleName.VENDOR_OWNER,
    UserType.ADMIN: RoleName.ADMIN,
}
