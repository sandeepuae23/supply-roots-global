"""Refresh-token cookie helpers.

Refresh tokens are delivered ONLY as ``HttpOnly``, ``SameSite=Lax`` cookies
(``Secure`` in staging/production), scoped to ``/api/v1/auth``. The value is
never returned in a browser-readable JSON body. Non-browser clients that cannot
use cookies may still present the token explicitly in the request body of
``/auth/refresh`` and ``/auth/logout``.
"""

from __future__ import annotations

from fastapi import Response

from app.core.config import settings

REFRESH_COOKIE_NAME = "refresh_token"
_REFRESH_COOKIE_PATH = f"{settings.api_v1_prefix}/auth"


def set_refresh_cookie(response: Response, value: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=value,
        max_age=settings.refresh_token_expire_days * 24 * 3600,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
        path=_REFRESH_COOKIE_PATH,
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path=_REFRESH_COOKIE_PATH,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
    )
