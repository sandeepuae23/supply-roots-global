"""RBAC seeding, permission resolution, and idempotency."""

from __future__ import annotations

import pytest
from sqlalchemy import func, select

from app.models.rbac import Permission, Role
from app.modules.rbac import service as rbac_service
from app.modules.rbac.constants import PERMISSIONS, ROLE_DESCRIPTIONS, Perm, RoleName
from tests.helpers import make_user

pytestmark = pytest.mark.asyncio


async def test_seed_creates_all_roles_and_permissions(db) -> None:
    await rbac_service.seed_roles_and_permissions(db)
    await db.commit()
    role_count = await db.scalar(select(func.count()).select_from(Role))
    perm_count = await db.scalar(select(func.count()).select_from(Permission))
    assert role_count == len(ROLE_DESCRIPTIONS)
    assert perm_count == len(PERMISSIONS)


async def test_seed_is_idempotent(db) -> None:
    await rbac_service.seed_roles_and_permissions(db)
    await db.commit()
    await rbac_service.seed_roles_and_permissions(db)
    await db.commit()
    role_count = await db.scalar(select(func.count()).select_from(Role))
    assert role_count == len(ROLE_DESCRIPTIONS)


async def test_super_admin_has_all_permissions(db, seeded) -> None:
    admin = await make_user(
        db, username="sa", email="sa@example.com", role=RoleName.SUPER_ADMIN
    )
    perms = await rbac_service.get_user_permissions(db, admin.id)
    assert perms == set(PERMISSIONS.keys())


async def test_admin_role_has_account_permissions_but_not_roles_manage(db, seeded) -> None:
    admin = await make_user(db, username="op", email="op@example.com", role=RoleName.ADMIN)
    perms = await rbac_service.get_user_permissions(db, admin.id)
    assert Perm.ACCOUNTS_APPROVE in perms
    assert Perm.USERS_RESET_PASSWORD in perms
    assert Perm.ROLES_MANAGE not in perms


async def test_buyer_owner_has_no_account_permissions(db, seeded) -> None:
    buyer = await make_user(db, username="bo", email="bo@example.com", role=RoleName.BUYER_OWNER)
    perms = await rbac_service.get_user_permissions(db, buyer.id)
    assert Perm.ACCOUNTS_APPROVE not in perms
    assert perms == set()
