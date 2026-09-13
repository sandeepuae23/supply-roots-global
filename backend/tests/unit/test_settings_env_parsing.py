"""Regression tests for parsing list settings from real environment variables.

These construct ``Settings`` after setting ``LEO_*`` environment variables so the
``EnvSettingsSource`` path is exercised — the path that previously raised a
``SettingsError`` because pydantic-settings JSON-decoded ``list[str]`` fields
before the CSV validator ran. A bare value such as the exact one Docker Compose
passes (``LEO_CORS_ALLOW_ORIGINS=http://localhost:3100``) must parse cleanly.
"""

from __future__ import annotations

import pytest

from app.core.config import Settings

# A valid signing key so ``Settings()`` construction reaches field parsing rather
# than failing closed on the required JWT secret.
_JWT = "test-only-secret-key-not-for-production-use-0123456789"


@pytest.fixture(autouse=True)
def _base_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Provide the required JWT secret so construction reaches field parsing."""
    monkeypatch.setenv("LEO_JWT_SECRET_KEY", _JWT)


def _settings() -> Settings:
    # ``_env_file=None`` keeps the test hermetic: only os.environ feeds Settings.
    return Settings(_env_file=None)


def test_cors_single_bare_url_from_env_matches_compose(monkeypatch: pytest.MonkeyPatch) -> None:
    """The exact single value Compose sets must parse to a one-item list."""
    monkeypatch.setenv("LEO_CORS_ALLOW_ORIGINS", "http://localhost:3100")
    s = _settings()
    assert s.cors_allow_origins == ["http://localhost:3100"]


def test_cors_multi_item_csv_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LEO_CORS_ALLOW_ORIGINS", "http://localhost:3100, http://localhost:5173")
    s = _settings()
    assert s.cors_allow_origins == ["http://localhost:3100", "http://localhost:5173"]


def test_supported_languages_csv_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LEO_SUPPORTED_LANGUAGES", "en,ar,fr,es,zh")
    s = _settings()
    assert s.supported_languages == ["en", "ar", "fr", "es", "zh"]


def test_supported_currencies_csv_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LEO_SUPPORTED_CURRENCIES", "AED, USD, EUR, GBP, INR, CNY")
    s = _settings()
    assert s.supported_currencies == ["AED", "USD", "EUR", "GBP", "INR", "CNY"]


def test_json_array_value_still_supported_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Documented JSON-array form keeps working alongside CSV."""
    monkeypatch.setenv("LEO_CORS_ALLOW_ORIGINS", '["http://a.example", "http://b.example"]')
    s = _settings()
    assert s.cors_allow_origins == ["http://a.example", "http://b.example"]


def test_defaults_used_when_env_absent() -> None:
    s = _settings()
    assert s.cors_allow_origins == ["http://localhost:5173"]
    assert s.supported_languages == ["en", "ar", "fr", "es", "zh"]
    assert s.supported_currencies == ["AED", "USD", "EUR", "GBP", "INR", "CNY"]
