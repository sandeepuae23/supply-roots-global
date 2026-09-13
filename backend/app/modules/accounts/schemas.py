"""Pydantic schemas for administrator account-governance endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import (
    AccountStatus,
    ActorType,
    AuditAction,
    LoginFailureReason,
    UserType,
)

ReasonField = Annotated[str, Field(min_length=3, max_length=1000)]


class AdminActionRequest(BaseModel):
    """Body required for every administrator mutation — reason is mandatory."""

    reason: ReasonField
    notes: str | None = Field(default=None, max_length=2000)


class ApproveRequest(AdminActionRequest):
    # Approval may use a controlled reason; default provided for convenience.
    reason: ReasonField = "REGISTRATION_VERIFIED"


class AdminActionResponse(BaseModel):
    user_id: uuid.UUID
    status: AccountStatus
    action_at: datetime
    audit_id: uuid.UUID


class ResetPasswordResponse(BaseModel):
    user_id: uuid.UUID
    # Returned exactly once; never stored in plaintext or logged.
    temporary_password: str
    temporary_password_expires_at: datetime
    must_change_password: bool = True
    audit_id: uuid.UUID


class UserSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    email: EmailStr
    user_type: UserType
    status: AccountStatus
    company_name: str | None = None
    failed_login_attempts: int
    must_change_password: bool
    last_login_at: datetime | None = None
    created_at: datetime


class UserDetail(UserSummary):
    normalized_username: str
    normalized_email: str
    locked_at: datetime | None = None
    approved_at: datetime | None = None
    approved_by: uuid.UUID | None = None
    suspended_at: datetime | None = None
    suspended_by: uuid.UUID | None = None
    suspension_reason: str | None = None
    temporary_password_expires_at: datetime | None = None
    auth_version: int
    roles: list[str] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)
    updated_at: datetime


class LoginAttemptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    identifier: str
    successful: bool
    failure_reason: LoginFailureReason
    ip_address: str | None = None
    user_agent: str | None = None
    created_at: datetime


class StatusHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    previous_status: AccountStatus | None
    new_status: AccountStatus
    reason: str
    actor_type: ActorType
    actor_id: uuid.UUID | None = None
    request_id: str | None = None
    ip_address: str | None = None
    created_at: datetime


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    action: AuditAction
    actor_type: ActorType
    actor_id: uuid.UUID | None = None
    target_user_id: uuid.UUID | None = None
    reason: str | None = None
    request_id: str | None = None
    ip_address: str | None = None
    context: dict | None = None
    created_at: datetime


class AccountSummaryResponse(BaseModel):
    total_users: int
    buyers: int
    vendors: int
    admins: int
    pending_approval: int
    active: int
    locked: int
    suspended: int
    rejected: int
    disabled: int
    # Accounts registered in the trailing 7 days (rolling window).
    registered_last_7_days: int
