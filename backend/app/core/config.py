"""Application settings loaded and validated from the environment.

All configuration is sourced from environment variables (or an optional local
``.env`` file for development). No production secrets or signing keys are ever
committed to source control — see ``.env.example`` for the required names.
"""

from __future__ import annotations

import json
from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, PostgresDsn, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """Typed, validated application settings."""

    # All variables are namespaced with the ``LEO_`` prefix (e.g.
    # ``LEO_DATABASE_URL``) so the service never accidentally consumes generic
    # host environment variables such as ``DEBUG``, ``HOST``, or ``PORT``.
    model_config = SettingsConfigDict(
        env_prefix="LEO_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # -- Application -------------------------------------------------------
    app_name: str = "Leo Infinity Trade Portal API"
    environment: Literal["development", "test", "staging", "production"] = "development"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    # -- Server ------------------------------------------------------------
    host: str = "0.0.0.0"
    port: int = 8000

    # -- Database ----------------------------------------------------------
    # Async DSN used by the application at runtime, e.g.
    #   postgresql+asyncpg://user:pass@host:5432/dbname
    database_url: PostgresDsn = Field(  # type: ignore[assignment]
        default="postgresql+asyncpg://leo:leo@localhost:5432/leo_portal",
    )
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_pool_timeout: int = 30
    db_echo: bool = False

    # -- Security / JWT ----------------------------------------------------
    # REQUIRED in every environment. There is deliberately no usable default:
    # an unset/empty/placeholder value fails closed at settings construction
    # time (see ``_validate_secrets``), even in development, so the service can
    # never sign tokens with a guessable key. Tests must set LEO_JWT_SECRET_KEY.
    jwt_secret_key: str = ""
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 14

    # -- Proxy / client IP -------------------------------------------------
    # When False (the default) the service ignores ``X-Forwarded-For`` and uses
    # the direct socket peer as the client IP, so a client cannot spoof its IP
    # in audit records. Enable ONLY when the app sits behind a trusted reverse
    # proxy/load balancer that sets the header (see ``trusted_proxy_hops``).
    trust_forwarded_for: bool = False
    # Number of trusted proxy hops. The client IP is taken from the Nth entry
    # from the right of ``X-Forwarded-For`` so intermediary-appended values
    # cannot be spoofed by the client. Only used when trust_forwarded_for=True.
    trusted_proxy_hops: int = 1

    # -- Password / lockout policy ----------------------------------------
    password_min_length: int = 12
    password_max_length: int = 128
    max_failed_login_attempts: int = 3
    temporary_password_expire_minutes: int = 60

    # -- CORS --------------------------------------------------------------
    # ``NoDecode`` disables pydantic-settings' automatic JSON decoding of the raw
    # environment value so a bare, comma-separated string such as
    # ``LEO_CORS_ALLOW_ORIGINS=http://localhost:3100`` reaches ``_split_csv``
    # instead of raising a SettingsError during env parsing. The validator below
    # accepts both comma-separated values and JSON arrays.
    cors_allow_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:5173"]
    )

    # -- Locale reference data (Phase 0 conventions) -----------------------
    supported_languages: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["en", "ar", "fr", "es", "zh"]
    )
    supported_currencies: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["AED", "USD", "EUR", "GBP", "INR", "CNY"]
    )
    default_timezone: str = "UTC"

    # -- Logging -----------------------------------------------------------
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    log_json: bool = True

    @field_validator(
        "cors_allow_origins", "supported_languages", "supported_currencies", mode="before"
    )
    @classmethod
    def _split_csv(cls, value: object) -> object:
        """Parse list settings from env as comma-separated values or JSON arrays.

        These fields are annotated with ``NoDecode`` so pydantic-settings hands
        the raw environment string to this validator untouched (rather than
        JSON-decoding it first, which would reject a bare value like
        ``http://localhost:3100``). A string that looks like a JSON array is
        parsed as JSON; any other non-empty string is split on commas. Values
        that are already lists (defaults, or direct construction) pass through.
        """
        if not isinstance(value, str):
            return value
        stripped = value.strip()
        if stripped.startswith("["):
            return json.loads(stripped)
        return [item.strip() for item in stripped.split(",") if item.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment in ("staging", "production")

    @property
    def database_url_str(self) -> str:
        return str(self.database_url)

    @property
    def sync_database_url(self) -> str:
        """Synchronous DSN (psycopg/pg8000-style) used by Alembic when needed."""
        return self.database_url_str.replace("+asyncpg", "")

    # Placeholder/example values that must never be accepted as a real secret,
    # in ANY environment (including development and the shipped .env.example).
    _INSECURE_SECRETS = frozenset(
        {
            "",
            "change-me-in-non-development-environments",
            "change-me-generate-with-secrets-token_urlsafe-48",
            "changeme",
            "change-me",
            "secret",
            "chang.me",
        }
    )

    @model_validator(mode="after")
    def _validate_secrets(self) -> Settings:
        """Fail closed on a missing/placeholder JWT signing key everywhere.

        The signing key is required in every environment (development included):
        an unset, empty, or known-placeholder value raises immediately so the
        service never boots able to mint tokens with a guessable secret. In
        staging/production the key must additionally be at least 32 characters.
        """
        secret = self.jwt_secret_key.strip()
        if secret in self._INSECURE_SECRETS:
            raise ValueError(
                "LEO_JWT_SECRET_KEY must be set to a strong secret. Unset, empty, "
                "and placeholder values are rejected in every environment "
                f"(including '{self.environment}'). Generate one with: "
                'python -c "import secrets; print(secrets.token_urlsafe(48))"'
            )
        if self.is_production and len(secret) < 32:
            raise ValueError(
                "LEO_JWT_SECRET_KEY must be at least 32 characters in the "
                f"'{self.environment}' environment."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()


settings = get_settings()
