"""Cryptographic primitives: password hashing, token signing, opaque secrets.

- Passwords use Argon2id (via ``argon2-cffi``).
- A fixed dummy Argon2id hash is verified against when a login identifier is
  unknown, so response timing does not disclose account existence.
- Refresh tokens are high-entropy opaque secrets; only a SHA-256 hash of the
  secret is stored at rest.
- Access tokens are short-lived signed JWTs.
"""

from __future__ import annotations

import contextlib
import hashlib
import hmac
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

from app.core.config import settings

_password_hasher = PasswordHasher()

# A precomputed hash of a random throwaway secret. Verifying an attacker-supplied
# password against this for unknown identifiers keeps the failure path's timing
# comparable to the success path.
_DUMMY_HASH = _password_hasher.hash(secrets.token_urlsafe(32))


# --------------------------------------------------------------------------- #
# Password hashing
# --------------------------------------------------------------------------- #
def hash_password(password: str) -> str:
    return _password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        _password_hasher.verify(password_hash, password)
        return True
    except (VerifyMismatchError, InvalidHashError):
        return False
    except Exception:  # any hashing error is treated as an authentication failure
        return False


def verify_dummy_password(password: str) -> None:
    """Verify against a dummy hash to equalise timing for unknown identifiers."""
    with contextlib.suppress(Exception):
        _password_hasher.verify(_DUMMY_HASH, password)


def password_needs_rehash(password_hash: str) -> bool:
    try:
        return _password_hasher.check_needs_rehash(password_hash)
    except Exception:
        return False


# --------------------------------------------------------------------------- #
# Temporary password generation
# --------------------------------------------------------------------------- #
def generate_temporary_password(length: int = 16) -> str:
    """Generate a strong, human-transferable one-time temporary password."""
    # token_urlsafe yields ~1.3 chars per byte; ensure at least ``length`` chars.
    raw = secrets.token_urlsafe(length)
    return raw[:length] if len(raw) >= length else raw


# --------------------------------------------------------------------------- #
# Opaque refresh-token secrets
# --------------------------------------------------------------------------- #
def generate_refresh_secret() -> str:
    return secrets.token_urlsafe(48)


def hash_token(secret: str) -> str:
    """Return a hex SHA-256 digest of an opaque high-entropy secret."""
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()


def constant_time_equals(a: str, b: str) -> bool:
    return hmac.compare_digest(a, b)


def build_refresh_token(token_id: uuid.UUID, secret: str) -> str:
    """Public refresh token value: ``<token_id>.<secret>`` for O(1) lookup."""
    return f"{token_id}.{secret}"


def split_refresh_token(value: str) -> tuple[uuid.UUID, str] | None:
    """Parse a public refresh token back into (token_id, secret)."""
    parts = value.split(".", 1)
    if len(parts) != 2:
        return None
    try:
        token_id = uuid.UUID(parts[0])
    except ValueError:
        return None
    return token_id, parts[1]


# --------------------------------------------------------------------------- #
# Access-token (JWT) helpers
# --------------------------------------------------------------------------- #
def create_access_token(
    *,
    subject: uuid.UUID,
    auth_version: int,
    must_change_password: bool,
    roles: list[str] | None = None,
    expires_minutes: int | None = None,
) -> tuple[str, datetime]:
    """Create a signed access token. Returns (token, expiry)."""
    now = datetime.now(UTC)
    expire = now + timedelta(minutes=expires_minutes or settings.access_token_expire_minutes)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "type": "access",
        "auth_version": auth_version,
        "mcp": must_change_password,
        "roles": roles or [],
        "iat": int(now.timestamp()),
        "nbf": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "jti": str(uuid.uuid4()),
    }
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token, expire


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and verify an access token, raising ``jwt`` errors on failure."""
    return jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
        options={"require": ["exp", "sub", "type"]},
    )
