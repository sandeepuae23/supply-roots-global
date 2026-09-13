"""Authentication and current-user endpoints."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Body, Request, Response, status

from app.api.cookies import (
    REFRESH_COOKIE_NAME,
    clear_refresh_cookie,
    set_refresh_cookie,
)
from app.api.deps import (
    AuthenticatedUser,
    CurrentUser,
    DbSession,
    get_client_ip,
    get_user_agent,
)
from app.core.errors import AuthenticationError, NotFoundError
from app.models.enums import UserType
from app.models.user import User
from app.modules.auth import service as auth_service
from app.modules.auth import tokens as token_ops
from app.modules.auth.schemas import (
    BuyerRegistrationRequest,
    ChangePasswordRequest,
    CurrentUserResponse,
    LoginRequest,
    LogoutRequest,
    MessageResponse,
    RefreshRequest,
    RegistrationResponse,
    SessionResponse,
    TokenResponse,
    VendorRegistrationRequest,
)
from app.modules.rbac import service as rbac_service

router = APIRouter(prefix="/auth", tags=["auth"])


async def _current_user_response(session: DbSession, user: User) -> CurrentUserResponse:
    """Assemble the full current-user object the UI needs (roles, perms, company)."""
    roles = await rbac_service.get_user_role_names(session, user.id)
    perms = await rbac_service.get_user_permissions(session, user.id)
    return CurrentUserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        user_type=user.user_type,
        status=user.status,
        company_name=user.company_name,
        must_change_password=user.must_change_password,
        roles=roles,
        permissions=sorted(perms),
        last_login_at=user.last_login_at,
        created_at=user.created_at,
    )


async def _token_response(
    session: DbSession, issued: auth_service.IssuedTokens
) -> TokenResponse:
    return TokenResponse(
        access_token=issued.access_token,
        expires_at=issued.access_expires_at,
        must_change_password=issued.must_change_password,
        user=await _current_user_response(session, issued.user),
    )


@router.post(
    "/register/buyer",
    response_model=RegistrationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_buyer(
    request: Request, data: BuyerRegistrationRequest, session: DbSession
) -> RegistrationResponse:
    user = await auth_service.register_user(
        session,
        username=data.username,
        email=str(data.email),
        password=data.password,
        user_type=UserType.BUYER,
        profile=auth_service.CompanyProfile(
            company_name=data.company_name,
            contact_name=data.contact_name,
            phone=data.phone,
            country=data.country,
        ),
        ip_address=get_client_ip(request),
    )
    return RegistrationResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        user_type=user.user_type,
        status=user.status,
        company_name=data.company_name,
    )


@router.post(
    "/register/vendor",
    response_model=RegistrationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_vendor(
    request: Request, data: VendorRegistrationRequest, session: DbSession
) -> RegistrationResponse:
    user = await auth_service.register_user(
        session,
        username=data.username,
        email=str(data.email),
        password=data.password,
        user_type=UserType.VENDOR,
        profile=auth_service.CompanyProfile(
            company_name=data.company_name,
            contact_name=data.contact_name,
            phone=data.phone,
            country=data.country,
            supply_categories=data.supply_categories,
        ),
        ip_address=get_client_ip(request),
    )
    return RegistrationResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        user_type=user.user_type,
        status=user.status,
        company_name=data.company_name,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request, data: LoginRequest, session: DbSession, response: Response
) -> TokenResponse:
    issued = await auth_service.authenticate(
        session,
        identifier=data.identifier,
        password=data.password,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    set_refresh_cookie(response, issued.refresh_token)
    return await _token_response(session, issued)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    request: Request,
    session: DbSession,
    response: Response,
    data: Annotated[RefreshRequest | None, Body()] = None,
) -> TokenResponse:
    # Accept a cookie-only call with no JSON body (browser flow) as well as an
    # explicit token in the body (non-browser clients).
    presented = (data.refresh_token if data else None) or request.cookies.get(
        REFRESH_COOKIE_NAME
    )
    if not presented:
        raise AuthenticationError("No refresh token provided.", code="missing_refresh_token")
    issued = await auth_service.refresh(
        session,
        presented_value=presented,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
    )
    set_refresh_cookie(response, issued.refresh_token)
    return await _token_response(session, issued)


@router.post("/logout", response_model=MessageResponse)
async def logout(
    request: Request,
    session: DbSession,
    response: Response,
    user: AuthenticatedUser,
    data: Annotated[LogoutRequest | None, Body()] = None,
) -> MessageResponse:
    presented = (data.refresh_token if data else None) or request.cookies.get(
        REFRESH_COOKIE_NAME
    )
    await auth_service.logout(session, user=user, presented_value=presented)
    clear_refresh_cookie(response)
    return MessageResponse(message="Logged out.")


@router.post("/logout-all", response_model=MessageResponse)
async def logout_all(
    session: DbSession, response: Response, user: AuthenticatedUser
) -> MessageResponse:
    count = await auth_service.logout_all(session, user=user)
    clear_refresh_cookie(response)
    return MessageResponse(message=f"Logged out of {count} session(s).")


@router.post(
    "/change-password",
    response_model=MessageResponse,
    responses={
        200: {
            "description": (
                "Password changed. ALL active sessions are revoked (auth_version "
                "bumped) and the refresh cookie is cleared — the caller MUST log "
                "in again. The response body is `{\"message\": \"Password changed. "
                "Please log in again.\"}`."
            )
        },
        401: {"description": "Missing/invalid access token or wrong current password."},
        409: {"description": "New password must differ from the current password."},
    },
    summary="Change own password (invalidates all sessions; requires re-login)",
)
async def change_password(
    data: ChangePasswordRequest,
    session: DbSession,
    response: Response,
    user: AuthenticatedUser,
) -> MessageResponse:
    """Change the caller's password.

    This is **session-invalidating**: every active refresh session is revoked and
    ``auth_version`` is bumped so all outstanding access tokens stop working. The
    refresh cookie is cleared and the caller must authenticate again.
    """
    await auth_service.change_password(
        session,
        user_id=user.id,
        current_password=data.current_password,
        new_password=data.new_password,
    )
    # All sessions were revoked; clear the cookie and require re-login.
    clear_refresh_cookie(response)
    return MessageResponse(message="Password changed. Please log in again.")


@router.get("/me", response_model=CurrentUserResponse)
async def me(session: DbSession, user: AuthenticatedUser) -> CurrentUserResponse:
    return await _current_user_response(session, user)


@router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions(session: DbSession, user: CurrentUser) -> list[SessionResponse]:
    records = await token_ops.list_active_sessions(session, user_id=user.id)
    return [SessionResponse.model_validate(r) for r in records]


@router.delete("/sessions/{session_id}", response_model=MessageResponse)
async def revoke_session(
    session_id: uuid.UUID, session: DbSession, user: CurrentUser
) -> MessageResponse:
    revoked = await token_ops.revoke_session_by_id(
        session, user_id=user.id, session_id=session_id, reason="USER_REVOKED"
    )
    await session.commit()
    if not revoked:
        raise NotFoundError("Session not found.", code="session_not_found")
    return MessageResponse(message="Session revoked.")
