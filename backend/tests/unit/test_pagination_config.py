"""Unit tests for pagination math and settings validation."""

from __future__ import annotations

import pytest

from app.core.config import Settings
from app.core.pagination import Page, PageParams


def test_page_meta_math() -> None:
    params = PageParams(page=2, page_size=10)
    assert params.offset == 10
    assert params.limit == 10
    page = Page.create(items=[1, 2, 3], total=25, params=params)
    assert page.meta.total_items == 25
    assert page.meta.total_pages == 3
    assert page.meta.page == 2


def test_page_empty() -> None:
    params = PageParams(page=1, page_size=20)
    page = Page.create(items=[], total=0, params=params)
    assert page.meta.total_pages == 0
    assert page.items == []


def test_production_requires_strong_secret() -> None:
    with pytest.raises(ValueError, match="JWT_SECRET_KEY"):
        Settings(
            environment="production",
            jwt_secret_key="short",
            database_url="postgresql+asyncpg://u:p@localhost/db",
        )


def test_production_accepts_strong_secret() -> None:
    s = Settings(
        environment="production",
        jwt_secret_key="x" * 48,
        database_url="postgresql+asyncpg://u:p@localhost/db",
    )
    assert s.is_production is True
    assert s.sync_database_url.startswith("postgresql://")


def test_csv_env_parsing() -> None:
    s = Settings(cors_allow_origins="http://a.com, http://b.com")
    assert s.cors_allow_origins == ["http://a.com", "http://b.com"]
