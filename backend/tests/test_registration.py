"""Registration behaviour: pending status, atomicity, duplicate handling."""

from __future__ import annotations

import pytest

from tests.helpers import owned_company_id
from sqlalchemy import func, select

from app.core.errors import ConflictError, PermissionDeniedError, ValidationAppError
from app.models.audit_log import AdminAuditLog
from app.models.company import BusinessClient, Vendor
from app.models.enums import AccountStatus, AuditAction, UserType
from app.models.password_history import PasswordHistory
from app.models.status_history import AccountStatusHistory
from app.modules.auth import service as auth_service
from app.modules.rbac import service as rbac_service

pytestmark = pytest.mark.asyncio


def _buyer_profile(**overrides) -> auth_service.CompanyProfile:
    data = {
        "company_name": "Acme Trading LLC",
        "contact_name": "Jane Buyer",
        "phone": "+971500000000",
        "country": "United Arab Emirates",
    }
    data.update(overrides)
    return auth_service.CompanyProfile(**data)


async def test_register_buyer_creates_pending_account(db, seeded) -> None:
    user = await auth_service.register_user(
        db,
        username="BuyerOne",
        email="Buyer.One@Example.com",
        password="a-strong-password-123",
        user_type=UserType.BUYER,
        profile=_buyer_profile(),
    )
    assert user.status == AccountStatus.PENDING_APPROVAL
    assert user.normalized_username == "buyerone"
    assert user.normalized_email == "buyer.one@example.com"
    # Password is hashed, never stored plaintext.
    assert user.password_hash != "a-strong-password-123"

    # Buyer company profile persisted atomically, reached through the OWNER
    # membership created in the same transaction.
    company_id = await owned_company_id(db, user.id)
    assert company_id is not None
    profile = await db.scalar(
        select(BusinessClient).where(BusinessClient.company_id == company_id)
    )
    assert profile is not None
    assert profile.company_name == "Acme Trading LLC"
    assert profile.contact_name == "Jane Buyer"
    assert profile.country == "United Arab Emirates"
    # No vendor profile for a buyer.
    assert await db.scalar(select(Vendor).where(Vendor.company_id == company_id)) is None

    # Default role assigned.
    roles = await rbac_service.get_user_role_names(db, user.id)
    assert "BUYER_OWNER" in roles

    # Initial status history + audit + password history recorded.
    hist = (
        await db.execute(
            select(AccountStatusHistory).where(AccountStatusHistory.user_id == user.id)
        )
    ).scalars().all()
    assert len(hist) == 1
    assert hist[0].previous_status is None
    assert hist[0].new_status == AccountStatus.PENDING_APPROVAL

    audit_count = await db.scalar(
        select(func.count())
        .select_from(AdminAuditLog)
        .where(AdminAuditLog.target_user_id == user.id, AdminAuditLog.action == AuditAction.REGISTER)
    )
    assert audit_count == 1

    pw_hist = await db.scalar(
        select(func.count()).select_from(PasswordHistory).where(PasswordHistory.user_id == user.id)
    )
    assert pw_hist == 1


async def test_vendor_registration_assigns_vendor_role_and_profile(db, seeded) -> None:
    user = await auth_service.register_user(
        db,
        username="vendorone",
        email="vendor@example.com",
        password="a-strong-password-123",
        user_type=UserType.VENDOR,
        profile=_buyer_profile(
            company_name="Global Supply Co",
            supply_categories=["Spices", "Grains"],
        ),
    )
    roles = await rbac_service.get_user_role_names(db, user.id)
    assert "VENDOR_OWNER" in roles
    company_id = await owned_company_id(db, user.id)
    assert company_id is not None
    vendor = await db.scalar(select(Vendor).where(Vendor.company_id == company_id))
    assert vendor is not None
    assert vendor.company_name == "Global Supply Co"
    assert vendor.supply_categories == ["Spices", "Grains"]
    # No buyer profile for a vendor.
    assert await db.scalar(
        select(BusinessClient).where(BusinessClient.company_id == company_id)
    ) is None


async def test_vendor_requires_supply_categories(db, seeded) -> None:
    with pytest.raises(ValidationAppError):
        await auth_service.register_user(
            db,
            username="novendorcats",
            email="nvc@example.com",
            password="a-strong-password-123",
            user_type=UserType.VENDOR,
            profile=_buyer_profile(),  # no supply_categories
        )


async def test_buyer_rejects_supply_categories(db, seeded) -> None:
    with pytest.raises(ValidationAppError):
        await auth_service.register_user(
            db,
            username="buyerwithcats",
            email="bwc@example.com",
            password="a-strong-password-123",
            user_type=UserType.BUYER,
            profile=_buyer_profile(supply_categories=["Nope"]),
        )


async def test_public_admin_registration_forbidden(db, seeded) -> None:
    with pytest.raises(PermissionDeniedError):
        await auth_service.register_user(
            db,
            username="hacker",
            email="hacker@example.com",
            password="a-strong-password-123",
            user_type=UserType.ADMIN,
            profile=_buyer_profile(),
        )


async def test_case_insensitive_duplicate_rejected(db, seeded) -> None:
    await auth_service.register_user(
        db,
        username="DupUser",
        email="dup@example.com",
        password="a-strong-password-123",
        user_type=UserType.BUYER,
        profile=_buyer_profile(),
    )
    with pytest.raises(ConflictError):
        await auth_service.register_user(
            db,
            username="dupuser",  # same normalized username
            email="other@example.com",
            password="a-strong-password-123",
            user_type=UserType.BUYER,
            profile=_buyer_profile(),
        )
    # The duplicate must not have left an orphan company profile behind.
    total_profiles = await db.scalar(select(func.count()).select_from(BusinessClient))
    assert total_profiles == 1


_BUYER_BODY = {
    "username": "apibuyer",
    "email": "apibuyer@example.com",
    "password": "a-strong-password-123",
    "company_name": "API Buyer Inc",
    "contact_name": "Api Buyer",
    "phone": "+15551230000",
    "country": "USA",
}


async def test_registration_endpoints(client) -> None:
    resp = await client.post("/api/v1/auth/register/buyer", json=_BUYER_BODY)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["status"] == "PENDING_APPROVAL"
    assert body["user_type"] == "BUYER"
    assert body["company_name"] == "API Buyer Inc"
    assert "password" not in body

    # Vendor endpoint (adds supply_categories).
    resp2 = await client.post(
        "/api/v1/auth/register/vendor",
        json={
            "username": "apivendor",
            "email": "apivendor@example.com",
            "password": "a-strong-password-123",
            "company_name": "API Vendor Ltd",
            "contact_name": "Api Vendor",
            "phone": "+15551239999",
            "country": "USA",
            "supply_categories": ["Textiles"],
        },
    )
    assert resp2.status_code == 201, resp2.text
    assert resp2.json()["company_name"] == "API Vendor Ltd"


async def test_registration_rejects_short_password(client) -> None:
    resp = await client.post(
        "/api/v1/auth/register/buyer",
        json={**_BUYER_BODY, "password": "short"},
    )
    assert resp.status_code == 422


async def test_registration_missing_company_fields_rejected(client) -> None:
    body = {k: v for k, v in _BUYER_BODY.items() if k != "company_name"}
    resp = await client.post("/api/v1/auth/register/buyer", json=body)
    assert resp.status_code == 422


async def test_registration_rejects_unexpected_fields(client) -> None:
    resp = await client.post(
        "/api/v1/auth/register/buyer",
        json={**_BUYER_BODY, "is_admin": True, "status": "ACTIVE"},
    )
    assert resp.status_code == 422


async def test_vendor_endpoint_requires_supply_categories(client) -> None:
    resp = await client.post(
        "/api/v1/auth/register/vendor",
        json={**_BUYER_BODY, "username": "v2", "email": "v2@example.com"},
    )
    assert resp.status_code == 422
