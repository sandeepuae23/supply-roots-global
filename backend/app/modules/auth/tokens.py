"""Refresh-token lifecycle: issue, rotate, detect reuse, revoke families.

Refresh tokens are opaque high-entropy secrets. The public value returned to a
client is ``<token_id>.<secret>``; only ``sha256(secret)`` is persisted. Each
login starts a token *family*; every refresh rotates the current token to a new
child in the same family. Presenting an already-rotated (revoked) token is
treated as replay and revokes the entire family.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    build_refresh_token,
    generate_refresh_secret,
    hash_token,
    split_refresh_token,
)
from app.models.refresh_token import RefreshToken
from app.models.user import User


class RefreshOutcome:
    """Result of resolving a presented refresh token."""

    def __init__(
        self,
        *,
        token: RefreshToken | None,
        reuse_detected: bool,
        family_id: uuid.UUID | None,
    ) -> None:
        self.token = token
        self.reuse_detected = reuse_detected
        self.family_id = family_id


def _now() -> datetime:
    return datetime.now(UTC)


async def issue_refresh_token(
    session: AsyncSession,
    *,
    user: User,
    family_id: uuid.UUID | None = None,
    parent_id: uuid.UUID | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> tuple[RefreshToken, str]:
    """Create and persist a new refresh token; return (record, public value)."""
    secret = generate_refresh_secret()
    token_id = uuid.uuid4()
    record = RefreshToken(
        id=token_id,
        user_id=user.id,
        family_id=family_id or uuid.uuid4(),
        token_hash=hash_token(secret),
        parent_id=parent_id,
        auth_version=user.auth_version,
        expires_at=_now() + timedelta(days=settings.refresh_token_expire_days),
        ip_address=ip_address,
        user_agent=user_agent,
    )
    session.add(record)
    await session.flush()
    return record, build_refresh_token(token_id, secret)


async def resolve_presented_token(
    session: AsyncSession, *, value: str
) -> RefreshOutcome:
    """Look up a presented public refresh token and classify it.

    Uses a row lock so concurrent refreshes of the same token serialize, letting
    exactly one rotation succeed.
    """
    parsed = split_refresh_token(value)
    if parsed is None:
        return RefreshOutcome(token=None, reuse_detected=False, family_id=None)
    token_id, secret = parsed

    result = await session.execute(
        select(RefreshToken).where(RefreshToken.id == token_id).with_for_update()
    )
    record = result.scalar_one_or_none()
    if record is None:
        return RefreshOutcome(token=None, reuse_detected=False, family_id=None)

    # Constant-ish comparison via hash equality.
    if record.token_hash != hash_token(secret):
        return RefreshOutcome(token=None, reuse_detected=False, family_id=record.family_id)

    # Already revoked (e.g. previously rotated) → replay attempt.
    if record.revoked_at is not None:
        return RefreshOutcome(token=None, reuse_detected=True, family_id=record.family_id)

    # Expired.
    expires_at = record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    if expires_at <= _now():
        return RefreshOutcome(token=None, reuse_detected=False, family_id=record.family_id)

    return RefreshOutcome(token=record, reuse_detected=False, family_id=record.family_id)


async def rotate_token(
    session: AsyncSession,
    *,
    current: RefreshToken,
    user: User,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> tuple[RefreshToken, str]:
    """Revoke ``current`` and issue a replacement in the same family."""
    new_record, public_value = await issue_refresh_token(
        session,
        user=user,
        family_id=current.family_id,
        parent_id=current.id,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    current.revoked_at = _now()
    current.revoked_reason = "ROTATED"
    current.replaced_by_id = new_record.id
    await session.flush()
    return new_record, public_value


async def revoke_family(
    session: AsyncSession, *, family_id: uuid.UUID, reason: str
) -> int:
    """Revoke every active token in a family. Returns count revoked."""
    result = await session.execute(
        update(RefreshToken)
        .where(RefreshToken.family_id == family_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=_now(), revoked_reason=reason)
        .returning(RefreshToken.id)
    )
    return len(result.all())


async def revoke_all_for_user(
    session: AsyncSession, *, user_id: uuid.UUID, reason: str
) -> int:
    """Revoke every active session for a user. Returns count revoked."""
    result = await session.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=_now(), revoked_reason=reason)
        .returning(RefreshToken.id)
    )
    return len(result.all())


async def list_active_sessions(
    session: AsyncSession, *, user_id: uuid.UUID
) -> list[RefreshToken]:
    """Return the user's live sessions: neither revoked nor expired."""
    result = await session.execute(
        select(RefreshToken)
        .where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None),
            RefreshToken.expires_at > _now(),
        )
        .order_by(RefreshToken.issued_at.desc())
    )
    return list(result.scalars().all())


async def revoke_session_by_id(
    session: AsyncSession, *, user_id: uuid.UUID, session_id: uuid.UUID, reason: str
) -> bool:
    """Revoke one session owned by the user. Returns True if a row was revoked."""
    result = await session.execute(
        update(RefreshToken)
        .where(
            RefreshToken.id == session_id,
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None),
        )
        .values(revoked_at=_now(), revoked_reason=reason)
        .returning(RefreshToken.id)
    )
    return result.scalar_one_or_none() is not None
