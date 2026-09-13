"""Shared column type helpers."""

from __future__ import annotations

from enum import StrEnum
from typing import TypeVar

from sqlalchemy import Enum as SAEnum

E = TypeVar("E", bound=StrEnum)


def enum_column(enum_cls: type[E], *, name: str) -> SAEnum:
    """A constrained VARCHAR enum (portable across PostgreSQL and SQLite).

    ``native_enum=False`` emits a VARCHAR plus a CHECK constraint restricting the
    value to the enum members, avoiding PostgreSQL-only ``CREATE TYPE`` while
    still enforcing allowed values everywhere.
    """
    return SAEnum(
        enum_cls,
        name=name,
        native_enum=False,
        validate_strings=True,
        values_callable=lambda cls: [member.value for member in cls],
        length=64,
    )
