# Phase 2 — DB-SCHEMA evidence (migration 0003)

Run 14 September 2026 against the live PostgreSQL 16 container (`:5433`).

## Migration round-trip on real PostgreSQL

| Check | Result |
| --- | --- |
| `alembic upgrade head` on empty database | 0001 -> 0002 -> 0003, clean |
| `alembic heads` | **1** (no competing heads) |

## Backfill with seeded pre-migration data

Seeded at 0002: 2 buyers (`b1` ACTIVE, `b2` PENDING_APPROVAL) + 1 vendor (`v1` ACTIVE).

| Assertion | Result |
| --- | --- |
| `companies` created | **3** — one per source profile row |
| ACTIVE OWNER memberships | **3** — exactly one per company |
| Company status derived from owner account status | `Co b1 -> ACTIVE`, `Co b2 -> PENDING_APPROVAL`, `Co v1 -> ACTIVE` |
| Profiles carrying `company_id` | 2/2 buyers |
| `business_clients.user_id` dropped | true |
| Legacy global company roles removed | 0 remaining |

A pending account does **not** yield an ACTIVE company — that mapping is the
reason the backfill joins `users` rather than defaulting every company to
ACTIVE.

## Downgrade refusal (contract section 8.3)

Added a second ACTIVE member to `Co b1`, then attempted `alembic downgrade`:

```
RuntimeError: 0003 migration aborted: refusing to downgrade: at least one
company has more than one ACTIVE member, and the pre-0003 schema cannot
represent that.
```

| Post-refusal check | Result |
| --- | --- |
| `companies` table still present | true |
| `company_members` rows preserved | 4 (nothing dropped) |

The refusal aborts inside the transaction, so no partial teardown occurs.

## Legitimate downgrade after removing the extra member

| Check | Result |
| --- | --- |
| Downgrade completes | yes |
| `business_clients.user_id` restored from OWNER membership | 2/2 |
| Phase 2 tables dropped | true |
| Global company roles re-created | 2 |

## Test suites

| Suite | Result |
| --- | --- |
| Backend unit + API | **130 passed**, 7 skipped |
| Backend PostgreSQL concurrency (explicit `TEST_DATABASE_URL`) | **7 passed** |
| **Total** | **137 passing** |
