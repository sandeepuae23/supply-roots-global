"""Personal profile, preferences, devices, consent and deletion requests.

These are all keyed to a single user rather than a company. Two design points
carried from the Phase 2 contract:

* Notification preferences are a ``(topic, channel, enabled)`` matrix rather
  than a flat set of booleans, so new topics and channels extend the data
  without a migration (contract section 4).
* There is no ``sessions`` table. The session list is derived from
  ``refresh_tokens``, which already carries device, IP and timing metadata;
  ``user_devices`` only adds a stable id and a human label (section 5.1).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import (
    ConsentType,
    DeletionRequestStatus,
    NotificationChannel,
    NotificationTopic,
)

if TYPE_CHECKING:
    from app.models.user import User


def _enum_values(enum_cls: type) -> str:
    return ", ".join(f"'{m.value}'" for m in enum_cls)


class UserProfile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Optional personal details, one row per user."""

    __tablename__ = "user_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    job_title: Mapped[str | None] = mapped_column(String(120), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped[User] = relationship()


class UserPreference(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Locale preferences. Values are validated against the settings allowlists."""

    __tablename__ = "user_preferences"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    language: Mapped[str] = mapped_column(String(16), nullable=False, default="en")
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="AED")
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="UTC")

    user: Mapped[User] = relationship()


class NotificationPreference(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """One row per (user, topic, channel).

    A matrix rather than a column-per-topic: adding SHIPMENT or a new channel
    later is then data, not a schema change.
    """

    __tablename__ = "notification_preferences"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    topic: Mapped[str] = mapped_column(String(32), nullable=False)
    channel: Mapped[str] = mapped_column(String(32), nullable=False)
    enabled: Mapped[bool] = mapped_column(nullable=False, default=True)

    __table_args__ = (
        UniqueConstraint(
            "user_id", "topic", "channel", name="uq_notification_preferences_user_topic_channel"
        ),
        CheckConstraint(f"topic IN ({_enum_values(NotificationTopic)})", name="topic_valid"),
        CheckConstraint(
            f"channel IN ({_enum_values(NotificationChannel)})", name="channel_valid"
        ),
        Index("ix_notification_preferences_user_id", "user_id"),
    )


class UserDevice(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A stable device id plus a user-supplied label.

    Deliberately thin: everything else shown on the sessions screen is derived
    from ``refresh_tokens``. A device label can name a person ("Ali's iPhone"),
    so it is deleted outright on anonymization rather than scrubbed.
    """

    __tablename__ = "user_devices"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    device_key: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    __table_args__ = (
        UniqueConstraint("user_id", "device_key", name="uq_user_devices_user_device_key"),
        Index("ix_user_devices_user_id", "user_id"),
    )


class PrivacyConsent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Append-only consent history.

    Rows are never updated or deleted: a withdrawal is a new row with
    ``granted=False``. The history is the legal record, so it survives
    anonymization with the identifier replaced by the tombstone.
    """

    __tablename__ = "privacy_consents"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    consent_type: Mapped[str] = mapped_column(String(32), nullable=False)
    policy_version: Mapped[str] = mapped_column(String(32), nullable=False)
    granted: Mapped[bool] = mapped_column(nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    # Truncated at write time; never the full address.
    source_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)

    __table_args__ = (
        CheckConstraint(
            f"consent_type IN ({_enum_values(ConsentType)})", name="consent_type_valid"
        ),
        Index("ix_privacy_consents_user_id_recorded_at", "user_id", "recorded_at"),
    )


class AccountDeletionRequest(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Deletion request lifecycle.

    At most one non-terminal request per subject; a duplicate is rejected with
    409. Approval does not delete — it leads to anonymization, which is a
    separate, explicitly confirmed step (contract section 6).
    """

    __tablename__ = "account_deletion_requests"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    company_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("companies.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=DeletionRequestStatus.REQUESTED.value
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    decided_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    decided_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    decision_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    hold_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    anonymized_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    __table_args__ = (
        CheckConstraint(
            f"status IN ({_enum_values(DeletionRequestStatus)})", name="status_valid"
        ),
        Index("ix_account_deletion_requests_user_id_status", "user_id", "status"),
        Index("ix_account_deletion_requests_status", "status"),
    )
