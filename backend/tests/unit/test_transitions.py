"""Unit tests for the account status state machine."""

from __future__ import annotations

import pytest

from app.core.errors import InvalidStateTransitionError
from app.models.enums import AccountStatus
from app.modules.accounts.transitions import (
    AdminAction,
    invalidates_sessions,
    resolve_transition,
)

S = AccountStatus


@pytest.mark.parametrize(
    ("action", "start", "expected"),
    [
        (AdminAction.APPROVE, S.PENDING_APPROVAL, S.ACTIVE),
        (AdminAction.REJECT, S.PENDING_APPROVAL, S.REJECTED),
        (AdminAction.LOCK, S.ACTIVE, S.LOCKED),
        (AdminAction.UNLOCK, S.LOCKED, S.ACTIVE),
        (AdminAction.SUSPEND, S.ACTIVE, S.SUSPENDED),
        (AdminAction.REACTIVATE, S.SUSPENDED, S.ACTIVE),
        (AdminAction.DISABLE, S.ACTIVE, S.DISABLED),
        (AdminAction.DISABLE, S.LOCKED, S.DISABLED),
        (AdminAction.DISABLE, S.SUSPENDED, S.DISABLED),
    ],
)
def test_valid_transitions(action: AdminAction, start: AccountStatus, expected: AccountStatus) -> None:
    assert resolve_transition(action, start) == expected


@pytest.mark.parametrize(
    ("action", "start"),
    [
        (AdminAction.APPROVE, S.ACTIVE),
        (AdminAction.APPROVE, S.REJECTED),
        (AdminAction.REJECT, S.ACTIVE),
        # Suspend must not bypass unlock: cannot suspend a LOCKED account.
        (AdminAction.SUSPEND, S.LOCKED),
        (AdminAction.SUSPEND, S.PENDING_APPROVAL),
        # Manual lock only from ACTIVE.
        (AdminAction.LOCK, S.SUSPENDED),
        (AdminAction.LOCK, S.LOCKED),
        (AdminAction.UNLOCK, S.ACTIVE),
        (AdminAction.REACTIVATE, S.ACTIVE),
        # Terminal states admit no transition.
        (AdminAction.DISABLE, S.REJECTED),
        (AdminAction.DISABLE, S.DISABLED),
        (AdminAction.APPROVE, S.DISABLED),
    ],
)
def test_invalid_transitions_raise(action: AdminAction, start: AccountStatus) -> None:
    with pytest.raises(InvalidStateTransitionError):
        resolve_transition(action, start)


def test_session_invalidating_actions() -> None:
    assert invalidates_sessions(AdminAction.LOCK) is True
    assert invalidates_sessions(AdminAction.SUSPEND) is True
    assert invalidates_sessions(AdminAction.DISABLE) is True
    assert invalidates_sessions(AdminAction.REJECT) is True
    assert invalidates_sessions(AdminAction.APPROVE) is False
    assert invalidates_sessions(AdminAction.UNLOCK) is False
    assert invalidates_sessions(AdminAction.REACTIVATE) is False
