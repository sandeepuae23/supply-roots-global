"""SQLAlchemy ORM models for the identity and governance domain.

Importing this package registers every model on the shared ``Base.metadata`` so
that Alembic and test harnesses can discover the full schema.
"""

from app.models.audit_log import AdminAuditLog
from app.models.company import BusinessClient, Vendor
from app.models.enums import (
    AccountStatus,
    ActorType,
    AuditAction,
    LoginFailureReason,
    UserType,
)
from app.models.login_attempt import LoginAttempt
from app.models.password_history import PasswordHistory
from app.models.rbac import Permission, Role, RolePermission, UserRole
from app.models.refresh_token import RefreshToken
from app.models.status_history import AccountStatusHistory
from app.models.user import User

__all__ = [
    "AccountStatus",
    "AccountStatusHistory",
    "ActorType",
    "AdminAuditLog",
    "AuditAction",
    "BusinessClient",
    "LoginAttempt",
    "LoginFailureReason",
    "PasswordHistory",
    "Permission",
    "RefreshToken",
    "Role",
    "RolePermission",
    "User",
    "UserRole",
    "UserType",
    "Vendor",
]
