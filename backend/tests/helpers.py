"""Test helpers for constructing accounts directly in the database."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.enums import AccountStatus, UserType
from app.models.user import User
from app.modules.auth.service import normalize_email, normalize_username
from app.modules.rbac import service as rbac_service
from app.modules.rbac.constants import RoleName

DEFAULT_PASSWORD = "Sup3rSecret-Passw0rd!"


async def make_user(
    session: AsyncSession,
    *,
    username: str,
    email: str,
    password: str = DEFAULT_PASSWORD,
    user_type: UserType = UserType.BUYER,
    status: AccountStatus = AccountStatus.ACTIVE,
    role: str | None = None,
    must_change_password: bool = False,
) -> User:
    user = User(
        username=username,
        normalized_username=normalize_username(username),
        email=email,
        normalized_email=normalize_email(email),
        password_hash=hash_password(password),
        user_type=user_type,
        status=status,
        must_change_password=must_change_password,
        password_changed_at=datetime.now(UTC),
    )
    session.add(user)
    await session.flush()
    if role is not None:
        await rbac_service.assign_role(session, user_id=user.id, role_name=role)
    await session.commit()
    await session.refresh(user)
    return user


async def make_admin(
    session: AsyncSession,
    *,
    username: str = "root_admin",
    email: str = "admin@example.com",
    password: str = DEFAULT_PASSWORD,
) -> User:
    return await make_user(
        session,
        username=username,
        email=email,
        password=password,
        user_type=UserType.ADMIN,
        status=AccountStatus.ACTIVE,
        role=RoleName.SUPER_ADMIN,
    )


async def login(client, identifier: str, password: str = DEFAULT_PASSWORD):
    return await client.post(
        "/api/v1/auth/login", json={"identifier": identifier, "password": password}
    )


def auth_header(access_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {access_token}"}
