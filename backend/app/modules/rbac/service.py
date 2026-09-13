"""RBAC persistence: idempotent seeding, role lookup, permission resolution."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rbac import Permission, Role, RolePermission, UserRole
from app.modules.rbac.constants import (
    PERMISSIONS,
    ROLE_DESCRIPTIONS,
    ROLE_PERMISSIONS,
)


async def seed_roles_and_permissions(session: AsyncSession) -> None:
    """Create/refresh all permissions, roles, and their mappings idempotently.

    Safe to run repeatedly (e.g. on startup or via migration data step): existing
    rows are reused, missing rows are inserted, and role→permission links are
    reconciled to match the catalog.
    """
    # -- Permissions -------------------------------------------------------
    existing_perms = {
        p.name: p for p in (await session.execute(select(Permission))).scalars()
    }
    for name, description in PERMISSIONS.items():
        perm = existing_perms.get(name)
        if perm is None:
            perm = Permission(name=name, description=description)
            session.add(perm)
            existing_perms[name] = perm
        else:
            perm.description = description
    await session.flush()

    # -- Roles -------------------------------------------------------------
    existing_roles = {r.name: r for r in (await session.execute(select(Role))).scalars()}
    for name, description in ROLE_DESCRIPTIONS.items():
        role = existing_roles.get(name)
        if role is None:
            role = Role(name=name, description=description)
            session.add(role)
            existing_roles[name] = role
        else:
            role.description = description
    await session.flush()

    # -- Role → permission mapping ----------------------------------------
    existing_links = {
        (link.role_id, link.permission_id): link
        for link in (await session.execute(select(RolePermission))).scalars()
    }
    for role_name, perm_names in ROLE_PERMISSIONS.items():
        role = existing_roles[role_name]
        for perm_name in perm_names:
            perm = existing_perms[perm_name]
            key = (role.id, perm.id)
            if key not in existing_links:
                session.add(RolePermission(role_id=role.id, permission_id=perm.id))
    await session.flush()


async def get_role_by_name(session: AsyncSession, name: str) -> Role | None:
    result = await session.execute(select(Role).where(Role.name == name))
    return result.scalar_one_or_none()


async def assign_role(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    role_name: str,
    assigned_by: uuid.UUID | None = None,
) -> None:
    """Idempotently assign a named role to a user."""
    role = await get_role_by_name(session, role_name)
    if role is None:
        raise ValueError(f"Role {role_name!r} does not exist; seed roles first.")
    existing = await session.execute(
        select(UserRole).where(UserRole.user_id == user_id, UserRole.role_id == role.id)
    )
    if existing.scalar_one_or_none() is None:
        session.add(UserRole(user_id=user_id, role_id=role.id, assigned_by=assigned_by))
        await session.flush()


async def get_user_role_names(session: AsyncSession, user_id: uuid.UUID) -> list[str]:
    result = await session.execute(
        select(Role.name)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user_id)
    )
    return sorted(result.scalars().all())


async def get_user_permissions(session: AsyncSession, user_id: uuid.UUID) -> set[str]:
    """Resolve the effective set of permission names for a user."""
    result = await session.execute(
        select(Permission.name)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(UserRole, UserRole.role_id == RolePermission.role_id)
        .where(UserRole.user_id == user_id)
    )
    return set(result.scalars().all())
