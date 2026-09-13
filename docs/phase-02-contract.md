# Phase 2 — Sequential gate P2-S1: Ownership contract

| Field | Value |
| --- | --- |
| Phase | 2 — Profiles, companies, sessions, preferences and privacy |
| Gate | P2-S1 (contract) — must pass before wave P2-P1 is assigned |
| Depends on | Phase 1 (`804558d`) |
| Revision | 7 — resolves the one revision-6 architecture re-review blocker (conditional classification of `companies.status` in the §8.3 column-inventory preflight) while preserving every revision-6 decision and the revision-5 testing/release **PASS** |
| Date | 13 September 2026 |
| Status | **DRAFT — both independent automated re-reviews now PASS on revision 7 (architecture and testing/release, 13 September 2026); remains DRAFT solely until both accountable human roles sign (section 9)** |

Revision 6 was returned **CHANGES REQUIRED** by the independent automated
architecture re-review (one final blocker) and its resolved controls were
otherwise accepted; the independent automated testing/release re-review remained
**PASS**, both dated 13 September 2026. Revision 7 resolves that single
architecture blocker without weakening any control:

- **Finding — `companies.status` is not unconditionally safely
  derived/disposable in the §8.3 column-inventory preflight.** Revision 6
  classified `companies.status` as **(D)** outright. But `companies.status`
  diverges from its deterministic §8.1a backfill baseline the moment any
  independent Phase-2 company lifecycle transition runs (approve/reject/
  suspend/reactivate, or a direct change), and that divergence is real Phase-2
  state the pre-0003 schema cannot hold — treating it as freely disposable would
  silently discard it. Revision 7 makes the classification **conditional**:
  `companies.status` is **(D)** only while its current value still equals the
  §8.1a baseline **recomputed for that specific company** from its owner
  `users.status` × `approved_at`; if it differs it is **(N)** and downgrade
  **refuses before any mutation**, **even when the Phase-2 governance audit row
  for that transition has aged out** (§5.2). Detection compares the stored value
  against the recomputed baseline, not the audit trail, so the refusal does not
  depend on any surviving audit row. Seeded tests cover both branches.

Revision 7 changes nothing else: every revision-6 decision and every
testing/release control is preserved verbatim except the one classification
above. The revision-6 history that produced the current body follows.

Revision 5 was returned **CHANGES REQUIRED** by the independent automated
architecture re-review (two findings) and **PASS** by the independent automated
testing/release re-review, both dated 13 September 2026. Revision 6 resolved the
two architecture findings without weakening a single testing/release control:

- **Finding 1 — purge/retention integrity.** (a) A still-`PENDING`
  `company_applications` claim must **never age out**: the previous purge anchor
  `COALESCE(terminal_at, consumed_at, created_at)` fell back to `created_at`,
  which meant a pending registration claim could be silently deleted by the
  retention job, breaking the atomic-registration invariant of section 1.9.
  Revision 6 gives `PENDING` **no retention anchor** — it is **ineligible for
  purge**; retention begins only at `consumed_at` (`CONSUMED`) or `terminal_at`
  (`WITHDRAWN`/`REJECTED`); there is no `created_at` fallback and no silent
  time-based deletion of a pending claim. (b) **Device/token purge ordering and
  holds** are made explicit: `refresh_tokens.device_id` is
  `ON DELETE SET NULL` as a safety fallback, the purge job deletes eligible
  refresh-token families **before** an eligible device, a device is purged only
  after no retained/held token row references it, and a legal hold on either side
  transitively protects both and preserves the relationship.
- **Finding 2 — downgrade Phase-2-only column inventory.** The revision-5
  downgrade preflight covered Phase-2-only *relations* but not the Phase-2-only
  *columns* added to existing/reconstructed Phase-1 tables (`companies`,
  `business_clients`, `vendors`, `users`, `refresh_tokens`, `admin_audit_logs`,
  `account_status_history`). Revision 6 adds a preflight **column-inventory
  matrix** classifying each such column as faithfully reconstructed, safely
  derived/disposable, or non-reconstructable, and **refuses before any
  destructive step** if any non-reconstructable Phase-2-only column holds
  non-null/non-default data.

Revision 6 changes nothing else: every revision-5 decision and every
testing/release control that earned the revision-5 PASS is preserved verbatim
except where the two findings above require a change, and no resolved control is
weakened. Revision 5 already resolved, and revision 6 keeps: the fail-closed
backfill mapping on `users.status` × `approved_at`; downgrade refusal while any
non-reconstructable Phase-2 **relation** has rows; deterministic purge anchors;
released-legal-hold retention; and the corrected anonymization inventory
(`users` string identity fields only, opaque-UUID tombstone key, exhaustive
subject-linked records). Revision 4 already **corrected the contract to Phase 1
ground truth**, which revisions 5 and 6 preserve:

- Phase 1 already ships **`users.status`** with the values `PENDING_APPROVAL`,
  `ACTIVE`, `LOCKED`, `SUSPENDED`, `REJECTED`, `DISABLED`. Phase 2 **reuses**
  this column. It does **not** add `users.account_status`, does not rename
  `users.status`, and migration `0003` never changes or backfills its value.
- The real audit tables are **`admin_audit_logs`** and
  **`account_status_history`**. Earlier revisions referred to non-existent
  `audit_logs` / `status_history` relations; those names are removed.
- The Phase 1 `AuditAction` enumeration is fixed (section 5.5); Phase 2 widens
  it in migration `0003`.
- Phase 1 `business_clients.user_id` and `vendors.user_id` are **unique**; the
  downgrade path relies on and re-checks this (section 8.3).

Revision 6 preserves every previously resolved decision — tenant isolation and
RBAC (sections 1.2, 1.3, 1.4, 1.6), invitation QA (section 2.1), downgrade role
and relation reconstruction (section 8.3), the reused `users.status` lifecycle
(section 1.8), the real audit tables, category-specific retention (section 5.2),
legal-hold override (section 5.6), the deterministic purge anchors and released-
legal-hold retention that earned the revision-5 testing/release PASS (sections
5.3, 5.6, 5.7), and human accountability (section 9). It only corrects them where
one of the two architecture findings requires it, and does not weaken any
resolved control. The revision-6 change log is at the end of this document.

## 0. What Phase 1 already established

Phase 2 extends these; it must not redefine them.

- `business_clients` and `vendors` exist, each with a **unique 1:1 `user_id`**
  to the registering user, plus `company_name`, `contact_name`, `phone`,
  `country` (and `supply_categories` on vendors). Because `user_id` is unique on
  each table, one user maps to at most one buyer profile and at most one vendor
  profile; the downgrade path re-verifies this (section 8.3).
- Roles seeded: `BUYER_OWNER`, `BUYER_MEMBER`, `VENDOR_OWNER`, `VENDOR_MEMBER`,
  plus the admin-side roles. **All four company roles currently carry an empty
  permission set** (`rbac/constants.py`), so they grant nothing today.
- The access token carries a **`roles` claim** (`core/security.py`
  `create_access_token`). This matters — see section 1.3.
- `refresh_tokens` stores `family_id`, `ip_address`, `user_agent`, `issued_at`,
  `expires_at`, `revoked_at`, `revoked_reason`, `auth_version`.
- **`admin_audit_logs`** exists with a constrained `action` `CHECK`/enum and an
  `actor_id`, plus contextual columns (target/user id, ip address, request /
  correlation id, structured context). **`account_status_history`** records
  account status transitions with `actor_id`, `from`/`to` status, reason and
  `created_at`. Phase 2 extends the `admin_audit_logs` action enumeration and
  adds a retention column to it — see sections 5.5 and 8.
- **`users` already carries a lifecycle column, `users.status`,** with values
  `PENDING_APPROVAL`, `ACTIVE`, `LOCKED`, `SUSPENDED`, `REJECTED`, `DISABLED`,
  together with the failed-login counter/state, `locked_at`, approval metadata
  (`approved_at`, approver), suspension metadata, and `auth_version`. Phase 2
  **reuses `users.status`** for the account lifecycle; it does not introduce a
  second account-state column — see section 1.8.

### Decision 0.1 — the 1:1 registration link becomes 1:N membership

A company is currently reachable only through the single user who registered
it. Teams cannot be built on that.

**Contract:** `companies` becomes the canonical company row.
`business_clients` and `vendors` become **type-specific profile extensions**
keyed by `company_id`, not `user_id`. The registering user becomes the first
`company_members` row with role `OWNER`. Migration `0003` performs the
conversion — see section 8.

This is the highest-risk change in Phase 2 and must land in `DB-SCHEMA` before
any lane builds on company identity.

## 1. Company ownership and member permission rules

### 1.1 Multi-company membership, restricted to matching account type

**Decision: a user may belong to multiple companies.** Staff move between
trading entities, and forcing one company per login would mean duplicate
accounts for the same natural person.

**Constraint: membership is restricted to companies matching the user's
immutable account type.** A `BUYER` user may join only buyer companies; a
`VENDOR` user only vendor companies. `users.user_type` is immutable after
registration.

Enforced in three places, because any one alone is insufficient:

1. **Database.** Same-type membership is enforced structurally, not by an
   ordinary `CHECK` — a `CHECK` constraint can only inspect the row being
   written, never the parent `users` or `companies` row it points at. The
   correct mechanism is a **composite foreign key**:
   - `users` gains `UNIQUE (id, user_type)` (a redundant composite key over the
     existing PK plus the immutable type).
   - `companies` gains `UNIQUE (id, company_type)`.
   - `company_members` stores denormalised `user_type` and `company_type` and
     declares two composite FKs:
     `FOREIGN KEY (user_id, user_type) REFERENCES users(id, user_type)` and
     `FOREIGN KEY (company_id, company_type) REFERENCES companies(id, company_type)`.
     Each composite FK forces the denormalised copy to equal the real parent
     value, so a row whose `user_type` disagrees with the user's true type, or
     whose `company_type` disagrees with the company's true type, cannot exist.
   - A single-row `CHECK (user_type = company_type)` on `company_members` then
     closes the loop: because the two composite FKs pin each column to its
     parent, this `CHECK` — which legitimately inspects only its own row — now
     transitively guarantees `users.user_type = companies.company_type`.
     A mismatched row cannot be inserted even by a buggy service or a manual
     query.
2. **Service** — membership creation re-verifies the types before insert and
   fails with `company_type_mismatch`.
3. **Request authorisation** — see 1.2.

### 1.2 Explicit tenant selection on every request

There is no implicit "current company". Ambiguity here is how cross-tenant
leaks happen.

- Every company-scoped request **must carry an explicit `company_id`**, as a
  path parameter (`/api/v1/companies/{company_id}/...`) or, for collection
  endpoints that span companies, a required `company_id` query parameter.
- A missing `company_id` is a **422**, never a default to "the user's only
  company" — that default silently breaks the moment a user joins a second one.
- On every request the server **re-reads `company_members` from the database**
  and verifies: the row exists, its `status` authorises the requested route,
  and `user_type` matches `company_type`. **No membership fact may be cached in,
  or read from, the token.**
  - For **trade/business** (ordinary company-scoped) routes the membership
    `status` must be `ACTIVE` and the company `status` must be `ACTIVE`.
  - For the **narrow pending-company onboarding** route only (section 1.10) a
    membership `status = PENDING_COMPANY_REVIEW` on a `PENDING_REVIEW` company
    is authorised, for the named OWNER whose `users.status = ACTIVE`, and for
    the onboarding-field allowlist only.
- A company in `PENDING_REVIEW`, `SUSPENDED` or `REJECTED` state permits **no
  trade/business operation** — see 1.8 and 1.10.
- Failure returns **404**, never 403 — see 1.6.

### 1.3 Company roles come from `company_members`, never from the JWT

The access token's `roles` claim is issued at login and is stale by
construction: it cannot reflect a membership revoked, downgraded or added
mid-session.

**Contract:**

- The `roles` claim is authoritative **only** for platform-wide administrative
  roles (`SUPER_ADMIN`, `ADMIN`, `SALES`, `QUALITY`, `DOCUMENTATION`,
  `LOGISTICS`, `FINANCE`).
- **Company authority is read from `company_members` on every request.** No
  company-scoped decision may consult the `roles` claim.
- `QA-SECURITY` must include a test that forges a token containing
  `BUYER_OWNER` / `VENDOR_OWNER` for a company the user is not a member of, and
  asserts the request is refused. This is the regression that proves the rule
  (also enumerated in the tenant-isolation matrix, section 1.11).

### 1.4 Global `BUYER_OWNER` and `VENDOR_OWNER` are de-authorised

Keeping company-shaped names in the global role catalogue invites exactly the
mistake 1.3 forbids.

- `BUYER_OWNER`, `BUYER_MEMBER`, `VENDOR_OWNER`, `VENDOR_MEMBER` are **removed
  from the global role catalogue** and from `seed_rbac`, in the **same
  compatible release** that lands the membership model (section 1.9).
- Migration `0003` deletes any `user_roles` assignments referencing them and
  removes the role rows. This is safe: all four carry empty permission sets
  today, so no capability is lost.
- The names are **reserved** — they must not be reintroduced as global roles.
- Company roles live only in `company_members.role`, drawn from a separate
  enum: `OWNER`, `ADMIN_MEMBER`, `MEMBER`, `VIEWER`.
- The `downgrade()` path reconstructs these global assignments faithfully —
  see 8.3.

### 1.5 Capability matrix

Scoped to the member's own company only, and only while both the company and
the acting membership are `ACTIVE` (section 1.8). The narrow onboarding-field
allowlist (section 1.10) is the sole exception, and it grants only the
onboarding subset below, not the full OWNER capability set.

| Capability | OWNER | ADMIN_MEMBER | MEMBER | VIEWER |
| --- | --- | --- | --- | --- |
| View company profile | yes | yes | yes | yes |
| Edit company profile, addresses, contacts | yes | yes | no | no |
| Manage facilities / sourcing locations (vendor) | yes | yes | no | no |
| Invite members | yes | yes | no | no |
| Remove members | yes | yes | no | no |
| Change a member's role | yes | no | no | no |
| Transfer ownership | yes | no | no | no |
| Request company deletion | yes | no | no | no |
| Upload company documents | yes | yes | yes | no |

- A member may never grant a role above their own.
- Permission names follow the Phase 1 `resource.action` convention:
  `company.read`, `company.update`, `company.members.invite`,
  `company.members.remove`, `company.members.set_role`,
  `company.ownership.transfer`, `company.documents.upload`,
  `company.addresses.manage`, `company.facilities.manage`.

### 1.6 Isolation is enforced in the query, not after it

Every company-scoped query **must** filter by `company_id` in the `WHERE`
clause. Loading a row and then comparing ownership is prohibited: it leaks
existence through timing and through the 403/404 distinction.

**A cross-company request returns 404, never 403** — a 403 confirms the
resource exists. This differs from the Phase 1 admin endpoints, which correctly
return 403, because an administrator is authorised to know an account exists.

### 1.7 Atomic ownership transfer and exactly one active owner

The invariant is **exactly one** `ACTIVE` member with role `OWNER` per
`ACTIVE` company, at all times — not *at most one*, and not *at least one*.

- A **partial unique index** enforces the *at-most-one* half:
  `UNIQUE (company_id) WHERE role = 'OWNER' AND status = 'ACTIVE'`. The database
  makes a second owner impossible. **This index alone cannot enforce the
  *at-least-one* half** — it is satisfied by zero owners — so a second control
  is required.
- **Two shared-logic `DEFERRABLE INITIALLY DEFERRED` constraint triggers**
  enforce the *exactly-one* invariant, checked once at **transaction commit**
  rather than per statement. Both call the **same** check function so their
  behaviour cannot drift. Deferral is essential: an ownership transfer or a
  company activation legitimately passes through a mid-transaction moment with
  zero or two owners, and a per-statement trigger would reject the very
  operation it is meant to permit.
  - **Trigger A — on `company_members`:** fires
    `AFTER INSERT OR UPDATE OR DELETE ... FOR EACH ROW` on any change that could
    affect the owner count of a company (`role`, `status`, `company_id`, or row
    existence). This catches member insert/update/delete and ownership transfer.
  - **Trigger B — on `companies`:** fires `AFTER INSERT OR UPDATE ... FOR EACH
    ROW` when `status` is set to or changed to `ACTIVE`. This is the missing
    control from revision 3: **activating a company is an `UPDATE` to
    `companies` that does not touch `company_members`, so Trigger A never
    fires.** Without Trigger B an `ACTIVE` company could commit with zero or
    multiple `ACTIVE OWNER` memberships. Trigger B re-runs the shared check for
    the affected `company_id`.
  - **Shared check (at commit),** for every affected `company_id`: count rows
    where `role = 'OWNER' AND status = 'ACTIVE'` and raise
    `owner_cardinality_violation` unless the count is exactly 1 **when the
    company is `ACTIVE`**. A company that is not yet `ACTIVE`
    (`PENDING_REVIEW`) is exempt from the *at-least-one* check until activation;
    the *at-most-one* half (the partial unique index) still applies at all
    times. Once `companies.status = 'ACTIVE'` the exactly-one invariant is
    mandatory.
  - **Insert:** a new `ACTIVE` company must reach commit with exactly one active
    owner. A `PENDING_REVIEW` company may commit with a single pending owner.
  - **Update:** demotion/promotion/status changes, and company activation, are
    validated in aggregate at commit, so a `FOR UPDATE`-serialised transfer that
    demotes-then-promotes, or an activation that flips both the company and the
    owner membership to `ACTIVE`, commits cleanly.
  - **Delete:** deleting or soft-deleting the sole active owner of an active
    company fails at commit.
- Transfer is a **single transaction** that selects both membership rows
  `FOR UPDATE` (ordered by `user_id` to avoid deadlock), demotes the current
  owner to `ADMIN_MEMBER`, and promotes the target to `OWNER`. `FOR UPDATE`
  serialises concurrent transfers; the deferred triggers guarantee the
  end-state cardinality. There is no committed state with zero or two owners.
- The target must already be an `ACTIVE` member of the same company. Transfer to
  a non-member, or to an `INVITED`/`PENDING_COMPANY_REVIEW` user, is rejected.
- The last owner **cannot leave, be removed, or be demoted**; the only exit is
  transfer. Attempts return `last_owner_cannot_leave`.
- Every transfer writes an audit record (`company.ownership.transfer`, section
  5.5) naming both parties and a reason.
- **Migration backfill:** migration `0003` creates both triggers as
  `DEFERRABLE INITIALLY DEFERRED` and, before creating them, backfills the
  correct owner membership per company (section 8.1) according to the mapping in
  section 8.1a. The section 8.2 assertion "every `ACTIVE` company has exactly
  one `ACTIVE OWNER`, and every non-`ACTIVE` company has at most one" runs
  inside the migration transaction so neither trigger is created over data that
  would immediately violate it.
- **Tests required (`QA-SECURITY`)** cover, at minimum: direct SQL that inserts
  a second `ACTIVE OWNER`; direct SQL/company activation that leaves zero
  `ACTIVE OWNER`; company activation (`companies.status → ACTIVE`) with zero and
  with two active owners (Trigger B); member insert, update and delete affecting
  owner count (Trigger A); and a full ownership transfer committing exactly one
  owner. Each asserts commit success or `owner_cardinality_violation` as
  appropriate.

### 1.8 Account state and company state are distinct

Two independent lifecycles, deliberately separated (see also section 1.9 for
the deployment order). Conflating them is the defect earlier revisions
resolved; revision 4 aligns the account lifecycle to the **existing
`users.status`** column rather than inventing a new one.

- **`users.status` (Phase 1, reused unchanged):** the six values are
  `PENDING_APPROVAL`, `ACTIVE`, `LOCKED`, `SUSPENDED`, `REJECTED`, `DISABLED`.
  Phase 2 does not add, rename or re-value this column.
  - Only a user whose `users.status = ACTIVE` can authenticate and be issued
    tokens. `PENDING_APPROVAL`, `LOCKED`, `SUSPENDED`, `REJECTED` and `DISABLED`
    users **cannot log in** — login returns the Phase 1 auth-failure envelope;
    no access or refresh token is issued.
  - Account approval (`APPROVE`), rejection (`REJECT`), lock/unlock
    (`LOCK`/`UNLOCK`), suspend/reactivate (`SUSPEND`/`REACTIVATE`) and disable
    (`DISABLE`) are the Phase 1 admin transitions and remain the sole authority
    over login eligibility. Company state never overrides them.
- **`companies.status`:** `PENDING_REVIEW` → `ACTIVE` | `REJECTED`;
  `ACTIVE` → `SUSPENDED` → `ACTIVE`.
  - A company that is not `ACTIVE` permits **no trade/business operation**
    (section 1.2), regardless of the acting user's account state or membership
    role. The only work permitted on a `PENDING_REVIEW` company is the narrow
    onboarding-field allowlist of section 1.10.
- **The two approvals are distinct and independent decisions.** Account
  approval lets a natural person sign in; company approval lets an approved
  person operate a specific company. An `ACTIVE` user with a `PENDING_REVIEW`
  company may complete onboarding data entry for that company (section 1.10) but
  may perform no trade/business operation until an admin activates the company
  **and** the owner membership is `ACTIVE`.
- **Company `ACTIVE` never overrides a blocked `users.status`.** A user who is
  `LOCKED`, `SUSPENDED`, `DISABLED` or `REJECTED` cannot authenticate at all, so
  they reach no company-scoped route even if their company and membership are
  both `ACTIVE`. Login eligibility is decided solely by `users.status`.
- Company `SUSPENDED`/`REACTIVATED` and `REJECTED` transitions are admin actions
  and are audited (section 5.5).

### 1.9 Registration, onboarding and cutover deployment order

The full lifecycle, and the single compatible release that must ship it:

1. **Public registration** creates a `users` row in `PENDING_APPROVAL` **and**,
   atomically in the same transaction, one **`company_applications`** claim row
   (section 1.9.1) holding the intended `company_type`, claimed legal/trading
   name, primary contact and country. No `companies` row, no `company_members`
   row and no typed extension are created yet. If either insert fails the whole
   registration rolls back — there is never a pending user without its claim, or
   a claim without its user.
2. **Admin account approval** flips `users.status` to `ACTIVE` (Phase 1
   `APPROVE`). The user can now authenticate. No company exists yet; the claim
   is still unconsumed.
3. **First authenticated onboarding** — the approved user consumes their
   `company_applications` claim in **one atomic transaction** that: marks the
   claim `CONSUMED`, creates the canonical `companies` row
   (`status = PENDING_REVIEW`), creates the matching typed extension
   (`business_clients` or `vendors`, section 3), and creates the owner
   `company_members` row (`role = OWNER`, `status = PENDING_COMPANY_REVIEW`).
   The deferred owner-cardinality triggers (1.7) tolerate this pending state.
   While the company is `PENDING_REVIEW` the owner may edit the onboarding-field
   allowlist only (section 1.10).
4. **Admin company review** activates **both** the company
   (`status = ACTIVE`) and the owner membership (`status = ACTIVE`) in one
   transaction, or rejects the company (`companies.status = REJECTED`, owner
   membership `REVOKED`). Only after activation can the owner perform
   trade/business operations, and only if their `users.status` remains `ACTIVE`.

**Single compatible release.** The following ship together, because a partial
rollout would leave the API describing a data model that no longer exists:

- `GET /auth/me` (and any `/me` identity payload) returns `users.status`, the
  user's memberships (each with `company_id`, `company_type`, `role`, member
  `status`, and company `status`), any unconsumed `company_applications` claim,
  and no longer implies a single company.
- Response schemas and ORM relations move from `user_id`-keyed profiles to
  `company_id`-keyed extensions.
- Company **search and admin views** read from `companies`/`company_members`,
  filter on company `status`, and surface pending-review companies to admins.
- The global owner/member roles are removed from the catalogue (section 1.4) in
  this same release, so no client can be issued a stale company-shaped global
  role after cutover.

**Backfill of existing Phase 1 rows** is governed by the explicit, tested
mapping in section 8.1a. It **does not change account authorization**: every
existing user's `users.status` is preserved exactly, and company/membership
state is derived from `users.status` and `approved_at`. Unapproved
(`PENDING_APPROVAL` / `REJECTED`) profiles must **not** become active companies
or members.

#### 1.9.1 The `company_applications` claim table

New public registrations record their company claim in a first-class table so
the pending user and their intended company are captured atomically and
auditably before any company row exists.

- **Model `company_applications` (contract fields):** `id`; `user_id`
  (FK to the pending `users` row, **unique** — one open claim per user);
  `company_type` (`BUYER` | `VENDOR`, immutable, must match `users.user_type`);
  claimed `legal_name`, optional `trading_name`; `primary_contact_name`,
  `primary_contact_phone`; `country` (validated, section 4); `status`
  (`PENDING` → `CONSUMED` | `WITHDRAWN` | `REJECTED`); `created_at` (UTC),
  `updated_at` (UTC), `consumed_at` (nullable UTC, set only on the
  `PENDING → CONSUMED` transition), and **`terminal_at`** (nullable UTC, set
  exactly once when `status` enters a non-consumed terminal state —
  `WITHDRAWN` or `REJECTED`). `terminal_at` and `consumed_at` are what define the
  section 5.3 purge anchor `COALESCE(terminal_at, consumed_at)`: a
  withdrawn/rejected claim anchors on `terminal_at`, a consumed claim on
  `consumed_at`. **A still-`PENDING` claim has neither, so it has no retention
  anchor and is permanently ineligible for purge (never falls back to
  `created_at`)** — see the pending-application invariant below and section 5.3.
- **Constraints:** `UNIQUE (user_id)` where `status = 'PENDING'` (a user has at
  most one open claim); `company_type` fixed by a `CHECK` and re-verified
  against `users.user_type` at service level; required `legal_name`,
  `primary_contact_name`, `country`. **Terminal-timestamp invariant:**
  `consumed_at` is non-null iff `status = 'CONSUMED'`; `terminal_at` is non-null
  iff `status ∈ {WITHDRAWN, REJECTED}`; a `PENDING` claim has both null.
  **Pending-application invariant.** Because a `PENDING` claim has neither
  `terminal_at` nor `consumed_at`, its purge anchor `COALESCE(terminal_at,
  consumed_at)` is **NULL by construction**, and a NULL anchor is **ineligible
  for purge** (section 5.3): a pending registration claim can never be aged out
  by the retention job, so the atomic-registration invariant of section 1.9
  cannot be broken by purge. Retention begins only when the claim leaves
  `PENDING` — at `consumed_at` for `CONSUMED`, or `terminal_at` for
  `WITHDRAWN`/`REJECTED`. There is **no `created_at` fallback**. `QA-SECURITY`
  asserts that the `WITHDRAWN` and `REJECTED` transitions each set `terminal_at`,
  that the anchor is non-null for `CONSUMED`/`WITHDRAWN`/`REJECTED`, and that a
  `PENDING` claim has a **NULL** anchor and is **never purged at any age**.
- **Stale pending claims are cleaned up by state transition, never by time.**
  Any cleanup of an abandoned pending claim must first perform an **explicit,
  audited state transition** (to `WITHDRAWN` or `REJECTED`, setting `terminal_at`
  and writing the corresponding governance audit action), coordinated with the
  owning account's lifecycle. Only after that audited transition does the
  now-terminal claim acquire a retention anchor and become subject to the
  ordinary governance window. There is **no silent time-based deletion** of a
  claim that is still `PENDING`.
- **Atomic creation with the pending user (step 1).** Registration inserts the
  `users` row (`PENDING_APPROVAL`) and the `company_applications` row
  (`PENDING`) in one transaction; failure of either rolls the whole
  registration back.
- **Atomic consumption (step 3).** Onboarding consumes exactly one `PENDING`
  claim into `companies` + typed extension + `PENDING_COMPANY_REVIEW` OWNER
  membership in one transaction, flipping the claim to `CONSUMED`. A claim that
  is already `CONSUMED`/`WITHDRAWN`/`REJECTED`, or belongs to another user, is
  rejected; concurrent consumption is serialised `FOR UPDATE` so a claim can be
  consumed at most once.
- **Retention.** `company_applications` rows are **account/company governance**
  records (section 5.5): retained under `ACCOUNT_COMPANY_GOVERNANCE` (default 3
  years), subject to legal hold, anonymised (not hard-deleted) when the subject
  is deleted.
- **API schemas.** Registration request/response schemas include the claim
  fields; `GET /auth/me` surfaces any unconsumed claim; onboarding consumes it.
  Admin views may read pending claims alongside pending accounts.
- **Rollback.** Migration `0003` creates the table on upgrade. On downgrade the
  table can only be dropped once it is **empty**: `company_applications` is a
  Phase-2-only, non-reconstructable relation that the pre-0003 schema cannot
  represent, so dropping a populated table would silently destroy governance
  records. Dropping a retained `company_applications` row is therefore **not
  safe** and is **not** treated as such. The downgrade preflight (section 8.3)
  **refuses — raising before any destructive step — if any `company_applications`
  row exists**, in any status and including rows under legal hold. `QA-SECURITY`
  seeds a `company_applications` row and asserts downgrade refuses before
  performing any destructive work.

### 1.10 Narrow pending-company onboarding authorization path

Between company creation (step 3) and company activation (step 4) the owner must
be able to complete onboarding data, but nothing else. This path is defined
narrowly so it cannot become a back door into trade/business operations.

- **Who.** Only the **named pending OWNER** of the company — the single
  `company_members` row with `role = OWNER` and
  `status = PENDING_COMPANY_REVIEW` — **and only while `users.status = ACTIVE`**.
  No other member, role or status is authorised on this path; a `LOCKED`,
  `SUSPENDED`, `REJECTED` or `DISABLED` owner cannot authenticate at all.
- **When.** Only while `companies.status = PENDING_REVIEW` **and** the owner
  membership `status = PENDING_COMPANY_REVIEW`. Once either becomes `ACTIVE` the
  ordinary rules of section 1.2 apply; once the company is `REJECTED` the path is
  closed.
- **What.** A fixed **allowlist of company profile / contact / address /
  facility onboarding fields** only:
  - `companies`: `legal_name`, `trading_name`, `registration_number`,
    `tax_id`, `country`, `website`, primary-contact fields.
  - typed extension: buyer delivery/billing details and buying categories, or
    vendor `supply_categories`, facilities, warehouses and sourcing locations.
  - the billing address and the single contact required before company approval
    (section 3), plus the vendor's one required facility.
  Any field outside this allowlist is rejected. **All trade/business routes
  remain blocked** (enquiries, quotations, orders, documents, member
  management, ownership transfer, deletion) until both the company and the owner
  membership are `ACTIVE`.
- **Endpoints.**
  - `GET  /api/v1/companies/{company_id}/onboarding` — returns the current
    allowlisted onboarding fields for the pending company.
  - `PATCH /api/v1/companies/{company_id}/onboarding` — updates allowlisted
    onboarding fields only; unknown/forbidden fields → `422`.
- **Service predicates.** A single `can_onboard(user, company_id)` predicate
  requires, read fresh from the database: `users.status = ACTIVE`; a
  `company_members` row for `(user_id, company_id)` with `role = OWNER` and
  `status = PENDING_COMPANY_REVIEW`; `companies.status = PENDING_REVIEW`; and
  `user_type = company_type`. The `PATCH` handler additionally validates every
  submitted field against the onboarding allowlist.
- **404 isolation.** The onboarding endpoints obey section 1.6: the query
  filters by `company_id`, and any failure — company not found, caller not the
  pending owner, company not `PENDING_REVIEW`, membership not
  `PENDING_COMPANY_REVIEW` — returns **404**, never 403, so pending-company
  existence never leaks across tenants.
- **Tests required (`QA-SECURITY`).** Named pending owner (`users.status =
  ACTIVE`) can `GET`/`PATCH` allowlisted fields on their own `PENDING_REVIEW`
  company; a non-allowlisted field is `422`; a trade/business route on the same
  pending company is denied; another user (member or stranger) gets `404`; an
  owner whose `users.status` is not `ACTIVE` is denied; once company/membership
  are `ACTIVE` the onboarding path yields to ordinary rules; a `REJECTED`
  company closes the path.

### 1.11 Tenant-isolation release matrix

`QA-SECURITY` must cover, at minimum, the following. Denials use the 404 rule of
section 1.6 unless a 422/403 is specified.

| Case | Expected |
| --- | --- |
| Company-scoped request with **missing `company_id`** | `422` (`company_id` required) |
| Own **`ACTIVE`** tenant, `ACTIVE` membership | Success |
| Other user's tenant (caller not a member) | `404` |
| Caller membership `INVITED` | `404` (no access before acceptance) |
| Caller membership `REVOKED` | `404` |
| Caller membership `PENDING_COMPANY_REVIEW` on a trade/business route | `404` (onboarding path only, section 1.10) |
| Caller membership otherwise inactive (`EXPIRED`) | `404` |
| Company `PENDING_REVIEW` (trade/business route) | `404` (onboarding path only) |
| Company `SUSPENDED` | `404` |
| Company `REJECTED` | `404` |
| **Forged JWT** carrying `BUYER_OWNER`/`VENDOR_OWNER` for a non-member company | Ignored; request denied `404` (company authority read from `company_members`, section 1.3) |
| **Multi-company switching** — user in two companies, each `company_id` scoped independently | Each request resolved against its own membership; no leakage |
| **User/company type mismatch** attempted at the DB layer (direct insert) | Rejected by composite FK + `CHECK` (section 1.1) |
| **User/company type mismatch** attempted at the service layer | Rejected `company_type_mismatch` |
| **Ordinary (non-admin) user** on an `/api/v1/admin/companies` route | Denied (admin routes require a platform admin role; Phase 1 admin 403 rule applies) |

## 2. Invitation and acceptance — without email verification

Phase 2 has no email delivery, so acceptance cannot depend on a mailed link.
The flow is built to be safe without one. **Email invitation and email-driven
onboarding remain out of scope for Phase 2.**

- **Default role for a new invitee is `VIEWER`.** Promotion to `MEMBER` or above
  is an explicit, separately audited action (`company.members.set_role`) —
  never part of the invite.
- Lifecycle: `INVITED` → `ACTIVE` (accepted) | `REVOKED` (withdrawn) |
  `EXPIRED` (lapsed). **Invitations never use `PENDING_COMPANY_REVIEW`** — that
  status is reserved exclusively for the onboarding OWNER of a pending company
  (sections 1.9, 1.10) and cannot be reached through the invitation flow.
- **An `INVITED` member has no company access whatsoever.** They cannot read the
  company profile or appear in any company-scoped query. Section 1.2's check
  denies any status that is not `ACTIVE` (for trade/business routes).
- **An invitation may target only an already-registered, admin-approved
  (`users.status = ACTIVE`) user of the matching account type,** identified by
  the exact email or username of that existing user. Phase 2 does not invite
  strangers: **a new colleague must first register and be approved** before they
  can be invited. Onboarding a wholly new person by email is out of scope.
- Acceptance is performed **by the invited user, authenticated as themselves**,
  via `POST /api/v1/me/invitations/{invitation_id}/accept`. Because the invitee
  must already hold an approved account and be signed in, authentication is the
  proof of identity that an email round-trip would otherwise supply.
- Invitations expire after **14 days** (configurable). An expired or revoked
  invitation cannot be accepted.
- One outstanding invitation per `(company_id, user_id)`; a duplicate is `409`.
- Invite, accept, revoke, role change write audit records (section 5.5).

### 2.1 Invitation QA matrix

`QA-SECURITY` must cover, at minimum:

| Case | Expected |
| --- | --- |
| Invite with no role specified | Created as `VIEWER` (default) |
| Invited-but-not-accepted member reads company data | 404 (no access before acceptance) |
| Invite an existing `ACTIVE` matching-type account by exact email/username | Accepted; single `INVITED` row |
| Invite an unknown email/username | Rejected (`invitation_target_not_found`); no row |
| Invite a `PENDING_APPROVAL` account | Rejected — target must be admin-approved first |
| Invite an account of the **wrong type** | Rejected (`company_type_mismatch`) |
| Invite where invitee already a member of another company | Allowed for that other company; scoped independently |
| Attempt to create an invitation in `PENDING_COMPANY_REVIEW` status | Rejected — status reserved for onboarding owner only |
| Accept a `REVOKED` invitation | Rejected (`invitation_not_found`/revoked) |
| Accept an `EXPIRED` invitation | Rejected (`invitation_expired`) |
| Second outstanding invite for same `(company_id, user_id)` | `409` (`duplicate_invitation`) |
| Accept an invitation belonging to a different user | 404 |
| Every invite/accept/revoke/role-change | Writes the corresponding audit action (5.5) |
| Non-OWNER attempts to promote a member | Refused — only OWNER may `set_role` |
| `ADMIN_MEMBER` invites, then tries to accept-and-self-promote to OWNER | Refused — invitation defaults to VIEWER and cannot self-escalate; promotion is OWNER-only and separately audited |

## 3. Buyer and Vendor profile differences

Shared on `companies`: legal name, trading name, registration/licence number,
tax id, country, website, primary contact, status, timestamps, and
`company_type` (`BUYER` | `VENDOR`, immutable).

| Concern | Buyer (`business_clients`) | Vendor (`vendors`) |
| --- | --- | --- |
| Purpose | Receives goods | Supplies goods |
| Distinct fields | Delivery addresses, preferred incoterms, buying categories, annual volume band | `supply_categories` (exists), facilities, warehouses, sourcing locations, certifications, capacity |
| Address roles | `BILLING`, `DELIVERY` | `BILLING`, `PICKUP`, `WAREHOUSE` |
| Required before company approval | Billing address + one contact | Billing address + one contact + **one facility** |

- **Typed-extension enforcement.** `company_type` fixes which profile extension
  may exist. An ordinary `CHECK` on an extension row cannot read the parent
  company's type, so enforcement uses the **composite foreign key** of 1.1:
  each extension carries its own `company_type` column and declares
  `FOREIGN KEY (company_id, company_type) REFERENCES companies(id, company_type)`,
  with `business_clients.company_type` fixed to `BUYER` and
  `vendors.company_type` fixed to `VENDOR` by a single-row `CHECK`. The
  composite FK makes it structurally impossible to attach a `vendors` extension
  to a `BUYER` company, or vice versa. Where a rule genuinely needs to inspect
  or mutate the parent (e.g. rejecting a *second* extension of the correct
  type), a trigger — not a `CHECK` — is the permitted mechanism, and the
  contract states so explicitly rather than pretending a `CHECK` can see the
  parent row.
- After the migration, `business_clients` and `vendors` are keyed by
  `company_id` and their Phase 1 `user_id` column is dropped (section 8). The
  `company_applications` claim (section 1.9.1), not these extensions, is what a
  new registration writes first.
- `vendor_facilities` and `vendor_sourcing_locations` are **child rows of the
  company**, never of a user, so they survive membership changes.

## 4. Supported preference values

Validated against the Phase 1 settings allowlists — **reject unknown values,
never silently fall back**.

- **Language:** `LEO_SUPPORTED_LANGUAGES` (`en, ar, fr, es, zh`). BCP-47.
- **Currency:** `LEO_SUPPORTED_CURRENCIES` (`AED, USD, EUR, GBP, INR, CNY`).
  ISO 4217. Display only in Phase 2 — not a pricing currency until Phase 3
  defines that.
- **Timezone:** IANA name validated against the runtime `zoneinfo` database.
  Default `LEO_DEFAULT_TIMEZONE` (`UTC`). Reject fixed offsets such as `GMT+4`.
- **Notification preferences:** a matrix of `(topic, channel, enabled)`, not a
  flat boolean set, so it extends without migration.
  - Channels: `EMAIL`, `IN_APP`, `WHATSAPP` (records preference only; no
    delivery is implemented in Phase 2).
  - Topics: `ACCOUNT_SECURITY`, `COMPANY_REVIEW`, `ENQUIRY`, `QUOTATION`,
    `ORDER`, `DOCUMENT`, `SHIPMENT`, `MARKETING`.
  - **`ACCOUNT_SECURITY` on `EMAIL` cannot be disabled.** Lockouts, password
    changes and deletion decisions must always reach the account holder.
  - `MARKETING` defaults **off** (opt-in); all others default on.

## 5. Sessions, devices and retention

### 5.1 Session listing

- The session list is **derived from `refresh_tokens`**, which already carries
  the needed metadata. Do not create a parallel session table.
- **Model `user_devices` (contract fields):** `id`; `user_id` (FK to the owning
  `users` row); a **stable, opaque `device_id`** (a server-generated handle —
  **no raw device fingerprint is ever stored**, only this opaque identifier plus
  the user-supplied label below); a user-supplied `label`; and two UTC
  timestamps, **`created_at`** (first seen) and **`last_seen_at`** (most recent
  activity, updated as the device is reused). These two timestamps are the device
  side of the deterministic purge anchor in section 5.3.
- **Link to refresh-token families.** `user_devices` relates to the
  `refresh_tokens` families raised on that device: migration `0003` adds a
  nullable `refresh_tokens.device_id` FK referencing `user_devices(id)`
  **`ON DELETE SET NULL`**, so each refresh-token family carries the `device_id`
  it was issued on and a device resolves to its **set of linked families**. This
  relation — not any stored fingerprint — is what the section 5.3 `user_devices`
  anchor walks to decide eligibility (a device is ineligible while any linked
  family is active/unexpired) and to compute the family term
  `MAX(COALESCE(family.revoked_at, family.expires_at))`. No raw fingerprint is
  stored to establish this link.
  - **`ON DELETE SET NULL` is a safety fallback, not the intended purge order.**
    The purge job (section 5.3) always deletes **eligible refresh-token families
    before** an eligible device, and a device is purged **only once no
    retained/held token row still references it** — so in normal operation the
    FK is already clear when the device row is deleted. The `ON DELETE SET NULL`
    action exists only so that an out-of-band or manually-ordered device deletion
    cannot orphan a still-present token row or raise an FK violation; it nulls the
    back-reference rather than cascading a delete into token telemetry.
- Exposed per session: device label, browser/OS parsed from `user_agent`,
  **truncated** IP, city-level location if available, `issued_at`,
  `last_seen_at`, and a `current` flag. (Truncation is a *display* control here;
  it is **not** the anonymization mechanism — see 6.2.)
- **Never exposed:** `token_hash`, `family_id`, full `user_agent`, full IP.
- A user may revoke **only their own** sessions (`session_not_owned` otherwise).
  Revocation is immediate: revoke the whole token family and bump
  `auth_version`, reusing the Phase 1 mechanism. Revoking the current session
  behaves as logout.

### 5.2 Retention periods — category-specific, configurable defaults

Neither UAE PDPL nor GDPR mandates specific figures; both require that
identifiable data be kept only as long as necessary for a documented purpose
(UAE PDPL Article 5; GDPR Articles 5 and 13). **Blanket seven-year retention is
wrong** — it over-retains security telemetry and under-justifies the parts that
genuinely need long retention. Retention is therefore **category-specific**.
Every value below is a configurable setting with a documented purpose and
jurisdiction basis. **These defaults are engineering defaults for a documented
purpose, not legal advice; each deployment must confirm its own obligations.**

The three retention categories are named and stored (section 5.5):

| Category | Default | Setting | Applies to |
| --- | --- | --- | --- |
| `SECURITY_TELEMETRY` | **180 days** | `LEO_RETENTION_SECURITY_TELEMETRY_DAYS` | `refresh_tokens`, `login_attempts`, and every `admin_audit_logs` row whose action is login/logout/token/password security telemetry (5.5) |
| `ACCOUNT_COMPANY_GOVERNANCE` | **3 years** | `LEO_RETENTION_GOVERNANCE_DAYS` | `account_status_history`; `company_applications`; every `admin_audit_logs` row for registration, approval/rejection, lock/unlock, suspend/reactivate/disable, invitation/membership/ownership/company/deletion/legal-hold/purge governance (5.5) |
| `TAX_TRADE` | **7 years** | `LEO_RETENTION_TAX_TRADE_DAYS` | **only** explicitly future tax/trade-evidence records and the `admin_audit_logs` rows that support tax obligations (5.5). No current auth or company-governance action falls here. |
| Consent | **Life of account + 3 years** | `LEO_RETENTION_CONSENT_DAYS` | `privacy_consents` and consent-change history (proof-of-consent is itself the legal record) |

- **UAE VAT note:** where UAE VAT obligations apply, VAT records may carry a
  **five-year minimum** retention (longer for real-estate capital assets).
  Deployments subject to VAT must set `LEO_RETENTION_TAX_TRADE_DAYS` no lower
  than their applicable statutory minimum. This is a configuration duty, not a
  hard-coded figure, and not legal advice.
- Seven years applies **only** to `TAX_TRADE`. Audit rows that are
  authentication/security telemetry follow the `SECURITY_TELEMETRY` window;
  governance rows follow `ACCOUNT_COMPANY_GOVERNANCE`. The purge job classifies
  each `admin_audit_logs` row by its **stored** `retention_category` (5.5), so
  no current auth or company-governance action can silently receive seven years.

### 5.3 Automated purge, and the UTC anchor for every retained dataset

A retention policy that is never executed is not a policy.

- A scheduled purge job runs **daily**, deleting rows past their retention
  window for each dataset below, **except rows under an active legal hold
  (section 5.6), which are never purged.**
- It is **idempotent, batched** (bounded rows per run so it cannot lock the
  table), and **logs a summary count per category** so execution is provable.
  Summaries contain **no secrets and no identifiers** — counts and category
  names only.
- It is invocable on demand as `python -m app.scripts.purge_expired` for tests
  and operations, with a `--dry-run` flag reporting counts without deleting.
- The job's own runs are audited (`purge.run`, section 5.5). A failed run alerts
  rather than failing silently — a silently dead purge job is indistinguishable
  from a working one until an audit asks.
- **Settings validation.** Before purging, every retention setting is validated
  as a **positive, bounded** integer number of days; a non-positive, missing or
  unparseable setting aborts the run rather than deleting with an implied
  window.

**UTC anchor, strict boundary — for every retained dataset.** All comparisons
use **UTC**. Each run fixes `purge_started_at` (UTC) once, and for each dataset
computes `cutoff = purge_started_at − configured_retention`. A row is **eligible
for deletion only when its anchor timestamp is strictly older than the cutoff**
(`anchor < cutoff`). **Equality is retained** — a row whose anchor exactly
equals the cutoff survives this run and becomes eligible on a later run. This
makes the boundary deterministic and the job re-runnable without off-by-one
deletion at the edge. The anchor per dataset:

| Dataset | Anchor timestamp | Retention setting |
| --- | --- | --- |
| `refresh_tokens` | `revoked_at` if non-null, else `expires_at` | `SECURITY_TELEMETRY` |
| `login_attempts` | `created_at` | `SECURITY_TELEMETRY` |
| `admin_audit_logs` (per category) | `created_at`, compared against the row's stored `retention_category` window (5.5) | that row's category |
| `account_status_history` | `created_at` | `ACCOUNT_COMPANY_GOVERNANCE` |
| sessions (`refresh_tokens`) | `revoked_at` if non-null, else `expires_at` of the family | `SECURITY_TELEMETRY` |
| `user_devices` | **Ineligible while any linked refresh-token family is active/unexpired** (see note below); once **every** linked family is terminal, anchor = `GREATEST(COALESCE(device.last_seen_at, device.created_at), MAX(COALESCE(family.revoked_at, family.expires_at)))` over the device's families | `SECURITY_TELEMETRY` |
| `company_applications` | `COALESCE(terminal_at, consumed_at)` (exactly, in that order). **A `PENDING` claim has a NULL anchor and is ineligible for purge — never falls back to `created_at`** (§1.9.1 pending-application invariant) | `ACCOUNT_COMPANY_GOVERNANCE` |
| `released` `legal_holds` | `released_at` (active holds — `released_at IS NULL` — are never eligible; see 5.6) | `ACCOUNT_COMPANY_GOVERNANCE` |
| `privacy_consents` | `withdrawn_at` if non-null, else the precise **terminal-account** timestamp (account deletion/anonymization). An **active consent with neither** a `withdrawn_at` nor a terminal-account timestamp is **not eligible** — it is the live legal basis. | `Consent` |

- **`user_devices` anchor, precise null handling.** A device is **not eligible**
  while **any** refresh-token family linked to it is active or unexpired (a
  family with `revoked_at IS NULL` and `expires_at` in the future), because it
  still represents a live session. Only once **every** linked family is terminal
  (each family has a non-null `revoked_at` **or** an `expires_at` at/behind
  `purge_started_at`) does the device acquire an anchor: the **later** of
  (a) `device.last_seen_at`, or `device.created_at` when `last_seen_at` is null,
  and (b) the **maximum** over its families of `COALESCE(family.revoked_at,
  family.expires_at)`. A device with no linked family at all uses
  `COALESCE(device.last_seen_at, device.created_at)`. Eligibility then applies
  the strict boundary above (`anchor < cutoff`; equality retained).
- **Device/token purge ordering, FK fallback, and transitive holds.** Within a
  run the purge job deletes **eligible refresh-token families first, then
  eligible devices**. A device is deleted **only after no retained or held
  refresh-token row references it** — i.e. every family that anchored the device
  ineligible has itself already been purged this run, and no remaining token row
  carries that `device_id`. The `refresh_tokens.device_id` FK is
  **`ON DELETE SET NULL`** as a safety fallback only (§5.1): correct ordering
  means the reference is already gone, but if a device were ever deleted while a
  token row still pointed at it, the reference is nulled rather than orphaned or
  cascaded. **A legal hold (5.6) on either side transitively protects both and
  preserves the relationship:** a hold covering a device, or covering any linked
  refresh-token family, makes **both** the device **and** its linked token
  families ineligible for purge, and the `device_id` linkage is left intact so
  the held relationship is fully reconstructable on review. A one-sided hold —
  on the device only, or on a single linked family only — therefore blocks
  deletion of the whole device/family pair, and the device is never purged out
  from under a held token (nor a token's device deleted while the token is held).
- **`company_applications` anchor, and the pending-application invariant.**
  Exactly `COALESCE(terminal_at, consumed_at)` — the terminal timestamp of a
  `WITHDRAWN`/`REJECTED` claim if set, else `consumed_at` for a `CONSUMED` claim.
  **A still-`PENDING` claim has neither, so its anchor is NULL, and a NULL anchor
  is ineligible for purge:** a pending registration claim is **never** aged out,
  and there is **no `created_at` fallback**. This is what guarantees the
  atomic-registration invariant of section 1.9 cannot be broken by purge — a
  pending user's claim survives until it is either consumed into a company or
  explicitly transitioned to a terminal state (§1.9.1). Any cleanup of an
  abandoned pending claim is an **explicit, audited state transition** (§1.9.1),
  never a silent time-based deletion.

### 5.4 Audit records have finite, category-based retention

Revision 1 said audit records are never purged; revision 2 applied a blanket
seven years. Both are wrong. Retention is by **stored category** (5.2, 5.5).

- `admin_audit_logs` rows in `SECURITY_TELEMETRY` follow the 180-day window.
- `admin_audit_logs` rows in `ACCOUNT_COMPANY_GOVERNANCE` follow the 3-year
  window; this includes every current registration, approval, lock/suspend/
  disable, invitation, membership, ownership, company, deletion, legal-hold and
  purge governance action.
- `admin_audit_logs` rows in `TAX_TRADE` follow the 7-year window — and only
  the explicitly future tax/trade-evidence actions map there.
- `account_status_history` follows `ACCOUNT_COMPANY_GOVERNANCE`.
- All windows are configurable and purged by the same job on its own schedule.
- Rows referencing an anonymized user retain the **deletion tombstone**
  (section 6.2), so the action history survives while the natural person does
  not remain identifiable.
- A **legal hold (5.6)** suspends purging for the affected records regardless of
  category; the hold and its reason are themselves audited.

### 5.5 Audit action enumeration and stored retention category (migration 0003)

Phase 1 constrains `admin_audit_logs.action` to a fixed `AuditAction`
enumeration/`CHECK`. The Phase 1 values are:

`REGISTER`, `APPROVE`, `REJECT`, `LOCK`, `UNLOCK`, `SUSPEND`, `REACTIVATE`,
`DISABLE`, `RESET_PASSWORD`, `LOGIN_SUCCESS`, `LOGIN_FAILURE`,
`PASSWORD_CHANGE`, `LOGOUT`, `LOGOUT_ALL`, `TOKEN_REUSE_DETECTED`.

Phase 2 **extends the schema, ORM `AuditAction` and `CHECK` in migration
`0003`** to add the new company/membership/deletion/legal-hold/purge actions:

- `company.members.invite`, `company.members.accept`, `company.members.revoke`
- `company.members.set_role`
- `company.ownership.transfer`
- `company.approve`, `company.reject`, `company.suspend`, `company.reactivate`
- `company.delete_request`, `company.delete_approve`, `company.delete_reject`
- `deletion.request`, `deletion.approve`, `deletion.reject`, `deletion.anonymize`
- `legal_hold.create`, `legal_hold.release`
- `purge.run`

Company-application transitions reuse the existing account/company governance
actions; account approval/rejection/etc. remain the Phase 1 actions above.

Migration `0003` also **adds a stored `admin_audit_logs.retention_category`
column** (enum `SECURITY_TELEMETRY` | `ACCOUNT_COMPANY_GOVERNANCE` |
`TAX_TRADE`), backfilled for existing rows from the exhaustive mapping below and
set at write time thereafter, so the purge job never re-derives the category by
guessing.

**Exhaustive action → retention-category mapping.** Every Phase 1 and Phase 2
action has a category. The purge/service/migration **fails closed**: any action
not present here raises at write time, in the purge classifier, and in the
migration backfill — no row may be written or migrated with an unmapped or null
category, and **no current auth or company-governance action may silently
receive `TAX_TRADE` (seven years).**

| Action | Category |
| --- | --- |
| `LOGIN_SUCCESS`, `LOGIN_FAILURE`, `LOGOUT`, `LOGOUT_ALL` | `SECURITY_TELEMETRY` |
| `TOKEN_REUSE_DETECTED` | `SECURITY_TELEMETRY` |
| `RESET_PASSWORD`, `PASSWORD_CHANGE` | `SECURITY_TELEMETRY` |
| `REGISTER` | `ACCOUNT_COMPANY_GOVERNANCE` |
| `APPROVE`, `REJECT` | `ACCOUNT_COMPANY_GOVERNANCE` |
| `LOCK`, `UNLOCK` | `ACCOUNT_COMPANY_GOVERNANCE` |
| `SUSPEND`, `REACTIVATE`, `DISABLE` | `ACCOUNT_COMPANY_GOVERNANCE` |
| `company.members.invite/accept/revoke/set_role` | `ACCOUNT_COMPANY_GOVERNANCE` |
| `company.ownership.transfer` | `ACCOUNT_COMPANY_GOVERNANCE` |
| `company.approve/reject/suspend/reactivate` | `ACCOUNT_COMPANY_GOVERNANCE` |
| `company.delete_request/delete_approve/delete_reject` | `ACCOUNT_COMPANY_GOVERNANCE` |
| `deletion.request/approve/reject/anonymize` | `ACCOUNT_COMPANY_GOVERNANCE` |
| `legal_hold.create/release` | `ACCOUNT_COMPANY_GOVERNANCE` |
| `purge.run` | `ACCOUNT_COMPANY_GOVERNANCE` |
| *(future tax/trade-evidence actions, defined in a later phase)* | `TAX_TRADE` |

`QA-SECURITY` asserts that each new action is both writable and rejected if
misspelled; that every enumerated action resolves to exactly one category; and
that an action with no mapping is rejected (fail-closed) in the schema/service
and in the purge classifier, and aborts the migration backfill.

### 5.6 Legal hold

A legal or regulatory hold **overrides every purge and anonymization path**. It
is a first-class, audited model.

- **Model `legal_holds`** (contract fields): `id`, **subject** (user or company
  reference), **category** and optional **record scope** (which categories/rows
  the hold freezes — e.g. a specific company's trade records, or all data for a
  subject), **basis/reason** (free text plus a structured basis code),
  **actor** (admin who placed it), **created_at**, **review_at** (mandatory next
  review), **expires_at** (mandatory review deadline), **released_at** and
  **release_actor**/**release_reason** (null while active).
- **Active means `released_at IS NULL`, full stop.** A hold is active while it
  has not been explicitly released, **regardless of `review_at` or
  `expires_at`.** `review_at` and `expires_at` are **mandatory review
  deadlines/reminders only — they never auto-release a hold.** A hold whose
  `review_at`/`expires_at` is in the past is **overdue**: it **continues to
  block** purge and anonymization and **raises an alert** so a human reviews it.
  Time never releases data.
- **Release requires a human.** Releasing a hold requires an actor, a reason and
  a timestamp (`released_at`, `release_actor`, `release_reason`) and writes
  `legal_hold.release`. Placing a hold writes `legal_hold.create`.
- **Active holds never purge; released holds have finite retention.** While a
  hold is active (`released_at IS NULL`) it **can never be purged** — it is a
  live governance control, exempt regardless of age or overdue review. Once a
  hold is **released**, the `legal_holds` row itself becomes an
  `ACCOUNT_COMPANY_GOVERNANCE` record (5.2) **anchored at `released_at`**, and
  the purge job deletes it at the **strict three-year boundary** (§5.3
  `anchor < cutoff`; equality retained) **unless another overlapping active hold
  covers it**, in which case it continues to be retained until no covering hold
  remains active. Releasing a hold never deletes the row immediately; retention
  runs from `released_at` like any other governance record.
- **Precedence and overlap.** While any hold **covering** a row is active, the
  purge job (5.3) and every anonymization step (6.2) **must skip that row** and
  record that it was skipped due to a hold. A hold takes precedence over
  retention expiry, over deletion-request anonymization, and over
  account-deletion cleanup. **Any overlapping active hold blocks** — if two
  holds cover a row, releasing one leaves the row blocked while the other
  remains active.
- **Scope matching.** A hold covers a row when the hold's subject and
  category/record scope match the row: subject-scope holds cover all of a
  subject's data; category-scope holds cover a subject's rows in that category;
  record-scope holds cover the named rows only. Purge/anonymization compute
  coverage from these fields, not from free-text reason.
- **Device/token transitive coverage.** A hold that covers **either** a
  `user_devices` row **or** any `refresh_tokens` family linked to it (via
  `refresh_tokens.device_id`, §5.1) transitively protects **both** sides: the
  device and all of its linked token families are treated as covered, and the
  `device_id` linkage is preserved so the held relationship stays reconstructable.
  A device is therefore never purged while a hold covers any of its linked
  families, and a held token family's device is never purged out from under it
  (§5.3 ordering).
- **Tests required:** `QA-SECURITY` asserts (a) a held row survives a purge run
  that would otherwise delete it; (b) an anonymization request over a held
  subject is blocked/deferred with the hold recorded; (c) create and release are
  both audited and release requires actor+reason; (d) after release, the row
  becomes purge/anonymization-eligible on the next run; (e) an **overdue**
  (past `review_at`/`expires_at`) but unreleased hold still blocks and alerts;
  (f) two overlapping holds — releasing one leaves the row blocked; (g)
  **scope isolation** — a category- or record-scoped hold blocks only its
  matching rows and unrelated rows still purge; and, for the `legal_holds` row's
  **own** retention: (h) an **active** hold (`released_at IS NULL`) is never
  purged, however old or overdue; (i) a **released** hold anchored at
  `released_at` is retained **before** the three-year boundary; (j) **equal** to
  the boundary is retained this run and eligible on a later run; (k) **after**
  the boundary (overdue) is purged; and (l) a released hold whose row is still
  **covered by another overlapping active hold** is retained past the boundary
  until no covering hold remains active; and, for the **device/token
transitivity** of §5.1/§5.3: (m) a one-sided hold on a device retains both the
device and its linked token families with the linkage intact; (n) a one-sided
hold on a single linked token family retains both that family and its device;
and (o) with no hold, eligible token families are deleted before the device and
a device is purged only after no token row references it (correct ordering, no FK
violation), while an out-of-band device delete leaves any still-present token row
via the `ON DELETE SET NULL` fallback rather than orphaning it.

### 5.7 Purge release matrix

`QA-SECURITY` must cover, at minimum, the purge job's boundary and operational
behaviour. Boundaries use the strict rule of section 5.3 (`anchor < cutoff`
eligible; equality retained).

| Case | Expected |
| --- | --- |
| Row anchor **before** the boundary (`anchor < cutoff`) — each dataset/category | Purged |
| Row anchor **equal** to the boundary (`anchor == cutoff`) — each dataset/category | Retained this run; eligible on a later run |
| Row anchor **after** the boundary (`anchor > cutoff`) — each dataset/category | Retained |
| Invalid setting (zero, negative, missing, unparseable) | Run aborts before deleting; nothing purged |
| Setting **above the configured maximum** (implausibly large day count exceeding the allowed bound) | Run aborts before deleting; nothing purged (settings validation is positive **and** bounded, §5.3) |
| `user_devices` with **any active/unexpired** linked refresh-token family | Ineligible — retained regardless of age (§5.3 anchor note) |
| `user_devices`, all families terminal — anchor **before / equal / after** the boundary | Purged / retained this run / retained (anchor = `GREATEST(COALESCE(last_seen_at, created_at), MAX(COALESCE(family.revoked_at, family.expires_at)))`) |
| `company_applications` **still `PENDING`** (anchor `COALESCE(terminal_at, consumed_at)` is NULL) — any age | **Ineligible — never purged**; a pending registration claim cannot be aged out (§1.9.1, §5.3) |
| `company_applications` **terminal** (`CONSUMED`/`WITHDRAWN`/`REJECTED`) — anchor `COALESCE(terminal_at, consumed_at)` **before / equal / after** the boundary | Purged / retained this run / retained |
| Stale abandoned `PENDING` claim | Not deleted by purge; cleaned up only by an explicit audited transition to `WITHDRAWN`/`REJECTED` (§1.9.1), after which the terminal anchor applies |
| **Released** `legal_holds` row — `released_at` **before / equal / after** the three-year boundary | Purged / retained this run / retained |
| **Active** `legal_holds` row (`released_at IS NULL`), any age | Never purged (live governance control, §5.6) |
| Released `legal_holds` row still **covered by another overlapping active hold** | Retained past its own boundary until no covering hold is active |
| `--dry-run` | Reports the same counts that a real run would delete; deletes nothing |
| Re-run / batch rerun on already-purged data | Idempotent; second run deletes nothing new; counts stable |
| Partial failure mid-batch, then resume | No double-delete; resumed run completes the remaining eligible rows |
| Concurrent inserts / token refreshes during a run | New rows dated after `purge_started_at` are never deleted by that run |
| `refresh_tokens` **family self-FKs** (parent/child within a family) | Deletion respects the self-referential FK ordering; no FK violation; whole eligible family removed cleanly |
| **Device + its eligible token families both purgeable** | Eligible refresh-token families deleted **first**, device deleted **after** no token row references it (§5.3 ordering); no FK violation |
| **Out-of-band device delete while a token row still references it** | `refresh_tokens.device_id` **`ON DELETE SET NULL`** clears the back-reference; token row retained, no orphan, no FK violation (safety fallback, §5.1) |
| **One-sided legal hold on the device only** | Both the device **and** its linked token families retained; `device_id` linkage preserved (transitive protection, §5.3/§5.6) |
| **One-sided legal hold on a single linked token family only** | That family retained **and** its device retained (device not purged out from under a held token); linkage preserved |
| Interaction with **account deletion / anonymization** | Anonymization deletes subject-linked telemetry outright (6.2); purge does not resurrect or conflict; consent uses the terminal-account anchor |
| **Category-scoped** legal hold covering some rows | Held-category rows retained; other categories for the subject still purge |
| **Record-scoped** legal hold | Only named rows retained; siblings purge |
| **Overlapping** active holds | Row retained while any covering hold is active |
| **Overdue** hold (past `review_at`/`expires_at`, unreleased) | Still blocks purge; alert raised |
| **Released** hold | Covered rows become eligible on the next run |
| Unrelated rows during any hold | Continue to purge normally |
| Summary output | Counts and category names only — **no identifiers, no secrets** |
| **Backup/restore then overdue purge** | After restoring a backup whose rows are now well past retention, the next purge run deletes the now-overdue rows correctly (no stale-cutoff assumption) |

## 6. Deletion requests and anonymization

States: `REQUESTED` → `UNDER_REVIEW` → `APPROVED` | `REJECTED`;
`APPROVED` → `RETENTION_HOLD` → `ANONYMIZED`; plus `CANCELLED` by the requester
before a decision.

- One active request per subject; a duplicate is `409`
  (`duplicate_deletion_request`).
- Only a company `OWNER` may request company deletion; any user may request
  deletion of their own personal account.
- Every transition requires an administrator reason and writes an audit record
  (`deletion.*`, section 5.5), matching the Phase 1 admin-action pattern.

### 6.1 Anonymize, never delete (subject to legal hold)

Trade records, governance audit history and status history are retained for
their documented periods (5.2). Deletion anonymizes the natural person and
severs the link; it does not erase transactional truth. **An active legal hold
(5.6) blocks anonymization until released.**

### 6.2 Deterministic, provably irreversible anonymization inventory

Anonymization must be **provably irreversible**: after it runs, there must be no
retained artefact from which the natural person can be reconstructed, and the
proof must not rely on scanning free text. All database steps run in **one
transaction**. The inventory below is exhaustive by design; a partial scrub is
the failure mode to design against.

**Deleted outright (subject-linked):**

| Data | On anonymization |
| --- | --- |
| `refresh_tokens` | **Deleted outright**; all sessions revoked; `auth_version` bumped |
| sessions / `user_devices` | **Deleted outright**, including labels — a device label can name a person |
| password history | **Deleted outright** for the subject |
| `login_attempts` | **Deleted outright** for the subject — including `ip_address` and `user_agent`; nothing is truncated-and-kept |

**Retained only by category/hold, with identifiers neutralised:**

| Data | On anonymization |
| --- | --- |
| `admin_audit_logs`, `account_status_history` | **Retained only per stored `retention_category` (5.5) or active legal hold (5.6).** `ip_address` and request/correlation IDs are **nulled** where they refer to the subject; the **UUID** columns `actor_id`, `target_user_id`, `user_id` are **left pointing at the subject's retained, tombstoned `users` row** (see "UUID references" below) — they are **not** overwritten with a string, because they are UUID/FK columns; free-text `reason`/`notes` are replaced by **structured reason codes** and any non-required free-text is **nulled**; structured context is **rebuilt from an explicit key allowlist** with all personal keys removed. **Heuristic free-text scanning is not the primary control** — the guarantee comes from structured fields, deterministic replacement and the allowlist rebuild, not from a scrubber guessing at prose. |
| `users` string identity — `username`, `normalized_username`, `email`, `normalized_email` | **Deterministic replacement** of each with a **unique, non-identifying string tombstone**; uniqueness preserved so `UNIQUE`/normalized constraints still hold. No original value retained anywhere. The `users` **row itself is retained** and its **primary-key UUID is unchanged** — that opaque UUID is the tombstone key (see below). `users` carries **no** `phone`/`contact_name` column, so none is scrubbed here (see the Phase-2 locations of `contact_name`/`phone` in the exhaustive list below). |
| `users.password_hash` | Overwritten; account permanently `DISABLED` |
| `company_applications` | Personal claim fields (`primary_contact_name`, `primary_contact_phone`, claimed names) **nulled/tombstoned**; retained only per category/hold |
| `privacy_consents` | **Retained** (proof of consent is the legal record); its `user_id` UUID keeps pointing at the tombstoned `users` row (deterministic, not free-text scanning) |
| `user_profiles`, `user_preferences`, `notification_preferences` | Deleted |
| Company rows, orders, quotations, documents | **Retained** — a company outlives its members |
| Aggregate/security statistics | **Retained only where they cannot be linked back to a person** (counts, rates, non-identifying totals) |

**UUID references vs. string identity — the tombstone key.** The natural person
is anonymized by (a) replacing every **string identity field** on `users`
(`username`, `normalized_username`, `email`, `normalized_email`) with a unique
non-identifying string tombstone, and (b) **retaining the `users` row and its
original opaque primary-key UUID unchanged**. That surviving UUID *is* the
deletion tombstone key. A string like `deleted-user-<uuid>` **cannot** be stored
in UUID/FK columns (`actor_id`, `target_user_id`, `user_id`, `invited_by`,
etc.), so those columns are **never rewritten to a string**. Governance UUID
references that must survive (audit `actor_id`/`target_user_id`,
`account_status_history.user_id`, `privacy_consents.user_id`) **keep pointing at
the tombstoned `users` row**, which now carries no natural identifiers. This is
**FK-safe**: no foreign key is orphaned, because the referenced `users` row
still exists; the person is unreconstructable because every string identifier on
that row is a tombstone. **Nullable** UUID/reference fields that refer to the
subject and are **not required** for governance (`invited_by`, request/
correlation IDs, `ip_address`) are **nulled** instead of retained.
`QA-SECURITY` asserts the FK-safe behaviour: after anonymization every retained
governance row still resolves its `actor_id`/`user_id`/`target_user_id` FK to
the surviving tombstoned `users` row (no orphan, no constraint violation), and
that row exposes no original identifier.

### 6.2.1 Exhaustive subject-linked record inventory

Every relation that can hold the subject's identity has a defined disposition —
**delete**, **retain-via-opaque-tombstone** (UUID kept pointing at the retained
tombstoned `users` row), **null**, or **redact**. **A covering active legal hold
(5.6) takes precedence over every disposition below**: the step is skipped and
the hold recorded, and anonymization is deferred until release.

| Subject-linked record | Fields | Disposition |
| --- | --- | --- |
| `company_members` | `user_id`, `invited_by` | **Retain-via-opaque-tombstone** — UUIDs keep pointing at the tombstoned `users` row(s); no string rewrite; row survives so company history is intact |
| Invitation metadata (if separate) | `user_id`, `invited_by`, target email/username | UUIDs **retain-via-opaque-tombstone**; any stored **email/username** identity string **nulled/redacted** |
| `account_deletion_requests` | requester/actor UUIDs, free-text reason | UUIDs **retain-via-opaque-tombstone**; free-text reason → **structured reason code**, non-required notes **nulled** |
| Company deletion-request actor fields | actor/approver UUIDs, notes | UUIDs **retain-via-opaque-tombstone**; free-text notes **nulled** |
| `legal_holds` (active **or** released) | subject/actor/release-actor UUIDs, basis/reason | **Active holds block anonymization entirely** (5.6) and are not modified; on a released hold with no covering active hold, subject/actor UUIDs **retain-via-opaque-tombstone**, free-text basis/reason → **structured basis code**, non-required notes **nulled** |
| Company contacts / addresses / facilities | natural-person name, personal email, personal phone, home address | **Null/redact** the natural-person fields (name, personal email, personal phone, home/residential address); **corporate-only** data (company legal name, corporate address, corporate phone, facility location) **remains** |
| `company_applications` | `primary_contact_name`, `primary_contact_phone`, claimed names | **Null/tombstone** personal claim fields (also in the table above); retained only per category/hold |
| Unknown-user `login_attempts` (`user_id IS NULL`) whose **normalized identifier equals** the subject's **old** `normalized_email`/`normalized_username` | the normalized identifier row | **Delete** these rows **before** the `users` string identity fields are replaced, **in the same transaction** — otherwise the old normalized value is lost and they can no longer be matched |
| `admin_audit_logs` / `account_status_history` | `ip_address`, request/correlation IDs, structured context, `reason`/`notes` | **Null** IP and request/correlation IDs referring to the subject; rebuild structured context from the **key allowlist**; use **structured reason codes** and **null** non-required free-text notes — **no heuristic scrub as the primary control** (UUIDs handled per the tombstone rule above) |
| Application logs | any subject identifiers | **Prohibited at source** (structured, identifiers excluded); short retention; **included in deletion verification** (below) |
| Tracked stored/exported files | files containing personal fields | **Delete or redact** deterministically per the data inventory (below); legal/tax hold defers and records |

`contact_name` and `phone` do **not** live on `users`. Their real Phase-2
locations are the typed profile extensions / company contact structures
(`business_clients`/`vendors` contact fields), `company_applications`
(`primary_contact_name`, `primary_contact_phone`), and company
contacts/addresses/facilities — each with its disposition above. `QA-SECURITY`
asserts, for every row above, the **exact expected value** after anonymization
(deleted / tombstoned UUID still resolving / nulled / redacted) and runs the
**reasonable-relinking** search (name+phone, email prefix+domain, old normalized
identifier) proving no combination reconstructs the subject; it also asserts an
active covering legal hold blocks each disposition and defers it.

**Application logs.** Application logs **must, by design, prohibit raw
identifiers, IP addresses and user agents** — they are written structured with
those fields excluded at source, not scrubbed afterwards. They carry a **short
configured retention** (`LEO_RETENTION_APP_LOG_DAYS`, `SECURITY_TELEMETRY`-class)
and are **included in deletion verification** so a subject cannot survive in a
log stream.

**Stored/exported files.** Any stored or exported file containing personal
fields (generated documents, CSV/PDF exports, backups of such artefacts) must be
**tracked in a data inventory** and, on anonymization, **deterministically
deleted or replaced by a redacted artefact**. **Legal/tax holds override** and
defer this step, recording the hold.

- The single transaction (for database steps) either completes fully or rolls
  back.
- **Positive verification.** `QA-SECURITY` asserts that after anonymization **no
  table, log stream or tracked file** contains the subject's original email,
  username, phone, IP or user agent — a positive search that also covers
  **reasonable relinking combinations** (e.g. name+phone, email prefix+domain),
  not only exact string matches. This search is a *test assertion*, not the
  production control.
- A company is never anonymized while it has non-terminal trade records, or
  while any covering legal hold is active; the request moves to
  `RETENTION_HOLD` with the blocking reason recorded.
- Anonymization is **irreversible** and requires explicit administrator
  confirmation separate from approval.

## 7. Contract for the parallel wave

Fixed before P2-P1 is assigned; a lane needing a change returns to this gate.

- **Route prefixes:** `/api/v1/companies`, `/api/v1/companies/{company_id}/...`,
  `/api/v1/companies/{company_id}/onboarding` (section 1.10),
  `/api/v1/me/profile`, `/api/v1/me/preferences`, `/api/v1/me/sessions`,
  `/api/v1/me/invitations`, `/api/v1/me/consents`,
  `/api/v1/me/deletion-request`, `/api/v1/admin/companies`,
  `/api/v1/admin/accounts`, `/api/v1/admin/deletion-requests`,
  `/api/v1/admin/legal-holds`.
- `/me/*` never takes a user id in the path — the subject is always the token.
- `GET /auth/me` returns `users.status`, the caller's memberships with per-
  membership company `status`, and any unconsumed `company_applications` claim
  (section 1.9).
- **Error codes** extend the Phase 1 envelope
  (`{error:{code,message,request_id}}`): `company_not_found`, `not_a_member`,
  `insufficient_company_role`, `company_type_mismatch`,
  `last_owner_cannot_leave`, `owner_cardinality_violation`,
  `invitation_not_found`, `invitation_expired`, `invitation_target_not_found`,
  `duplicate_invitation`, `duplicate_deletion_request`,
  `unsupported_preference_value`, `session_not_owned`,
  `account_not_approved`, `company_not_active`, `legal_hold_active`,
  `onboarding_field_not_allowed`, `application_claim_not_found`,
  `application_claim_already_consumed`.
- **`DB-SCHEMA` owns migration `0003` alone** and commits a single head. Other
  lanes submit model proposals; CI already asserts `alembic heads == 1`.
- Typed client is regenerated at gate P2-S2 only, after OpenAPI is published.

## 8. Migration 0003 — upgrade, assertions, downgrade

The conversion in Decision 0.1 rewrites the ownership model of live data. It
gets explicit safety requirements. **Migration `0003` never adds, renames,
re-values or backfills `users.status`** — the Phase 1 column, its six values,
the failed-login state, `locked_at`, approval/suspension metadata,
`auth_version` and login eligibility are all preserved exactly.

### 8.1 Upgrade order

1. Create `companies`, `company_members`, the typed extensions' new keys,
   `company_applications` (section 1.9.1), the `legal_holds` table, and the
   remaining Phase 2 tables.
2. Add `companies.status`; add the composite unique keys
   `users(id, user_type)` and `companies(id, company_type)` (section 1.1).
   **No `users.account_status` is added; `users.status` is left untouched.**
3. Widen the `admin_audit_logs.action` `CHECK`/enum for the Phase 2 actions and
   **add the stored `admin_audit_logs.retention_category` column** (section
   5.5), backfilling it for existing rows via the fail-closed action→category
   mapping (an unmapped action aborts the migration).
4. **Backfill** one `companies` row per existing `business_clients` and
   `vendors` row, carrying `company_name`, `country`, a `company_type` derived
   from the source table, and a `status` derived by the mapping in section 8.1a.
5. **Backfill** one `company_members` row per source row: the registering
   `user_id`, role `OWNER`, a `status` derived by section 8.1a, with `user_type`
   and `company_type` set from `users.user_type`. **`users.status` is not
   changed.**
6. Add `company_id` (and `company_type`) to `business_clients` and `vendors`,
   populate them, then make `company_id` `NOT NULL` and add the composite FK
   `(company_id, company_type) → companies(id, company_type)`.
7. **Only then** drop the `user_id` columns from `business_clients` and
   `vendors`.
8. Delete `user_roles` rows referencing the four company roles, then delete
   those role rows (section 1.4).
9. **Only after** the section 8.2 assertions pass, create the two deferred
   owner-cardinality constraint triggers (on `company_members` and on
   `companies`, `DEFERRABLE INITIALLY DEFERRED`, section 1.7).

#### 8.1a Backfill mapping — derived from `users.status` and `approved_at`

Existing account authorization is **not changed**. Company and membership state
is derived deterministically; `users.status` is preserved exactly and continues
to control login independently.

The mapping is **fail-closed**: `approved_at` non-null activates a company and
membership **only** when `users.status` is a status that a legitimately approved
account can hold. `PENDING_APPROVAL` and `REJECTED` are **incompatible** with a
non-null `approved_at` (an approved account cannot still be pending, and a
rejection clears/precludes approval), so those combinations are treated as
corrupt data and **abort the migration** rather than silently activating. Every
combination not explicitly mapped to a state below aborts.

| Existing user condition | `companies.status` | owner `company_members.status` |
| --- | --- | --- |
| `approved_at` **non-null** and `users.status ∈ {ACTIVE, LOCKED, SUSPENDED, DISABLED}` | `ACTIVE` | `ACTIVE` |
| `approved_at` **non-null** and `users.status = PENDING_APPROVAL` | — | **abort migration** (invalid: approved yet pending) |
| `approved_at` **non-null** and `users.status = REJECTED` | — | **abort migration** (invalid: approved yet rejected) |
| `approved_at` null and `users.status = PENDING_APPROVAL` | `PENDING_REVIEW` | `PENDING_COMPANY_REVIEW` |
| `approved_at` null and `users.status ∈ {REJECTED, DISABLED}` | `REJECTED` | `REVOKED` |
| `approved_at` null and `users.status ∈ {ACTIVE, LOCKED, SUSPENDED}` | — | **abort migration** (impossible: active/locked/suspended without approval) |
| Any other / impossible / uncategorized status × `approved_at` combination | — | **abort migration** |

- **`approved_at` non-null ⇒ active company and membership only for the four
  post-approval statuses.** For `ACTIVE`, `LOCKED`, `SUSPENDED` and `DISABLED`
  the account was genuinely approved, so it maps to an `ACTIVE` company and
  `ACTIVE` membership. The user's status still independently governs login, so a
  `LOCKED`, `SUSPENDED` or `DISABLED` (but previously approved) user gets an
  `ACTIVE` company and `ACTIVE` membership yet **still cannot log in** —
  `company ACTIVE` never overrides a blocked `users.status` (section 1.8).
- **`PENDING_APPROVAL` / `REJECTED` with `approved_at` non-null are invalid and
  abort.** A pending or rejected account carrying an approval timestamp is
  contradictory data the contract refuses to interpret; the migration aborts
  rather than activating a company for it.
- **Unapproved profiles never become active.** A `PENDING_APPROVAL` or
  `REJECTED` profile with **no** `approved_at` maps to a non-active company and a
  non-active membership, so it cannot operate anything.
- **DISABLED ambiguity is resolved by `approved_at`.** A `DISABLED` user with an
  `approved_at` maps to `ACTIVE`/`ACTIVE` (they were once approved; login stays
  blocked by their `DISABLED` status). A `DISABLED` user with no `approved_at`
  maps to `REJECTED`/`REVOKED`. In both cases `users.status` is preserved.
- **Abort, never guess.** Every status × `approved_at` combination not mapped to
  a concrete state above — including `ACTIVE`/`LOCKED`/`SUSPENDED` without an
  `approved_at`, and `PENDING_APPROVAL`/`REJECTED` **with** an `approved_at` —
  **aborts the migration** rather than inventing a state.
- **Tests required (`QA-SECURITY`).** Seed one existing profile for **each of
  the six `users.status` values**, both with and without `approved_at` (twelve
  seeded combinations), and assert: each mapped combination derives the
  company/membership state in the table; each **abort** combination —
  `PENDING_APPROVAL`+`approved_at`, `REJECTED`+`approved_at`, and
  `ACTIVE`/`LOCKED`/`SUSPENDED` without `approved_at` — aborts the migration
  before any state is written; `users.status` is byte-for-byte unchanged for the
  mapped cases; and a previously-approved but `LOCKED`/`SUSPENDED`/`DISABLED`
  user still cannot log in despite an `ACTIVE` company.

### 8.2 Assertions — the upgrade aborts rather than half-completing

Executed inside the migration transaction, before step 7 and before the triggers
are created:

- `COUNT(companies) == COUNT(business_clients) + COUNT(vendors)` at backfill
  time — no source row lost, none duplicated.
- Every `business_clients` / `vendors` row has a non-null `company_id` and a
  `company_type` equal to its parent company's type.
- Every **`ACTIVE`** company has **exactly one** `ACTIVE OWNER`; every
  non-`ACTIVE` company has **at most one** `ACTIVE OWNER`.
- No `company_members` row has `user_type != company_type`.
- Every `admin_audit_logs` row has a non-null, mapped `retention_category`.
- `users.status` is unchanged for every user (compared against a pre-migration
  snapshot).
- No orphaned `company_id` references.

Any failed assertion raises, rolling the transaction back. The entrypoint runs
under `set -eu`, so a failure exits non-zero and the container refuses to serve
rather than starting on a half-migrated schema.

### 8.3 Downgrade

- `downgrade()` is **implemented and tested**, not a `pass` stub.
- It drops the two deferred owner-cardinality triggers, restores `user_id` on
  `business_clients` and `vendors` from the `OWNER` membership row, **re-creates
  the four global roles** (`BUYER_OWNER`, `BUYER_MEMBER`, `VENDOR_OWNER`,
  `VENDOR_MEMBER`), then drops the Phase 2 tables in reverse dependency order —
  but **only after** the exhaustive preflight below has confirmed every
  Phase-2-only relation is empty or faithfully reconstructable. **`users.status`
  is never touched by downgrade.**
- **Narrowing the audit `CHECK` must never delete governance history.** The
  downgrade drops `admin_audit_logs.retention_category` and narrows the action
  `CHECK`/enum back to the Phase 1 enumeration. It **must not** delete, rewrite
  or re-map any `admin_audit_logs` row merely to satisfy the narrowed `CHECK`.
  Instead, downgrade **refuses — raising before any destructive step — while
  any `admin_audit_logs` row carries a Phase-2-only action** (`company.*`,
  `deletion.*`, `legal_hold.*`, `purge.run`, and every other action added in
  section 5.5), **including rows that are retained or under legal hold**. Only
  once no Phase-2-only-action row remains may the narrowing proceed. Rows that
  already carry a **Phase 1 action** survive the downgrade untouched; they simply
  lose the `retention_category` column when it is dropped. `QA-SECURITY` seeds a
  Phase-2-only-action audit row (including a held one) and asserts downgrade
  refuses before any destructive work, and that a database of only Phase-1-action
  rows downgrades cleanly with those rows preserved.
- **Reconstruct the legacy global owner-role assignments.** After recreating the
  four global roles, downgrade **re-creates the `user_roles` assignment for the
  single owner of each company** — assigning `BUYER_OWNER` or `VENDOR_OWNER`
  (by company type) to that owner's `user_id` — so the pre-0003 authorization
  state is faithfully restored, not merely the tables. `QA-SECURITY` tests this
  reconstruction.
- **Refuse before any data loss.** The pre-0003 schema can represent only a
  single-owner, single-member company with no invitations, and Phase 1
  `business_clients.user_id` / `vendors.user_id` are **unique** — one user maps
  to at most one buyer profile and at most one vendor profile. Downgrade
  therefore **refuses to run — raising rather than silently discarding —**
  before performing any destructive step if **any** of the following hold:
  - any company has more than one `company_members` row in *any* status (not
    merely more than one `ACTIVE` member) — an `INVITED`, `REVOKED`, `EXPIRED`
    or `PENDING_COMPANY_REVIEW` row is a record the legacy schema cannot hold;
  - the owner-role reconstruction cannot be performed faithfully (e.g. a company
    with no single unambiguous owner);
  - **restoring `user_id` would map one user to more than one
    `business_clients` profile, or more than one `vendors` profile** — this
    would violate the Phase 1 unique `user_id` and cannot be represented, so
    downgrade stops rather than colliding or dropping a profile.
  These checks run **before** any destructive step. A downgrade that would lose
  team members, invitation history, authorization state, or would violate the
  Phase 1 unique `user_id`, stops instead.
- **Exhaustive Phase-2-only preflight — any row refuses, no data is lost.** The
  no-data-loss guarantee holds only if downgrade never silently drops a relation
  the Phase 1 schema cannot represent. Before any destructive step, downgrade
  runs the preflight below over **every** Phase-2-only relation named in this
  contract. **Any row present in a relation with disposition _refuse_ aborts the
  downgrade** (raising, before any drop or data change). Relations with a defined
  faithful Phase-1 reconstruction (`companies`, `company_members`, the typed
  extensions `business_clients`/`vendors`) are handled by their existing rules
  (this section and 8.1/8.1a) and do **not** by themselves block. The claim
  "downgrade loses no data" is retained precisely because every
  non-reconstructable relation forces refusal rather than a silent drop.

  | Phase-2-only relation | Reconstructable in Phase 1? | Downgrade disposition |
  | --- | --- | --- |
  | `company_applications` | No | **Refuse if any row exists** (any status, incl. held), section 1.9.1 |
  | `legal_holds` (active or released) | No | **Refuse if any row exists**; an active hold additionally blocks all destructive work |
  | `admin_audit_logs` rows with a **Phase-2-only action** | No | **Refuse if any row exists** (incl. retained/held); Phase-1-action rows survive (above) |
  | `user_profiles` | No | **Refuse if any row exists** |
  | `user_preferences` | No | **Refuse if any row exists** |
  | `notification_preferences` | No | **Refuse if any row exists** |
  | `privacy_consents` (and consent-change history) | No | **Refuse if any row exists** |
  | `account_deletion_requests` | No | **Refuse if any row exists** |
  | company deletion-request rows | No | **Refuse if any row exists** |
  | invitation rows (if stored separately from `company_members`) | No | **Refuse if any row exists** |
  | `user_devices` and any newly-stored session/device rows (beyond `refresh_tokens`) | No | **Refuse if any row exists** |
  | `retention_category` column on `admin_audit_logs` | Column only | Dropped after preflight passes (no row-level data loss) |
  | `company_members` beyond one owner / any non-owner status | Partially | Refuse per the multi-membership rule above |
  | `companies`, `business_clients`/`vendors` (typed extensions) | Yes | Reconstructed per 8.1/8.1a and this section |

  Any other non-reconstructable Phase-2 relation added by migration `0003` and
  not listed above inherits the default **refuse-if-any-row-exists** disposition;
  the preflight enumerates the full Phase-2 table set so none is missed.
- **Exhaustive Phase-2-only _column_ preflight — non-reconstructable column data
  refuses, no data is lost.** The relation preflight above stops a Phase-2-only
  *table* from being silently dropped, but downgrade also **removes Phase-2-only
  _columns_ added to existing or reconstructed Phase-1 relations** (`companies`,
  `business_clients`, `vendors`, `users`, `refresh_tokens`, `admin_audit_logs`,
  `account_status_history`, and any other existing Phase-1 relation touched by
  `0003`). Before any destructive step, downgrade runs the **column-inventory
  matrix** below and classifies every such column as **(F) faithfully
  reconstructed** into a Phase-1 column, **(D) safely derived / disposable**
  (re-derivable or used only to drive reconstruction, then dropped with no
  information loss), or **(N) non-reconstructable** (the pre-0003 schema has
  nowhere to keep it). **Downgrade refuses — raising before any drop or data
  change — if any column classified (N) contains non-null / non-default data.**
  Columns classified (F) or (D) drop cleanly; a (N) column that is entirely
  null/default across all rows also drops cleanly. `company_id` and
  `company_type` used to drive reconstruction, and
  `admin_audit_logs.retention_category` derived from `action`, are **(D)** and
  may be removed **only under the safe conditions already defined** in this
  section and in 8.1/8.1a. **`companies.status` is not unconditionally (D):** it
  is (D) only while it still equals the §8.1a baseline recomputed for that
  specific company (from its owner `users.status` × `approved_at`), and **(N) —
  forcing refusal before any mutation — when it has moved off that baseline
  through an independent Phase-2 company lifecycle transition
  (approve/reject/suspend/reactivate or a direct change), even if the governing
  Phase-2 audit row has aged out** (§5.2); the check recomputes the baseline
  rather than trusting the audit trail. Phase-2 audit **actions** remain **(N)**
  and still force refusal (relation preflight above).

  | Relation | Phase-2-only column(s) | Class | Downgrade disposition |
  | --- | --- | --- | --- |
  | `companies` | `id`/`company_id` (PK), `company_type` | **D** | Used to drive reconstruction (which extension, 8.1a state, `user_id` restore); removed under the safe conditions of this section |
  | `companies` | `status` | **D / N — conditional** | **(D)** only where the current value still **equals the deterministic §8.1a backfill baseline recomputed for that specific company** from its owner `users.status` × `approved_at`; then it merely re-drives 8.1a reconstruction and drops with no loss. **(N) — refuse before any mutation** where it **differs** because of any independent Phase-2 company lifecycle transition (approve/reject/suspend/reactivate or a direct change): that divergence is Phase-2 state the pre-0003 schema cannot hold. Detection compares the stored value against the recomputed baseline, **not** the audit trail, so refusal holds **even if the related Phase-2 governance audit row has aged out** (§5.2). |
  | `companies` | `legal_name`, `country`, primary-contact name/phone | **F** | Reconstructed into `business_clients`/`vendors` `company_name`, `country`, `contact_name`, `phone` (Phase 1 columns) |
  | `companies` | `trading_name`, `registration_number`/licence number, `tax_id`, `website` | **N** | **Refuse if any row holds a non-null/non-default value** — Phase 1 has no such column |
  | `business_clients` | `company_id`, `company_type` | **D** | Drive `user_id` restore then dropped |
  | `business_clients` | delivery addresses, **preferred Incoterms**, **buying categories**, **annual volume band** | **N** | **Refuse if any is populated** — Phase 1 `business_clients` held only `company_name`, `contact_name`, `phone`, `country` |
  | `vendors` | `company_id`, `company_type` | **D** | Drive `user_id` restore then dropped |
  | `vendors` | `supply_categories` | **F** | Existed in Phase 1 `vendors`; preserved |
  | `vendors` | facilities, warehouses, sourcing locations, **certifications**, **capacity** | **N** | **Refuse if any is populated** — Phase-2-only vendor data with no Phase 1 home (facilities/sourcing locations are also Phase-2-only child relations, refused above) |
  | company contacts / addresses / facilities (child structures) | all columns | **N** | **Refuse if any row exists** — Phase-2-only structures Phase 1 cannot represent (also relations, refused above) |
  | `users` | `UNIQUE (id, user_type)` composite key | **D** | Constraint/redundant index only — carries **no data**; dropped with no loss; `users.status` and all Phase 1 columns untouched |
  | `refresh_tokens` | `device_id` FK (nullable, `ON DELETE SET NULL`) | **D** | A non-null value implies a `user_devices` row, which already forces refusal (relation preflight); the column itself carries only the device link and is dropped |
  | `admin_audit_logs` | `retention_category` | **D** | Re-derivable from `action`; dropped after preflight passes (also relation table above) |
  | `admin_audit_logs` | widened `action` `CHECK`/enum values (`company.*`, `deletion.*`, `legal_hold.*`, `purge.run`) | **N** | Any row carrying a Phase-2-only **action** forces refusal (§8.3 audit-narrowing rule); Phase-1-action rows survive |
  | `account_status_history` | *(none added by `0003`)* | — | No Phase-2-only column; relation unchanged by downgrade |

  Any other Phase-2-only column added by `0003` to an existing/reconstructed
  Phase-1 relation and not listed here inherits the default **(N)
  refuse-if-non-null/non-default** disposition, so none is missed. This closes
  the gap the relation-only preflight left: a downgrade cannot silently discard
  Phase-2-only *column* data (a company's trading name, tax ID, licence number,
  website, buyer Incoterms/categories/volume, vendor capacity/certifications, or
  comparable fields) by dropping the column beneath it.
- **Tests required (`QA-SECURITY`) — column preflight.** A **parameterized
  seeded test over every (N) column** in the matrix: seed a single row carrying a
  non-null/non-default value in that column and assert the downgrade **refuses
  before any mutation** (before any drop, rewrite or data change). Complementary
  cases assert that (F) columns round-trip into their Phase-1 targets, that (D)
  columns drop cleanly once their safe conditions hold, and that a (N) column
  which is entirely null/default across all rows drops without refusal.
- **Tests required (`QA-SECURITY`) — conditional `companies.status`.** Two
  seeded cases prove both branches of the conditional classification:
  - **Unchanged baseline statuses permit downgrade.** Seed companies whose
    `companies.status` still equals the §8.1a baseline recomputed from each
    owner's `users.status` × `approved_at` (an approved-active company at
    `ACTIVE`; a still-pending company at `PENDING_REVIEW`), and assert the column
    preflight classifies `companies.status` **(D)** and the downgrade proceeds,
    reconstructing per 8.1/8.1a.
  - **Independently changed company status with no remaining audit row refuses
    before mutation.** Seed a company backfilled with an `ACTIVE` baseline whose
    `companies.status` has since been moved off baseline by a Phase-2 lifecycle
    transition (e.g. `SUSPENDED` or `REJECTED`), and **delete / age out every
    related Phase-2 governance audit row** so no `company.*` audit row survives to
    trigger the relation preflight. Assert the column preflight recomputes the
    §8.1a baseline, detects the divergence, classifies `companies.status` **(N)**,
    and the downgrade **refuses — raising before any drop, rewrite or data
    change** — proving refusal depends on the baseline comparison, not on any
    surviving audit row.
- CI already runs `upgrade head → downgrade base → upgrade head`, which
  exercises this path on an empty database. `QA-SECURITY` adds seeded
  round-trip tests: a single-member company (asserting the global owner-role
  assignment is reconstructed); refusal when a company has any second membership
  row in any status; and refusal when one user would map to more than one buyer
  or more than one vendor profile, asserted **before** any destructive step
  runs. It also adds a **seeded refusal test per Phase-2-only relation in the
  preflight table (or a parameterized exhaustive test over that set)**, each
  seeding a single row and asserting the downgrade refuses **before** any
  destructive step — covering `company_applications`, active and released
  `legal_holds`, a Phase-2-only-action `admin_audit_logs` row (including a held
  one), `user_profiles`, `user_preferences`, `notification_preferences`,
  `privacy_consents`, `account_deletion_requests`, company deletion-request
  rows, separately-stored invitation rows, and `user_devices`. A parameterized
  test proves the refusal happens before destructive steps for every listed
  relation.

## 9. Sign-off

Revision 7's **independent automated architecture re-review has returned PASS
(13 September 2026)**, and the testing/release review's **PASS (13 September
2026)** — first earned on revision 5 — is preserved for revision 7. With both
automated re-reviews now PASS, revision 7 remains **DRAFT** solely until **both**
accountable human roles sign below. No agent may fill in a human name or approve
its own findings. No implementation wave (P2-P1) is assigned.

### 9.1 Product decisions

| Reviewer | Scope | Result | Date |
| --- | --- | --- | --- |
| Product owner | Multi-company membership, invitation defaults, account/company approval split, retention approach | **APPROVED** | 13 September 2026 |

Product-owner approval of retention is **subject to the category-specific rules
in section 5.2** — the blanket seven-year figure approved against revision 2 is
superseded; approval covers the category-specific model, not any single
retention constant.

### 9.2 Automated technical review — evidence (not a sign-off)

Automated reviews are **evidence**, not accountability. They cannot self-sign
the contract.

| Evidence source | Scope | Result on revision 5 | Re-review on revision 6 | Re-review on revision 7 |
| --- | --- | --- | --- | --- |
| Automated technical review — architecture audit | Fail-closed backfill mapping (`users.status` × `approved_at`), downgrade refusal for Phase-2-only relations **and columns** (incl. the conditional `companies.status` classification), pending-application retention, device/token purge ordering, real audit tables, owner cardinality, pending-company onboarding path, migration safety | **CHANGES REQUIRED (13 September 2026)** — two findings: **(1) purge/retention integrity** — a still-`PENDING` `company_applications` claim aged out via the `COALESCE(…, created_at)` fallback (breaking the atomic-registration invariant), and device/token purge ordering / `ON DELETE` fallback / transitive holds were unspecified; **(2) downgrade Phase-2-only column data loss** — the preflight covered Phase-2-only relations but not the Phase-2-only columns added to existing/reconstructed Phase-1 tables | **CHANGES REQUIRED (13 September 2026)** — one final blocker: the §8.3 column preflight classified `companies.status` as unconditionally **(D)** safely derived/disposable, so a status moved off its §8.1a baseline by an independent Phase-2 company lifecycle transition (approve/reject/suspend/reactivate or direct change) could be silently dropped — the classification must be conditional on the recomputed §8.1a baseline and refuse when it diverges, even if the related Phase-2 audit row has aged out | **PASS (13 September 2026)** — the one revision-6 blocker is resolved: the §8.3 column preflight now classifies `companies.status` **conditionally** — **(D)** only while it still equals the recomputed §8.1a baseline, else **(N)** with refusal **before any mutation**, holding even when the related Phase-2 audit row has aged out — backed by two seeded tests; no other control weakened |
| Automated technical review — testing/release audit | `user_devices` / `company_applications` purge anchors, released legal-hold retention + above-maximum settings validation, corrected anonymization field/type inventory (opaque-UUID tombstone key, exhaustive subject-linked records), purge release matrix, downgrade fidelity incl. unique-`user_id` refusal | **PASS (13 September 2026)** | **PASS preserved** — revision 6 weakens no testing/release control; the purge anchors, legal-hold retention, settings validation and downgrade-fidelity controls that earned the PASS are unchanged except where finding (1)/(2) strengthen them | **PASS preserved (13 September 2026)** — revision 7 changes only the §8.3 `companies.status` classification (adding a refusal path and two seeded tests) and weakens no testing/release control |

### 9.3 Accountable human sign-off (required)

A **human name must be supplied** in each row below. No agent may fill these in
or approve its own findings.

| Accountable role | Scope | Human name | Result | Date |
| --- | --- | --- | --- | --- |
| Solution Architecture Owner | Accepts the architecture decisions and the automated architecture evidence | *(blank — human name required)* | **pending** | |
| QA/Release Owner | Accepts the testing/release decisions and the automated testing evidence | *(blank — human name required)* | **pending** | |

Both independent automated re-reviews now **PASS on revision 7** (architecture
and testing/release, 13 September 2026). Wave P2-P1 therefore remains blocked
**solely** on the two accountable human signatures above — the Solution
Architecture Owner and the QA/Release Owner rows must each be signed with a
human name before P2-P1 is assigned.

## 10. Revision 6 change log

Compact summary of what changed from revision 5, resolving the **two revision-5
architecture re-review findings** while preserving the revision-5 testing/release
**PASS**. Every other decision — tenant isolation §1.2–1.6, RBAC §1.3–1.4,
invitation QA §2.1, `users.status` lifecycle §1.8, category-specific retention
§5.2, owner cardinality §1.7, fail-closed backfill §8.1a, downgrade role and
**relation** reconstruction §8.3, released-legal-hold retention §5.6, corrected
anonymization inventory §6.2/§6.2.1, human accountability §9 — is unchanged
except where a finding below required it; no resolved control is weakened.

- **Header / intro:** revision 5 → 6; summarised the two architecture findings
  resolved and the preserved testing/release PASS.
- **Finding 1a — pending applications never age out (§1.9.1, §5.3, §5.7):** the
  `company_applications` purge anchor is now `COALESCE(terminal_at, consumed_at)`
  — **no `created_at` fallback**. A still-`PENDING` claim has a **NULL anchor and
  is permanently ineligible for purge**, so the atomic-registration invariant
  (§1.9) cannot be broken by purge. Retention starts only at `consumed_at`
  (`CONSUMED`) or `terminal_at` (`WITHDRAWN`/`REJECTED`). Stale pending claims are
  cleaned up only by an **explicit audited state transition** coordinated with
  account lifecycle — **no silent time-based deletion**. Pending-application
  invariant defined; §5.3 anchor table/note, §5.7 matrix (pending never-purged
  row, terminal boundary row, stale-claim row) and tests updated accordingly.
- **Finding 1b — device/token purge ordering and holds (§5.1, §5.3, §5.6,
  §5.7):** `refresh_tokens.device_id` is **`ON DELETE SET NULL`** as a safety
  fallback; the purge job deletes **eligible refresh-token families before** an
  eligible device, and a device is purged **only after no retained/held token row
  references it**. A legal hold on **either** the device or a linked token family
  **transitively protects both** and preserves the `device_id` linkage. §5.7 rows
  and §5.6 tests (m/n/o) added for ordering, the `ON DELETE` fallback, and
  one-sided holds.
- **Finding 2 — downgrade Phase-2-only column inventory (§8.3):** added a
  preflight **column-inventory matrix** over Phase-2-only columns added to
  existing/reconstructed Phase-1 relations (`companies`, `business_clients`,
  `vendors`, `users`, `refresh_tokens`, `admin_audit_logs`,
  `account_status_history`), each classified **F** (faithfully reconstructed),
  **D** (safely derived/disposable) or **N** (non-reconstructable). Downgrade
  **refuses before any destructive step** if any **N** column holds
  non-null/non-default data — explicitly covering trading name, registration/
  licence number, tax ID, website, company contacts/addresses/facilities,
  buyer Incoterms/buying categories/annual volume, and vendor
  capacity/certifications. `company_id`/`company_type`/`status` and
  `retention_category` are **D** (removable only under already-defined safe
  conditions); Phase-2 audit **actions** remain **N** and still force refusal.
  Parameterized seeded tests per **N** column assert refusal **before** mutation.
- **§9:** revision-5 architecture evidence recorded **CHANGES REQUIRED (13
  September 2026)** with the two findings; revision-5 testing/release evidence
  recorded **PASS (13 September 2026)** and preserved; revision-6 architecture
  re-review added as *pending*; human names remain blank/pending; contract
  remains DRAFT; no implementation wave assigned.

### Decisions still requiring a human name

- **Solution Architecture Owner** (§9.3) — blank; a human must sign.
- **QA/Release Owner** (§9.3) — blank; a human must sign.
- The revision-6 **architecture re-review is pending** (testing/release already
  PASS on revision 5); revision 6 stays DRAFT until it passes and both human rows
  are signed.

## 11. Revision 7 change log

Compact summary of what changed from revision 6, resolving the **one final
revision-6 architecture re-review blocker** while preserving every revision-6
decision and the revision-5 testing/release **PASS**. No other decision is
touched and no resolved control is weakened.

- **Header / intro:** revision 6 → 7; recorded the single architecture blocker
  resolved and the preserved testing/release PASS; the revision-6 history is
  retained below the new lead.
- **Finding — conditional `companies.status` in the §8.3 column-inventory
  preflight (§8.3):** `companies.status` is no longer classified unconditionally
  **(D)**. It is **(D)** only while its current value still equals the
  deterministic §8.1a backfill baseline **recomputed for that specific company**
  from its owner `users.status` × `approved_at`; it is **(N)** and downgrade
  **refuses before any mutation** (before any drop, rewrite or data change) when
  it differs because of any independent Phase-2 company lifecycle transition
  (approve/reject/suspend/reactivate or a direct change). Detection recomputes
  the baseline and compares the stored value against it, **not** the audit trail,
  so refusal holds **even if the related Phase-2 governance audit row has aged
  out** (§5.2). The column matrix splits `companies.status` out of the former
  `id`/`company_type`/`status` **(D)** row into its own **D / N — conditional**
  row, and the accompanying **(D)** narrative is corrected to note the condition.
- **Tests (§8.3):** added two seeded `QA-SECURITY` cases — unchanged baseline
  statuses permit downgrade (classified **(D)**, reconstruction proceeds); an
  independently changed company status **with no remaining related audit row**
  refuses **before mutation** (classified **(N)**, proving refusal depends on the
  baseline comparison, not any surviving audit row).
- **§9:** revision-6 architecture evidence recorded **CHANGES REQUIRED (13
  September 2026)** with the one blocker; revision-6 testing/release evidence
  recorded **PASS (13 September 2026)** and preserved; the revision-7
  architecture re-review is now recorded **PASS (13 September 2026)** and
  testing/release **PASS (13 September 2026)** is preserved; human names remain
  blank/pending; contract remains DRAFT; no implementation wave assigned.

### Decisions still requiring a human name (revision 7)

- **Solution Architecture Owner** (§9.3) — blank; a human must sign.
- **QA/Release Owner** (§9.3) — blank; a human must sign.
- The revision-7 **architecture re-review is now PASS** (13 September 2026), and
  testing/release is **PASS** (13 September 2026, preserved); revision 7 stays
  DRAFT **solely** until both human rows above are signed.
