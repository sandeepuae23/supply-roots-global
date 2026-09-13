"""Health and readiness endpoints."""

from __future__ import annotations

from fastapi import APIRouter, status
from pydantic import BaseModel
from sqlalchemy import text

from app.api.deps import DbSession
from app.core.errors import AppError

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str


class ReadyResponse(BaseModel):
    status: str
    database: str


@router.get("/health/live", response_model=HealthResponse)
async def health_live() -> HealthResponse:
    """Liveness probe — the process is up and serving."""
    return HealthResponse(status="ok")


@router.get("/health/ready", response_model=ReadyResponse)
async def health_ready(session: DbSession) -> ReadyResponse:
    """Readiness probe — verifies database connectivity."""
    try:
        await session.execute(text("SELECT 1"))
    except Exception as exc:
        raise AppError(
            "Database is not ready.",
            code="not_ready",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        ) from exc
    return ReadyResponse(status="ok", database="ok")
