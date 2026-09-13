"""PostgreSQL-only concurrency tests for lockout and refresh rotation.

These require true row-level ``SELECT ... FOR UPDATE`` semantics and are skipped
unless ``TEST_DATABASE_URL`` points at a PostgreSQL 16 database. Each concurrent
actor uses an independent session/connection so the database — not the test — is
what serialises the critical sections.
"""

from __future__ import annotations

import asyncio
import os
import uuid

import pytest
import pytest_asyncio
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.errors import AuthenticationError
from app.db.base import Base
from app.models.audit_log import AdminAuditLog
from app.models.enums import AccountStatus, AuditAction
from app.models.refresh_token import RefreshToken
from app.modules.auth import service as auth_service
from app.modules.rbac import service as rbac_service
from tests.helpers import DEFAULT_PASSWORD, make_user

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")

pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.integration,
    pytest.mark.skipif(
        not TEST_DATABASE_URL,
        reason="Set TEST_DATABASE_URL to a PostgreSQL 16 DSN to run concurrency tests.",
    ),
]


@pytest_asyncio.fixture
async def pg_factory():
    engine = create_async_engine(TEST_DATABASE_URL, poolclass=None)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)
    async with factory() as s:
        await rbac_service.seed_roles_and_permissions(s)
        await s.commit()
    yield factory
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


async def _attempt_login(factory, identifier: str, password: str) -> bool:
    """Return True on success, False on AuthenticationError."""
    async with factory() as session:
        try:
            await auth_service.authenticate(session, identifier=identifier, password=password)
            return True
        except AuthenticationError:
            return False


@pytest.mark.parametrize("run", range(5))  # repeat to catch intermittent bypasses
async def test_concurrent_failures_lock_exactly_once(pg_factory, run: int) -> None:
    uniq = uuid.uuid4().hex[:8]
    async with pg_factory() as s:
        user = await make_user(
            s, username=f"conc_{uniq}", email=f"conc_{uniq}@example.com"
        )
    user_id = user.id

    # Fire more concurrent wrong-password attempts than the lock threshold.
    results = await asyncio.gather(
        *[_attempt_login(pg_factory, f"conc_{uniq}", "wrong") for _ in range(6)]
    )
    assert not any(results)  # all fail

    async with pg_factory() as s:
        refreshed = await s.get(type(user), user_id)
        assert refreshed.status == AccountStatus.LOCKED
        # Exactly one system LOCK audit entry despite the race.
        lock_audits = await s.scalar(
            select(func.count())
            .select_from(AdminAuditLog)
            .where(
                AdminAuditLog.target_user_id == user_id,
                AdminAuditLog.action == AuditAction.LOCK,
            )
        )
        assert lock_audits == 1


async def test_concurrent_refresh_allows_exactly_one_rotation(pg_factory) -> None:
    uniq = uuid.uuid4().hex[:8]
    async with pg_factory() as s:
        await make_user(s, username=f"rot_{uniq}", email=f"rot_{uniq}@example.com")
        issued = await auth_service.authenticate(
            s, identifier=f"rot_{uniq}", password=DEFAULT_PASSWORD
        )
    token = issued.refresh_token

    async def _refresh() -> bool:
        async with pg_factory() as session:
            try:
                await auth_service.refresh(session, presented_value=token)
                return True
            except AuthenticationError:
                return False

    results = await asyncio.gather(*[_refresh() for _ in range(8)])
    assert sum(1 for r in results if r) == 1  # exactly one rotation wins


async def test_replay_after_rotation_revokes_family_pg(pg_factory) -> None:
    uniq = uuid.uuid4().hex[:8]
    async with pg_factory() as s:
        await make_user(s, username=f"fam_{uniq}", email=f"fam_{uniq}@example.com")
        issued = await auth_service.authenticate(
            s, identifier=f"fam_{uniq}", password=DEFAULT_PASSWORD
        )
    first = issued.refresh_token
    async with pg_factory() as s:
        rotated = await auth_service.refresh(s, presented_value=first)
    # Replay the original (now-rotated) token.
    async with pg_factory() as s:
        with pytest.raises(AuthenticationError):
            await auth_service.refresh(s, presented_value=first)
    # The whole family is revoked, including the rotated child.
    async with pg_factory() as s:
        with pytest.raises(AuthenticationError):
            await auth_service.refresh(s, presented_value=rotated.refresh_token)
        active = await s.scalar(
            select(func.count()).select_from(RefreshToken).where(RefreshToken.revoked_at.is_(None))
        )
        assert active == 0
