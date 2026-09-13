"""Authentication service: registration, transactional login, refresh, logout.

The login flow implements the roadmap's transactional lockout: the user row is
selected ``FOR UPDATE`` so concurrent failed attempts serialize and the account
locks exactly once on the configured threshold. Unknown identifiers are verified
against a dummy Argon2id hash to equalise timing and avoid account enumeration.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.context import get_request_id
from app.core.errors import (
    AuthenticationError,
    ConflictError,
    PermissionDeniedError,
    ValidationAppError,
)
from app.core.security import (
    create_access_token,
    hash_password,
    verify_dummy_password,
    verify_password,
)
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
from app.models.user import User
from app.modules import audit
from app.modules.auth import tokens
from app.modules.rbac import service as rbac_service
from app.modules.rbac.constants import DEFAULT_ROLE_BY_USER_TYPE

_GENERIC_LOGIN_ERROR = "Invalid credentials."

_STATUS_ERROR_CODES: dict[AccountStatus, str] = {
    AccountStatus.PENDING_APPROVAL: "account_pending_approval",
    AccountStatus.LOCKED: "account_locked",
    AccountStatus.SUSPENDED: "account_suspended",
    AccountStatus.REJECTED: "account_rejected",
    AccountStatus.DISABLED: "account_disabled",
}

_STATUS_ERROR_MESSAGES: dict[AccountStatus, str] = {
    AccountStatus.PENDING_APPROVAL: "Your account is pending administrator approval.",
    AccountStatus.LOCKED: "Your account is locked. Contact an administrator.",
    AccountStatus.SUSPENDED: "Your account is suspended. Contact an administrator.",
    AccountStatus.REJECTED: "Your registration was rejected.",
    AccountStatus.DISABLED: "Your account has been disabled.",
}


def normalize_username(username: str) -> str:
    return username.strip().lower()


def normalize_email(email: str) -> str:
    return email.strip().lower()


@dataclass
class IssuedTokens:
    user: User
    access_token: str
    access_expires_at: datetime
    refresh_token: str
    must_change_password: bool


def _now() -> datetime:
    return datetime.now(UTC)


# --------------------------------------------------------------------------- #
# Registration
# --------------------------------------------------------------------------- #
@dataclass
class CompanyProfile:
    """Company information supplied at registration, validated in the schema."""

    company_name: str
    contact_name: str
    phone: str
    country: str
    # Required for vendors; must be None for buyers.
    supply_categories: list[str] | None = None


async def register_user(
    session: AsyncSession,
    *,
    username: str,
    email: str,
    password: str,
    user_type: UserType,
    profile: CompanyProfile,
    ip_address: str | None = None,
) -> User:
    """Register a buyer or vendor account in ``PENDING_APPROVAL`` status.

    The matching company profile (``business_clients`` for buyers, ``vendors``
    for vendors) is persisted in the SAME transaction as the user — registration
    is all-or-nothing. Public admin registration is refused. Concurrent
    case-insensitive duplicates are resolved by the normalized unique indexes:
    exactly one row is created and the rest raise :class:`ConflictError`.
    """
    if user_type == UserType.ADMIN:
        raise PermissionDeniedError(
            "Administrator accounts cannot be created through public registration.",
            code="admin_registration_forbidden",
        )

    # Enforce the correct profile shape per user type.
    if user_type == UserType.VENDOR:
        if not profile.supply_categories:
            raise ValidationAppError(
                "Vendor registration requires at least one supply category.",
                code="supply_categories_required",
            )
    elif profile.supply_categories is not None:
        raise ValidationAppError(
            "supply_categories is only valid for vendor registration.",
            code="supply_categories_not_allowed",
        )

    user = User(
        username=username.strip(),
        normalized_username=normalize_username(username),
        email=email.strip(),
        normalized_email=normalize_email(email),
        password_hash=hash_password(password),
        user_type=user_type,
        status=AccountStatus.PENDING_APPROVAL,
        password_changed_at=_now(),
    )
    session.add(user)
    try:
        await session.flush()
    except IntegrityError as exc:
        await session.rollback()
        raise ConflictError(
            "An account with this username or email already exists.",
            code="account_exists",
        ) from exc

    # Persist the company profile atomically alongside the user.
    if user_type == UserType.BUYER:
        session.add(
            BusinessClient(
                user_id=user.id,
                company_name=profile.company_name,
                contact_name=profile.contact_name,
                phone=profile.phone,
                country=profile.country,
            )
        )
    else:  # UserType.VENDOR
        session.add(
            Vendor(
                user_id=user.id,
                company_name=profile.company_name,
                contact_name=profile.contact_name,
                phone=profile.phone,
                country=profile.country,
                supply_categories=list(profile.supply_categories or []),
            )
        )

    session.add(
        PasswordHistory(user_id=user.id, password_hash=user.password_hash, set_reason="REGISTER")
    )
    await rbac_service.assign_role(
        session, user_id=user.id, role_name=DEFAULT_ROLE_BY_USER_TYPE[user_type]
    )
    audit.record_status_history(
        session,
        user_id=user.id,
        previous_status=None,
        new_status=AccountStatus.PENDING_APPROVAL,
        reason="REGISTRATION_SUBMITTED",
        actor_type=ActorType.USER,
        actor_id=user.id,
        ip_address=ip_address,
    )
    audit.record_audit(
        session,
        action=AuditAction.REGISTER,
        actor_type=ActorType.USER,
        actor_id=user.id,
        target_user_id=user.id,
        reason="REGISTRATION_SUBMITTED",
        ip_address=ip_address,
        context={"user_type": user_type.value},
    )
    await session.commit()
    await session.refresh(user)
    return user


# --------------------------------------------------------------------------- #
# Login
# --------------------------------------------------------------------------- #
def _record_attempt(
    session: AsyncSession,
    *,
    user_id: uuid.UUID | None,
    identifier: str,
    successful: bool,
    reason: LoginFailureReason,
    ip_address: str | None,
    user_agent: str | None,
) -> None:
    session.add(
        LoginAttempt(
            user_id=user_id,
            identifier=identifier,
            successful=successful,
            failure_reason=reason,
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=get_request_id(),
        )
    )


async def _issue_login_tokens(
    session: AsyncSession,
    *,
    user: User,
    ip_address: str | None,
    user_agent: str | None,
) -> IssuedTokens:
    role_names = await rbac_service.get_user_role_names(session, user.id)
    access_token, expires_at = create_access_token(
        subject=user.id,
        auth_version=user.auth_version,
        must_change_password=user.must_change_password,
        roles=role_names,
    )
    _, refresh_value = await tokens.issue_refresh_token(
        session, user=user, ip_address=ip_address, user_agent=user_agent
    )
    return IssuedTokens(
        user=user,
        access_token=access_token,
        access_expires_at=expires_at,
        refresh_token=refresh_value,
        must_change_password=user.must_change_password,
    )


async def authenticate(
    session: AsyncSession,
    *,
    identifier: str,
    password: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> IssuedTokens:
    """Authenticate a user transactionally, applying lockout rules.

    Raises :class:`AuthenticationError` on any failure with a generic message for
    unknown identifiers and wrong passwords. When credentials are correct but the
    account is not ``ACTIVE``, a status-specific (still non-enumerating) error is
    returned so the UI can route to the correct screen.
    """
    normalized = identifier.strip().lower()
    result = await session.execute(
        select(User)
        .where(
            (User.normalized_username == normalized) | (User.normalized_email == normalized)
        )
        .with_for_update()
    )
    user = result.scalar_one_or_none()

    # Unknown identifier: dummy-verify to equalise timing, then generic error.
    if user is None:
        verify_dummy_password(password)
        _record_attempt(
            session,
            user_id=None,
            identifier=normalized,
            successful=False,
            reason=LoginFailureReason.UNKNOWN_IDENTIFIER,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await session.commit()
        raise AuthenticationError(_GENERIC_LOGIN_ERROR)

    password_ok = verify_password(password, user.password_hash)

    # Wrong password.
    if not password_ok:
        is_active = user.status == AccountStatus.ACTIVE
        if is_active:
            user.failed_login_attempts += 1
            reason = LoginFailureReason.BAD_PASSWORD
            if user.failed_login_attempts >= settings.max_failed_login_attempts:
                previous_status = user.status
                user.status = AccountStatus.LOCKED
                user.locked_at = _now()
                audit.record_status_history(
                    session,
                    user_id=user.id,
                    previous_status=previous_status,
                    new_status=AccountStatus.LOCKED,
                    reason="MAX_FAILED_LOGIN_ATTEMPTS",
                    actor_type=ActorType.SYSTEM,
                    actor_id=None,
                    ip_address=ip_address,
                )
                audit.record_audit(
                    session,
                    action=AuditAction.LOCK,
                    actor_type=ActorType.SYSTEM,
                    actor_id=None,
                    target_user_id=user.id,
                    reason="MAX_FAILED_LOGIN_ATTEMPTS",
                    ip_address=ip_address,
                    context={"failed_login_attempts": user.failed_login_attempts},
                )
                # Bump auth_version and revoke sessions on system lock.
                user.auth_version += 1
                await tokens.revoke_all_for_user(
                    session, user_id=user.id, reason="ACCOUNT_LOCKED"
                )
        else:
            reason = LoginFailureReason.BAD_PASSWORD
        _record_attempt(
            session,
            user_id=user.id,
            identifier=normalized,
            successful=False,
            reason=reason,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await session.commit()
        raise AuthenticationError(_GENERIC_LOGIN_ERROR)

    # Correct password but non-active account: deny with status-specific error.
    if user.status != AccountStatus.ACTIVE:
        _record_attempt(
            session,
            user_id=user.id,
            identifier=normalized,
            successful=False,
            reason=LoginFailureReason.NOT_ACTIVE,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        await session.commit()
        raise AuthenticationError(
            _STATUS_ERROR_MESSAGES.get(user.status, "Account access is not permitted."),
            code=_STATUS_ERROR_CODES.get(user.status, "account_not_active"),
            status_code=403,
        )

    # Correct password, active account, but expired temporary password.
    if user.must_change_password and user.temporary_password_expires_at is not None:
        expires = user.temporary_password_expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=UTC)
        if expires <= _now():
            _record_attempt(
                session,
                user_id=user.id,
                identifier=normalized,
                successful=False,
                reason=LoginFailureReason.NOT_ACTIVE,
                ip_address=ip_address,
                user_agent=user_agent,
            )
            await session.commit()
            raise AuthenticationError(
                "Your temporary password has expired. Ask an administrator to reset it.",
                code="temporary_password_expired",
                status_code=403,
            )

    # Success: reset counter, stamp login, record attempt, issue tokens.
    user.failed_login_attempts = 0
    user.last_login_at = _now()
    _record_attempt(
        session,
        user_id=user.id,
        identifier=normalized,
        successful=True,
        reason=LoginFailureReason.NONE,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    audit.record_audit(
        session,
        action=AuditAction.LOGIN_SUCCESS,
        actor_type=ActorType.USER,
        actor_id=user.id,
        target_user_id=user.id,
        ip_address=ip_address,
    )
    issued = await _issue_login_tokens(
        session, user=user, ip_address=ip_address, user_agent=user_agent
    )
    await session.commit()
    return issued


# --------------------------------------------------------------------------- #
# Refresh rotation
# --------------------------------------------------------------------------- #
async def refresh(
    session: AsyncSession,
    *,
    presented_value: str,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> IssuedTokens:
    """Rotate a refresh token. Detects replay and revokes the family."""
    outcome = await tokens.resolve_presented_token(session, value=presented_value)

    if outcome.reuse_detected and outcome.family_id is not None:
        revoked = await tokens.revoke_family(
            session, family_id=outcome.family_id, reason="REUSE_DETECTED"
        )
        audit.record_audit(
            session,
            action=AuditAction.TOKEN_REUSE_DETECTED,
            actor_type=ActorType.SYSTEM,
            actor_id=None,
            reason="REFRESH_TOKEN_REPLAY",
            ip_address=ip_address,
            context={"family_id": str(outcome.family_id), "revoked": revoked},
        )
        await session.commit()
        raise AuthenticationError(
            "Refresh token reuse detected; session revoked.",
            code="token_reuse_detected",
        )

    if outcome.token is None:
        await session.commit()
        raise AuthenticationError("Invalid or expired refresh token.", code="invalid_token")

    current = outcome.token
    user = await session.get(User, current.user_id, with_for_update=True)
    if user is None:
        await session.commit()
        raise AuthenticationError("Invalid or expired refresh token.", code="invalid_token")

    # Enforce current status and matching auth_version.
    if user.status != AccountStatus.ACTIVE or current.auth_version != user.auth_version:
        await tokens.revoke_family(session, family_id=current.family_id, reason="STALE_OR_INACTIVE")
        await session.commit()
        raise AuthenticationError("Session is no longer valid.", code="session_invalid")

    _, refresh_value = await tokens.rotate_token(
        session, current=current, user=user, ip_address=ip_address, user_agent=user_agent
    )
    role_names = await rbac_service.get_user_role_names(session, user.id)
    access_token, expires_at = create_access_token(
        subject=user.id,
        auth_version=user.auth_version,
        must_change_password=user.must_change_password,
        roles=role_names,
    )
    await session.commit()
    return IssuedTokens(
        user=user,
        access_token=access_token,
        access_expires_at=expires_at,
        refresh_token=refresh_value,
        must_change_password=user.must_change_password,
    )


# --------------------------------------------------------------------------- #
# Logout
# --------------------------------------------------------------------------- #
async def logout(
    session: AsyncSession, *, user: User, presented_value: str | None
) -> None:
    """Revoke the current session (by presented refresh token, if any)."""
    if presented_value:
        outcome = await tokens.resolve_presented_token(session, value=presented_value)
        if outcome.token is not None and outcome.token.user_id == user.id:
            outcome.token.revoked_at = _now()
            outcome.token.revoked_reason = "LOGOUT"
    audit.record_audit(
        session,
        action=AuditAction.LOGOUT,
        actor_type=ActorType.USER,
        actor_id=user.id,
        target_user_id=user.id,
    )
    await session.commit()


async def logout_all(session: AsyncSession, *, user: User) -> int:
    """Revoke every active session for the user (does not bump auth_version)."""
    count = await tokens.revoke_all_for_user(session, user_id=user.id, reason="LOGOUT_ALL")
    audit.record_audit(
        session,
        action=AuditAction.LOGOUT_ALL,
        actor_type=ActorType.USER,
        actor_id=user.id,
        target_user_id=user.id,
        context={"revoked": count},
    )
    await session.commit()
    return count


# --------------------------------------------------------------------------- #
# Change password (self-service, incl. forced change after admin reset)
# --------------------------------------------------------------------------- #
async def change_password(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    current_password: str,
    new_password: str,
) -> None:
    """Change the caller's password, revoke sessions, and bump auth_version."""
    user = await session.get(User, user_id, with_for_update=True)
    if user is None:
        raise AuthenticationError("Invalid credentials.")

    if not verify_password(current_password, user.password_hash):
        raise AuthenticationError("Current password is incorrect.", code="invalid_current_password")

    if verify_password(new_password, user.password_hash):
        raise ConflictError(
            "New password must differ from the current password.",
            code="password_reused",
        )

    user.password_hash = hash_password(new_password)
    user.must_change_password = False
    user.temporary_password_expires_at = None
    user.password_changed_at = _now()
    user.auth_version += 1

    session.add(
        PasswordHistory(user_id=user.id, password_hash=user.password_hash, set_reason="USER_CHANGE")
    )
    await tokens.revoke_all_for_user(session, user_id=user.id, reason="PASSWORD_CHANGED")
    audit.record_audit(
        session,
        action=AuditAction.PASSWORD_CHANGE,
        actor_type=ActorType.USER,
        actor_id=user.id,
        target_user_id=user.id,
    )
    await session.commit()
