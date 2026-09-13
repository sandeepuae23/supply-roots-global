"""Login, lockout, and status-gating behaviour (sequential/functional)."""

from __future__ import annotations

import pytest

from app.core.errors import AuthenticationError
from app.models.enums import AccountStatus
from app.modules.auth import service as auth_service
from tests.helpers import DEFAULT_PASSWORD, make_user

pytestmark = pytest.mark.asyncio


async def test_successful_login_issues_tokens(db, seeded) -> None:
    user = await make_user(db, username="active1", email="active1@example.com")
    issued = await auth_service.authenticate(
        db, identifier="active1", password=DEFAULT_PASSWORD
    )
    assert issued.access_token
    assert issued.refresh_token
    assert issued.user.id == user.id


async def test_login_by_email(db, seeded) -> None:
    await make_user(db, username="byemail", email="byemail@example.com")
    issued = await auth_service.authenticate(
        db, identifier="ByEmail@Example.com", password=DEFAULT_PASSWORD
    )
    assert issued.access_token


async def test_three_failures_lock_account(db, seeded) -> None:
    user = await make_user(db, username="locky", email="locky@example.com")
    for _ in range(3):
        with pytest.raises(AuthenticationError):
            await auth_service.authenticate(db, identifier="locky", password="wrong")
    await db.refresh(user)
    assert user.status == AccountStatus.LOCKED
    assert user.failed_login_attempts >= 3
    # Even with the correct password, a locked account cannot log in.
    with pytest.raises(AuthenticationError):
        await auth_service.authenticate(db, identifier="locky", password=DEFAULT_PASSWORD)


async def test_successful_login_resets_counter(db, seeded) -> None:
    user = await make_user(db, username="resetme", email="resetme@example.com")
    for _ in range(2):
        with pytest.raises(AuthenticationError):
            await auth_service.authenticate(db, identifier="resetme", password="wrong")
    await db.refresh(user)
    assert user.failed_login_attempts == 2
    # Correct login resets the counter.
    await auth_service.authenticate(db, identifier="resetme", password=DEFAULT_PASSWORD)
    await db.refresh(user)
    assert user.failed_login_attempts == 0
    assert user.status == AccountStatus.ACTIVE


async def test_unknown_identifier_generic_error(db, seeded) -> None:
    with pytest.raises(AuthenticationError) as exc:
        await auth_service.authenticate(db, identifier="ghost", password="whatever")
    assert exc.value.code == "authentication_failed"


@pytest.mark.parametrize(
    "status",
    [
        AccountStatus.PENDING_APPROVAL,
        AccountStatus.SUSPENDED,
        AccountStatus.REJECTED,
        AccountStatus.DISABLED,
        AccountStatus.LOCKED,
    ],
)
async def test_non_active_status_denied_even_with_correct_password(
    db, seeded, status: AccountStatus
) -> None:
    await make_user(
        db, username=f"u_{status.value.lower()}", email=f"{status.value.lower()}@example.com",
        status=status,
    )
    with pytest.raises(AuthenticationError) as exc:
        await auth_service.authenticate(
            db, identifier=f"u_{status.value.lower()}", password=DEFAULT_PASSWORD
        )
    # Correct credentials on a non-active account yield a status-specific code.
    assert exc.value.status_code == 403


async def test_wrong_password_on_non_active_does_not_increment(db, seeded) -> None:
    user = await make_user(
        db, username="pend", email="pend@example.com", status=AccountStatus.PENDING_APPROVAL
    )
    with pytest.raises(AuthenticationError):
        await auth_service.authenticate(db, identifier="pend", password="wrong")
    await db.refresh(user)
    assert user.failed_login_attempts == 0
    assert user.status == AccountStatus.PENDING_APPROVAL
