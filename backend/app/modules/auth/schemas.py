"""Pydantic request/response schemas for authentication endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.config import settings
from app.models.enums import AccountStatus, UserType

# Reusable constrained fields.
UsernameField = Annotated[
    str,
    Field(min_length=3, max_length=150, pattern=r"^[A-Za-z0-9._-]+$"),
]
PasswordField = Annotated[
    str,
    Field(min_length=settings.password_min_length, max_length=settings.password_max_length),
]


# Reusable company-profile fields (required at registration).
CompanyNameField = Annotated[str, Field(min_length=2, max_length=255)]
ContactNameField = Annotated[str, Field(min_length=2, max_length=255)]
PhoneField = Annotated[str, Field(min_length=3, max_length=50)]
CountryField = Annotated[str, Field(min_length=2, max_length=100)]


class BuyerRegistrationRequest(BaseModel):
    """Buyer sign-up: identity credentials plus the buyer company profile.

    Unexpected fields are rejected (``extra="forbid"``) rather than silently
    discarded, so a client cannot smuggle unmodelled data past validation.
    """

    model_config = ConfigDict(extra="forbid")

    username: UsernameField
    email: EmailStr
    password: PasswordField
    company_name: CompanyNameField
    contact_name: ContactNameField
    phone: PhoneField
    country: CountryField

    @field_validator("username", "company_name", "contact_name", "phone", "country")
    @classmethod
    def _strip(cls, value: str) -> str:
        return value.strip()


class VendorRegistrationRequest(BuyerRegistrationRequest):
    """Vendor sign-up: the buyer fields plus a non-empty supply-category list."""

    supply_categories: Annotated[list[CompanyNameField], Field(min_length=1, max_length=50)]

    @field_validator("supply_categories")
    @classmethod
    def _clean_categories(cls, value: list[str]) -> list[str]:
        cleaned = [item.strip() for item in value if item and item.strip()]
        if not cleaned:
            raise ValueError("At least one supply category is required.")
        return cleaned


class RegistrationResponse(BaseModel):
    id: uuid.UUID
    username: str
    email: EmailStr
    user_type: UserType
    status: AccountStatus
    company_name: str
    message: str = (
        "Registration received. Your account is pending administrator approval."
    )


class LoginRequest(BaseModel):
    # Username OR email.
    identifier: Annotated[str, Field(min_length=1, max_length=320)]
    password: Annotated[str, Field(min_length=1, max_length=settings.password_max_length)]


class CurrentUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    email: EmailStr
    user_type: UserType
    status: AccountStatus
    company_name: str | None = None
    must_change_password: bool
    roles: list[str] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)
    last_login_at: datetime | None = None
    created_at: datetime


class TokenResponse(BaseModel):
    """Browser-safe auth response for login and refresh.

    Carries the bearer access token plus the complete current-user object the UI
    needs to render immediately. The refresh token is deliberately NOT included:
    it is delivered only via the ``HttpOnly`` refresh cookie so it is never
    readable by browser JavaScript.
    """

    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    must_change_password: bool = False
    user: CurrentUserResponse


class RefreshRequest(BaseModel):
    # Optional in body; the endpoint also accepts the refresh cookie. Callers may
    # POST with no body at all (cookie-only browser flow).
    refresh_token: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: Annotated[str, Field(min_length=1, max_length=settings.password_max_length)]
    new_password: PasswordField


class LogoutRequest(BaseModel):
    refresh_token: str | None = None


class MessageResponse(BaseModel):
    message: str


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    issued_at: datetime
    expires_at: datetime
    ip_address: str | None = None
    user_agent: str | None = None
    current: bool = False
