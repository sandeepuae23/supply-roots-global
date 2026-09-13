"""The account status state machine.

Encodes the allowed transitions from the roadmap. Invalid transitions raise
:class:`InvalidStateTransitionError` (HTTP 409). Terminal statuses
(``REJECTED``, ``DISABLED``) admit no further transitions.
"""

from __future__ import annotations

from enum import StrEnum

from app.core.errors import InvalidStateTransitionError
from app.models.enums import AccountStatus, AuditAction


class AdminAction(StrEnum):
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    LOCK = "LOCK"
    UNLOCK = "UNLOCK"
    SUSPEND = "SUSPEND"
    REACTIVATE = "REACTIVATE"
    DISABLE = "DISABLE"


# action -> (allowed source statuses, resulting status)
_TRANSITIONS: dict[AdminAction, tuple[frozenset[AccountStatus], AccountStatus]] = {
    AdminAction.APPROVE: (frozenset({AccountStatus.PENDING_APPROVAL}), AccountStatus.ACTIVE),
    AdminAction.REJECT: (frozenset({AccountStatus.PENDING_APPROVAL}), AccountStatus.REJECTED),
    AdminAction.LOCK: (frozenset({AccountStatus.ACTIVE}), AccountStatus.LOCKED),
    AdminAction.UNLOCK: (frozenset({AccountStatus.LOCKED}), AccountStatus.ACTIVE),
    AdminAction.SUSPEND: (frozenset({AccountStatus.ACTIVE}), AccountStatus.SUSPENDED),
    AdminAction.REACTIVATE: (frozenset({AccountStatus.SUSPENDED}), AccountStatus.ACTIVE),
    AdminAction.DISABLE: (
        frozenset({AccountStatus.ACTIVE, AccountStatus.LOCKED, AccountStatus.SUSPENDED}),
        AccountStatus.DISABLED,
    ),
}

_ACTION_TO_AUDIT: dict[AdminAction, AuditAction] = {
    AdminAction.APPROVE: AuditAction.APPROVE,
    AdminAction.REJECT: AuditAction.REJECT,
    AdminAction.LOCK: AuditAction.LOCK,
    AdminAction.UNLOCK: AuditAction.UNLOCK,
    AdminAction.SUSPEND: AuditAction.SUSPEND,
    AdminAction.REACTIVATE: AuditAction.REACTIVATE,
    AdminAction.DISABLE: AuditAction.DISABLE,
}

# Security-sensitive transitions that must invalidate existing sessions by
# bumping ``auth_version`` and revoking active refresh tokens.
_SESSION_INVALIDATING: frozenset[AdminAction] = frozenset(
    {AdminAction.LOCK, AdminAction.SUSPEND, AdminAction.DISABLE, AdminAction.REJECT}
)


def resolve_transition(action: AdminAction, current: AccountStatus) -> AccountStatus:
    """Validate ``action`` against ``current`` status and return the new status.

    Raises :class:`InvalidStateTransitionError` if the transition is not allowed.
    """
    allowed_from, new_status = _TRANSITIONS[action]
    if current not in allowed_from:
        raise InvalidStateTransitionError(
            f"Cannot {action.value.lower()} an account in status "
            f"{current.value}. Allowed from: "
            f"{', '.join(sorted(s.value for s in allowed_from))}."
        )
    return new_status


def audit_action_for(action: AdminAction) -> AuditAction:
    return _ACTION_TO_AUDIT[action]


def invalidates_sessions(action: AdminAction) -> bool:
    return action in _SESSION_INVALIDATING
