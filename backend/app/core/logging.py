"""Structured logging configuration.

Uses ``structlog`` layered on top of the stdlib logging module. Every emitted
event carries the current request id (when present) and never includes
sensitive material — callers must not pass passwords, tokens, cookies, or
authorization headers into log events.
"""

from __future__ import annotations

import logging
import sys
from typing import Any

import structlog

from app.core.config import settings
from app.core.context import get_request_id

_SENSITIVE_KEYS = {
    "password",
    "new_password",
    "current_password",
    "temporary_password",
    "temp_password",
    "password_hash",
    "token",
    "access_token",
    "refresh_token",
    "token_hash",
    "authorization",
    "cookie",
    "set-cookie",
}


def _add_request_id(
    _: Any, __: str, event_dict: structlog.types.EventDict
) -> structlog.types.EventDict:
    request_id = get_request_id()
    if request_id is not None:
        event_dict.setdefault("request_id", request_id)
    return event_dict


def _redact_sensitive(
    _: Any, __: str, event_dict: structlog.types.EventDict
) -> structlog.types.EventDict:
    for key in list(event_dict.keys()):
        if key.lower() in _SENSITIVE_KEYS:
            event_dict[key] = "***REDACTED***"
    return event_dict


def configure_logging() -> None:
    """Configure structlog + stdlib logging once at startup."""
    level = getattr(logging, settings.log_level, logging.INFO)

    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=level,
    )

    processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        _add_request_id,
        _redact_sensitive,
        structlog.processors.StackInfoRenderer(),
    ]

    if settings.log_json:
        processors.append(structlog.processors.format_exc_info)
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer())

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(level),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    return structlog.get_logger(name)
