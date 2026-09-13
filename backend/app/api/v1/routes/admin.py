"""Administrator account-governance endpoints.

Every mutation requires a specific permission and a mandatory reason, and returns
the new status, action timestamp, and audit reference.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import inspect as sa_inspect

from app.api.deps import (
    DbSession,
    get_client_ip,
    require_permissions,
)
from app.core.pagination import Page, PageParams, page_params
from app.models.enums import AccountStatus, AuditAction, UserType
from app.models.user import User
from app.modules.accounts import service as accounts_service
from app.modules.accounts.schemas import (
    AccountSummaryResponse,
    AdminActionRequest,
    AdminActionResponse,
    ApproveRequest,
    AuditLogResponse,
    LoginAttemptResponse,
    ResetPasswordResponse,
    StatusHistoryResponse,
    UserDetail,
    UserSummary,
)
from app.modules.accounts.transitions import AdminAction
from app.modules.rbac.constants import Perm

router = APIRouter(prefix="/admin", tags=["admin"])

PageParamsDep = Annotated[PageParams, Depends(page_params)]


# --------------------------------------------------------------------------- #
# Dashboard
# --------------------------------------------------------------------------- #
@router.get("/dashboard/account-summary", response_model=AccountSummaryResponse)
async def account_summary(
    session: DbSession,
    _: Annotated[User, Depends(require_permissions(Perm.DASHBOARD_READ))],
) -> AccountSummaryResponse:
    counts = await accounts_service.account_summary(session)
    return AccountSummaryResponse(**counts)


# --------------------------------------------------------------------------- #
# User list & detail
# --------------------------------------------------------------------------- #
@router.get("/users", response_model=Page[UserSummary])
async def list_users(
    session: DbSession,
    params: PageParamsDep,
    _: Annotated[User, Depends(require_permissions(Perm.USERS_READ))],
    user_type: UserType | None = None,
    status: AccountStatus | None = None,
    q: Annotated[
        str | None,
        Query(max_length=320, description="Search username, email, or company name."),
    ] = None,
    company: Annotated[
        str | None,
        Query(max_length=255, description="Filter by company name (substring)."),
    ] = None,
) -> Page[UserSummary]:
    users, total = await accounts_service.list_users(
        session,
        user_type=user_type,
        status=status,
        query=q,
        company=company,
        offset=params.offset,
        limit=params.limit,
    )
    return Page.create(
        items=[UserSummary.model_validate(u) for u in users], total=total, params=params
    )


@router.get("/users/{user_id}", response_model=UserDetail)
async def get_user(
    user_id: uuid.UUID,
    session: DbSession,
    _: Annotated[User, Depends(require_permissions(Perm.USERS_READ))],
) -> UserDetail:
    user = await accounts_service.get_user(session, user_id)
    roles, perms = await accounts_service.get_user_roles_and_permissions(session, user_id)
    # Map only scalar columns so the ORM ``roles`` relationship does not collide
    # with the schema's ``roles: list[str]`` field.
    data = {c.key: getattr(user, c.key) for c in sa_inspect(user).mapper.column_attrs}
    data["roles"] = roles
    data["permissions"] = perms
    data["company_name"] = user.company_name
    return UserDetail.model_validate(data)


# --------------------------------------------------------------------------- #
# Status transition actions
# --------------------------------------------------------------------------- #
def _action_response(result: accounts_service.ActionResult) -> AdminActionResponse:
    return AdminActionResponse(
        user_id=result.user.id,
        status=result.status,
        action_at=result.action_at,
        audit_id=result.audit_id,
    )


async def _do_action(
    request: Request,
    session: DbSession,
    admin: User,
    user_id: uuid.UUID,
    action: AdminAction,
    data: AdminActionRequest,
) -> AdminActionResponse:
    result = await accounts_service.perform_admin_action(
        session,
        admin_id=admin.id,
        target_user_id=user_id,
        action=action,
        reason=data.reason,
        notes=data.notes,
        ip_address=get_client_ip(request),
    )
    return _action_response(result)


@router.post("/users/{user_id}/approve", response_model=AdminActionResponse)
async def approve_user(
    request: Request,
    user_id: uuid.UUID,
    data: ApproveRequest,
    session: DbSession,
    admin: Annotated[User, Depends(require_permissions(Perm.ACCOUNTS_APPROVE))],
) -> AdminActionResponse:
    return await _do_action(request, session, admin, user_id, AdminAction.APPROVE, data)


@router.post("/users/{user_id}/reject", response_model=AdminActionResponse)
async def reject_user(
    request: Request,
    user_id: uuid.UUID,
    data: AdminActionRequest,
    session: DbSession,
    admin: Annotated[User, Depends(require_permissions(Perm.ACCOUNTS_REJECT))],
) -> AdminActionResponse:
    return await _do_action(request, session, admin, user_id, AdminAction.REJECT, data)


@router.post("/users/{user_id}/lock", response_model=AdminActionResponse)
async def lock_user(
    request: Request,
    user_id: uuid.UUID,
    data: AdminActionRequest,
    session: DbSession,
    admin: Annotated[User, Depends(require_permissions(Perm.USERS_LOCK))],
) -> AdminActionResponse:
    return await _do_action(request, session, admin, user_id, AdminAction.LOCK, data)


@router.post("/users/{user_id}/unlock", response_model=AdminActionResponse)
async def unlock_user(
    request: Request,
    user_id: uuid.UUID,
    data: AdminActionRequest,
    session: DbSession,
    admin: Annotated[User, Depends(require_permissions(Perm.USERS_UNLOCK))],
) -> AdminActionResponse:
    return await _do_action(request, session, admin, user_id, AdminAction.UNLOCK, data)


@router.post("/users/{user_id}/suspend", response_model=AdminActionResponse)
async def suspend_user(
    request: Request,
    user_id: uuid.UUID,
    data: AdminActionRequest,
    session: DbSession,
    admin: Annotated[User, Depends(require_permissions(Perm.USERS_SUSPEND))],
) -> AdminActionResponse:
    return await _do_action(request, session, admin, user_id, AdminAction.SUSPEND, data)


@router.post("/users/{user_id}/reactivate", response_model=AdminActionResponse)
async def reactivate_user(
    request: Request,
    user_id: uuid.UUID,
    data: AdminActionRequest,
    session: DbSession,
    admin: Annotated[User, Depends(require_permissions(Perm.USERS_REACTIVATE))],
) -> AdminActionResponse:
    return await _do_action(request, session, admin, user_id, AdminAction.REACTIVATE, data)


@router.post("/users/{user_id}/disable", response_model=AdminActionResponse)
async def disable_user(
    request: Request,
    user_id: uuid.UUID,
    data: AdminActionRequest,
    session: DbSession,
    admin: Annotated[User, Depends(require_permissions(Perm.USERS_DISABLE))],
) -> AdminActionResponse:
    return await _do_action(request, session, admin, user_id, AdminAction.DISABLE, data)


@router.post("/users/{user_id}/reset-password", response_model=ResetPasswordResponse)
async def reset_password(
    request: Request,
    user_id: uuid.UUID,
    data: AdminActionRequest,
    session: DbSession,
    admin: Annotated[User, Depends(require_permissions(Perm.USERS_RESET_PASSWORD))],
) -> ResetPasswordResponse:
    result = await accounts_service.reset_password(
        session,
        admin_id=admin.id,
        target_user_id=user_id,
        reason=data.reason,
        notes=data.notes,
        ip_address=get_client_ip(request),
    )
    return ResetPasswordResponse(
        user_id=result.user_id,
        temporary_password=result.temporary_password,
        temporary_password_expires_at=result.expires_at,
        audit_id=result.audit_id,
    )


# --------------------------------------------------------------------------- #
# History & audit views
# --------------------------------------------------------------------------- #
@router.get("/users/{user_id}/login-attempts", response_model=Page[LoginAttemptResponse])
async def user_login_attempts(
    user_id: uuid.UUID,
    session: DbSession,
    params: PageParamsDep,
    _: Annotated[User, Depends(require_permissions(Perm.USERS_READ_LOGIN_ATTEMPTS))],
) -> Page[LoginAttemptResponse]:
    await accounts_service.get_user(session, user_id)  # 404 if missing
    rows, total = await accounts_service.list_login_attempts(
        session, user_id=user_id, offset=params.offset, limit=params.limit
    )
    return Page.create(
        items=[LoginAttemptResponse.model_validate(r) for r in rows], total=total, params=params
    )


@router.get("/users/{user_id}/status-history", response_model=Page[StatusHistoryResponse])
async def user_status_history(
    user_id: uuid.UUID,
    session: DbSession,
    params: PageParamsDep,
    _: Annotated[User, Depends(require_permissions(Perm.USERS_READ_STATUS_HISTORY))],
) -> Page[StatusHistoryResponse]:
    await accounts_service.get_user(session, user_id)
    rows, total = await accounts_service.list_status_history(
        session, user_id=user_id, offset=params.offset, limit=params.limit
    )
    return Page.create(
        items=[StatusHistoryResponse.model_validate(r) for r in rows], total=total, params=params
    )


@router.get("/audit-logs", response_model=Page[AuditLogResponse])
async def audit_logs(
    session: DbSession,
    params: PageParamsDep,
    _: Annotated[User, Depends(require_permissions(Perm.AUDIT_READ))],
    target_user_id: uuid.UUID | None = None,
    action: AuditAction | None = None,
) -> Page[AuditLogResponse]:
    rows, total = await accounts_service.list_audit_logs(
        session,
        target_user_id=target_user_id,
        action=action,
        offset=params.offset,
        limit=params.limit,
    )
    return Page.create(
        items=[AuditLogResponse.model_validate(r) for r in rows], total=total, params=params
    )
