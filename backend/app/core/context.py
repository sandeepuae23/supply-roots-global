"""Request-scoped context (correlation / request identifiers).

A single request id is generated (or accepted from the ``X-Request-ID`` header)
per request and made available throughout the call via a ``ContextVar`` so that
loggers and audit records can attach it without threading it through every call.
"""

from __future__ import annotations

import uuid
from contextvars import ContextVar

_request_id_ctx: ContextVar[str | None] = ContextVar("request_id", default=None)


def new_request_id() -> str:
    return str(uuid.uuid4())


def set_request_id(request_id: str) -> None:
    _request_id_ctx.set(request_id)


def get_request_id() -> str | None:
    return _request_id_ctx.get()
