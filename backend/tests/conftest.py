"""Shared pytest fixtures.

Unit and service tests run against an isolated in-memory SQLite database so they
execute anywhere without external services. Tests that require true PostgreSQL
semantics (row-level ``FOR UPDATE`` concurrency) are marked ``integration`` and
skipped unless ``TEST_DATABASE_URL`` is provided.
"""

from __future__ import annotations

import os

# The JWT signing key is required and fails closed on an unset/placeholder value
# in every environment (see app.core.config). Provide an explicit test secret
# BEFORE any application module (and thus Settings) is imported below.
os.environ.setdefault("LEO_JWT_SECRET_KEY", "test-only-secret-key-not-for-production-use-0123456789")
os.environ.setdefault("LEO_ENVIRONMENT", "test")

from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db
from app.db.base import Base
from app.main import create_app
from app.modules.rbac import service as rbac_service

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture
async def engine():
    """A fresh in-memory SQLite engine with the full schema created."""
    eng = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture
async def session_factory(engine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)


@pytest_asyncio.fixture
async def db(session_factory) -> AsyncGenerator[AsyncSession, None]:
    async with session_factory() as session:
        yield session


@pytest_asyncio.fixture
async def seeded(db: AsyncSession) -> None:
    await rbac_service.seed_roles_and_permissions(db)
    await db.commit()


@pytest_asyncio.fixture
async def client(session_factory, seeded) -> AsyncGenerator[AsyncClient, None]:
    """An HTTP client bound to the app, overriding the DB dependency."""
    app = create_app()

    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
