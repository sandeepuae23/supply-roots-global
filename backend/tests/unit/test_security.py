"""Unit tests for cryptographic primitives and token helpers."""

from __future__ import annotations

import time
import uuid

import jwt
import pytest

from app.core.security import (
    build_refresh_token,
    create_access_token,
    decode_access_token,
    generate_refresh_secret,
    generate_temporary_password,
    hash_password,
    hash_token,
    split_refresh_token,
    verify_dummy_password,
    verify_password,
)


def test_password_hash_and_verify() -> None:
    pw = "a-very-strong-passphrase"
    hashed = hash_password(pw)
    assert hashed != pw
    assert hashed.startswith("$argon2id$")
    assert verify_password(pw, hashed) is True
    assert verify_password("wrong", hashed) is False


def test_verify_password_handles_garbage_hash() -> None:
    assert verify_password("x", "not-a-real-hash") is False


def test_dummy_verify_never_raises() -> None:
    # Should silently absorb the mismatch (used for unknown identifiers).
    verify_dummy_password("anything")


def test_temporary_password_length() -> None:
    temp = generate_temporary_password(16)
    assert len(temp) == 16
    assert generate_temporary_password() != generate_temporary_password()


def test_refresh_token_roundtrip() -> None:
    secret = generate_refresh_secret()
    token_id = uuid.uuid4()
    public = build_refresh_token(token_id, secret)
    parsed = split_refresh_token(public)
    assert parsed is not None
    parsed_id, parsed_secret = parsed
    assert parsed_id == token_id
    assert parsed_secret == secret


def test_split_refresh_token_rejects_malformed() -> None:
    assert split_refresh_token("no-dot") is None
    assert split_refresh_token("not-a-uuid.secret") is None


def test_hash_token_is_deterministic_and_hex() -> None:
    secret = "abc"
    assert hash_token(secret) == hash_token(secret)
    assert len(hash_token(secret)) == 64


def test_access_token_encode_decode() -> None:
    subject = uuid.uuid4()
    token, expiry = create_access_token(
        subject=subject, auth_version=3, must_change_password=True, roles=["ADMIN"]
    )
    payload = decode_access_token(token)
    assert payload["sub"] == str(subject)
    assert payload["type"] == "access"
    assert payload["auth_version"] == 3
    assert payload["mcp"] is True
    assert payload["roles"] == ["ADMIN"]
    assert expiry.timestamp() == pytest.approx(payload["exp"], abs=1)


def test_expired_access_token_rejected() -> None:
    subject = uuid.uuid4()
    token, _ = create_access_token(
        subject=subject,
        auth_version=1,
        must_change_password=False,
        expires_minutes=-1,
    )
    time.sleep(0.01)
    with pytest.raises(jwt.ExpiredSignatureError):
        decode_access_token(token)
