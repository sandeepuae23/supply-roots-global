"""Shared FastAPI dependencies: DB session, authentication, RBAC."""

from __future__ import annotations

import uuid
from collections.abc import AsyncGenerator, Awaitable, Callable
from typing import Annotated

import jwt
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import (
    AuthenticationError,
    InvalidTokenError,
    PasswordChangeRequiredError,
    PermissionDeniedError,
)
from app.core.security import decode_access_token
from app.db.session import get_db_session
from app.models.enums import AccountStatus
from app.models.user import User
from app.modules.rbac import service as rbac_service


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_db_session():
        yield session


DbSession = Annotated[AsyncSession, Depends(get_db)]


def get_client_ip(request: Request) -> str | None:
    """Resolve the client IP for audit records.

    By default ``X-Forwarded-For`` is IGNORED and the direct socket peer is used,
    so a client cannot spoof its recorded IP. When ``LEO_TRUST_FORWARDED_FOR`` is
    enabled (app is behind a trusted proxy), the client IP is taken from the
    ``trusted_proxy_hops``-th entry from the right of the header — the address the
    outermost trusted proxy observed — which the client cannot forge by
    prepending values.
    """
    direct = request.client.host if request.client else None
    if not settings.trust_forwarded_for:
        return direct

    forwarded = request.headers.get("x-forwarded-for")
    if not forwarded:
        return direct
    parts = [p.strip() for p in forwarded.split(",") if p.strip()]
    if not parts:
        return direct
    hops = max(1, settings.trusted_proxy_hops)
    # Take the Nth-from-right entry; clamp to the left-most if fewer hops present.
    index = max(0, len(parts) - hops)
    return parts[index]


def get_user_agent(request: Request) -> str | None:
    return request.headers.get("user-agent")


def _extract_bearer_token(request: Request) -> str:
    header = request.headers.get("authorization")
    if not header or not header.lower().startswith("bearer "):
        raise AuthenticationError("Missing bearer token.", code="missing_token")
    return header[7:].strip()


async def get_authenticated_user(request: Request, session: DbSession) -> User:
    """Resolve the caller from a bearer access token.

    Validates the token signature/expiry, that the account still exists and is
    ``ACTIVE``, and that the token's ``auth_version`` matches the user's current
    version (so security-sensitive changes invalidate outstanding tokens). Does
    NOT enforce the forced-password-change restriction — see
    :func:`get_current_user`.
    """
    token = _extract_bearer_token(request)
    try:
        payload = decode_access_token(token)
    except jwt.ExpiredSignatureError as exc:
        raise InvalidTokenError("Access token has expired.", code="token_expired") from exc
    except jwt.PyJWTError as exc:
        raise InvalidTokenError("Invalid access token.") from exc

    if payload.get("type") != "access":
        raise InvalidTokenError("Wrong token type.")

    try:
        user_id = uuid.UUID(str(payload["sub"]))
    except (KeyError, ValueError) as exc:
        raise InvalidTokenError("Malformed token subject.") from exc

    user = await session.get(User, user_id)
    if user is None:
        raise InvalidTokenError("Account no longer exists.")

    if user.status != AccountStatus.ACTIVE:
        raise AuthenticationError("Account is not active.", code="account_not_active")

    if int(payload.get("auth_version", -1)) != user.auth_version:
        raise InvalidTokenError("Token has been superseded.", code="stale_token")

    # Cache the parsed forced-change flag for downstream dependencies.
    request.state.must_change_password = bool(payload.get("mcp", user.must_change_password))
    return user


AuthenticatedUser = Annotated[User, Depends(get_authenticated_user)]


async def get_current_user(user: AuthenticatedUser) -> User:
    """Normal protected-route caller: forbids forced-password-change sessions."""
    if user.must_change_password:
        raise PasswordChangeRequiredError(
            "Password change required before accessing this resource.",
            code="password_change_required",
        )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_permissions(*permissions: str) -> Callable[..., Awaitable[User]]:
    """Build a dependency enforcing that the caller holds all required permissions.

    Implemented as a closure rather than a callable class on purpose. FastAPI
    resolves a dependency's type hints against ``callable.__globals__``; a class
    *instance* has no ``__globals__``, so under ``from __future__ import
    annotations`` (which turns the ``__call__`` hints into plain strings) the
    ``CurrentUser``/``DbSession`` markers stayed unresolved ``ForwardRef``s and
    were mis-parsed as required query params — every admin route then failed with
    HTTP 422 before auth ran. A closure carries the module globals, so the
    ``Depends`` markers resolve correctly.
    """
    required = set(permissions)

    async def dependency(user: CurrentUser, session: DbSession) -> User:
        granted = await rbac_service.get_user_permissions(session, user.id)
        missing = required - granted
        if missing:
            raise PermissionDeniedError(
                "You do not have permission to perform this action.",
                code="permission_denied",
                details=[{"missing_permissions": sorted(missing)}],
            )
        return user

    return dependency
