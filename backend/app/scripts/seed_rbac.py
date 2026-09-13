"""Idempotently seed the role and permission catalog.

Usage::

    python -m app.scripts.seed_rbac
"""

from __future__ import annotations

import asyncio

from app.db.session import dispose_engine, get_session_factory
from app.modules.rbac import service as rbac_service


async def _async_main() -> None:
    factory = get_session_factory()
    async with factory() as session:
        await rbac_service.seed_roles_and_permissions(session)
        await session.commit()
    await dispose_engine()
    print("Roles and permissions seeded.")


def main() -> None:
    asyncio.run(_async_main())


if __name__ == "__main__":
    main()
