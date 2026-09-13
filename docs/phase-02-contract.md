# Phase 2 — Sequential gate P2-S1: Ownership contract

| Field | Value |
| --- | --- |
| Phase | 2 — Profiles, companies, sessions, preferences and privacy |
| Gate | P2-S1 (contract) — must pass before wave P2-P1 is assigned |
| Depends on | Phase 1 (`804558d`) |
| Revision | 2 — incorporates the product decisions of 13 September 2026 |
| Status | **REVISED — awaiting architecture and testing sign-off** |

Revision 1 was returned CHANGES REQUIRED. The three open questions are now
answered (sections 1, 7, 4) and the nine additional requirements are specified
in sections 1.2, 1.3, 1.4, 7.2, 4.3, 5.3, 5.4 and 8.

## 0. What Phase 1 already established

Phase 2 extends these; it must not redefine them.

- `business_clients` and `vendors` exist, each with a **1:1 `user_id`** to the
  registering user, plus `company_name`, `contact_name`, `phone`, `country`
  (and `supply_categories` on vendors).
- Roles seeded: `BUYER_OWNER`, `BUYER_MEMBER`, `VENDOR_OWNER`, `VENDOR_MEMBER`,
  plus the admin-side roles. **All four company roles currently carry an empty
  permission set** (`rbac/constants.py`), so they grant nothing today.
- The access token carries a **`roles` claim** (`core/security.py`
  `create_access_token`). This matters — see section 1.3.
- `refresh_tokens` stores `family_id`, `ip_address`, `user_agent`, `issued_at`,
  `expires_at`, `revoked_at`, `revoked_reason`, `auth_version`.

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

1. **Database** — `company_members` carries a denormalised `user_type` and
   `company_type`, with a `CHECK (user_type = company_type)` constraint and
   composite foreign keys back to `users` and `companies`. A mismatched row
   cannot be inserted even by a buggy service or a manual query.
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
  and verifies: the row exists, `status = ACTIVE`, and `user_type` matches
  `company_type`. **No membership fact may be cached in, or read from, the
  token.**
- Failure returns **404**, never 403 — see 1.5.

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
  asserts the request is refused. This is the regression that proves the rule.

### 1.4 Global `BUYER_OWNER` and `VENDOR_OWNER` are de-authorised

Keeping company-shaped names in the global role catalogue invites exactly the
mistake 1.3 forbids.

- `BUYER_OWNER`, `BUYER_MEMBER`, `VENDOR_OWNER`, `VENDOR_MEMBER` are **removed
  from the global role catalogue** and from `seed_rbac`.
- Migration `0003` deletes any `user_roles` assignments referencing them and
  removes the role rows. This is safe: all four carry empty permission sets
  today, so no capability is lost.
- The names are **reserved** — they must not be reintroduced as global roles.
- Company roles live only in `company_members.role`, drawn from a separate
  enum: `OWNER`, `ADMIN_MEMBER`, `MEMBER`, `VIEWER`.

### 1.5 Capability matrix

Scoped to the member's own company only.

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

### 1.7 Atomic ownership transfer

Exactly one `ACTIVE` member with role `OWNER` per company, at all times.

- Enforced by a **partial unique index**:
  `UNIQUE (company_id) WHERE role = 'OWNER' AND status = 'ACTIVE'`. The database
  makes a second owner impossible, not just unlikely.
- Transfer is a **single transaction** that selects both membership rows
  `FOR UPDATE` (ordered by `user_id` to avoid deadlock), demotes the current
  owner to `ADMIN_MEMBER`, and promotes the target to `OWNER`. There is no
  intermediate state with zero or two owners.
- The target must already be an `ACTIVE` member of the same company. Transfer to
  a non-member, or to an `INVITED` user, is rejected.
- The last owner **cannot leave, be removed, or be demoted**; the only exit is
  transfer. Attempts return `last_owner_cannot_leave`.
- Every transfer writes an audit record naming both parties and a reason.

## 2. Invitation and acceptance — without email verification

Phase 2 has no email delivery, so acceptance cannot depend on a mailed link.
The flow is built to be safe without one.

- **Default role for a new invitee is `VIEWER`.** Promotion to `MEMBER` or above
  is an explicit, separately audited action — never part of the invite.
- Lifecycle: `INVITED` → `ACTIVE` (accepted) | `REVOKED` (withdrawn) |
  `EXPIRED` (lapsed).
- **An `INVITED` member has no company access whatsoever.** They cannot read the
  company profile or appear in any company-scoped query. Section 1.2's check
  requires `status = ACTIVE`.
- An invitation targets a **registered, active user account**, identified by the
  exact email or username of an existing user. The portal does not invite
  strangers in Phase 2; the invitee must already have an approved account of the
  matching type.
- Acceptance is performed **by the invited user, authenticated as themselves**,
  via `POST /api/v1/me/invitations/{invitation_id}/accept`. Because the invitee
  must already hold an approved account and be signed in, authentication is the
  proof of identity that an email round-trip would otherwise supply.
- Invitations expire after **14 days** (configurable). An expired or revoked
  invitation cannot be accepted.
- One outstanding invitation per `(company_id, user_id)`; a duplicate is `409`.
- Invite, accept, revoke, expire and every role change write audit records.

## 3. Buyer and Vendor profile differences

Shared on `companies`: legal name, trading name, registration/licence number,
tax id, country, website, primary contact, status, timestamps, and
`company_type` (`BUYER` | `VENDOR`, immutable).

| Concern | Buyer (`business_clients`) | Vendor (`vendors`) |
| --- | --- | --- |
| Purpose | Receives goods | Supplies goods |
| Distinct fields | Delivery addresses, preferred incoterms, buying categories, annual volume band | `supply_categories` (exists), facilities, warehouses, sourcing locations, certifications, capacity |
| Address roles | `BILLING`, `DELIVERY` | `BILLING`, `PICKUP`, `WAREHOUSE` |
| Required before approval | Billing address + one contact | Billing address + one contact + **one facility** |

- `company_type` fixes which profile extension may exist, enforced by a database
  constraint rather than service logic alone.
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
  the needed metadata. Do not create a parallel session table. `user_devices`
  stores only a stable `device_id` and a user-supplied label.
- Exposed per session: device label, browser/OS parsed from `user_agent`,
  **truncated** IP, city-level location if available, `issued_at`,
  `last_seen_at`, and a `current` flag.
- **Never exposed:** `token_hash`, `family_id`, full `user_agent`, full IP.
- A user may revoke **only their own** sessions (`session_not_owned` otherwise).
  Revocation is immediate: revoke the whole token family and bump
  `auth_version`, reusing the Phase 1 mechanism. Revoking the current session
  behaves as logout.

### 5.2 Retention periods — configurable defaults

Neither UAE PDPL nor GDPR mandates specific figures. Both require that
identifiable data be kept only as long as necessary for a documented purpose
(UAE PDPL Article 5; GDPR Articles 5 and 13). These defaults are that
documented purpose, and each is a setting rather than a constant.

| Data | Default | Setting | Purpose justifying retention |
| --- | --- | --- | --- |
| `refresh_tokens` | **90 days** after `revoked_at` or `expires_at` | `LEO_RETENTION_REFRESH_TOKEN_DAYS` | Session forensics; refresh-reuse detection |
| `login_attempts` | **180 days** | `LEO_RETENTION_LOGIN_ATTEMPT_DAYS` | Brute-force and credential-stuffing investigation |
| `audit_logs` | **7 years** | `LEO_RETENTION_AUDIT_DAYS` | See 5.4 |

### 5.3 Automated purge

A retention policy that is never executed is not a policy.

- A scheduled purge job runs **daily**, deleting rows past their retention
  window for each category above.
- It is **idempotent, batched** (bounded rows per run so it cannot lock the
  table), and **logs a summary count per category** so execution is provable.
- It is invocable on demand as `python -m app.scripts.purge_expired` for tests
  and operations, with a `--dry-run` flag reporting counts without deleting.
- The job's own runs are audited. A failed run alerts rather than failing
  silently — a silently dead purge job is indistinguishable from a working one
  until an audit asks.
- `QA-SECURITY` tests both that in-window rows survive and that out-of-window
  rows are removed. The second assertion is the one that actually matters.

### 5.4 Audit records have a finite, separate retention

Revision 1 said audit records are never purged. That is not compatible with
"only as long as necessary" — indefinite retention of identifiable data needs
its own justification, not an exemption.

- `audit_logs` retention default is **7 years** (`LEO_RETENTION_AUDIT_DAYS`),
  chosen to cover commercial and tax record-keeping expectations for
  international trade, and configurable per deployment.
- Audit retention is deliberately **longer** than session and login-attempt
  retention, and is purged by the same job on its own schedule.
- Audit rows referencing an anonymized user keep the **tombstone** identifier
  (section 6.2), so the action history survives while the natural person does
  not remain identifiable.
- A legal or regulatory hold suspends purging for the affected records; the hold
  and its reason are themselves audited.

## 6. Deletion requests and anonymization

States: `REQUESTED` → `UNDER_REVIEW` → `APPROVED` | `REJECTED`;
`APPROVED` → `RETENTION_HOLD` → `ANONYMIZED`; plus `CANCELLED` by the requester
before a decision.

- One active request per subject; a duplicate is `409`
  (`duplicate_deletion_request`).
- Only a company `OWNER` may request company deletion; any user may request
  deletion of their own personal account.
- Every transition requires an administrator reason and writes an audit record,
  matching the Phase 1 admin-action pattern.

### 6.1 Anonymize, never delete

Trade records, audit history and status history are retained for their
documented periods. Deletion anonymizes the natural person and severs the link;
it does not erase transactional truth.

### 6.2 Scrubbing identifiers, IP addresses and user agents

Anonymization is incomplete if the person remains identifiable through
authentication or telemetry columns. All of the following are scrubbed in one
transaction.

| Data | On anonymization |
| --- | --- |
| `users.email`, `username`, `phone`, `contact_name` | Replaced with an irreversible tombstone `deleted-user-<uuid>`; uniqueness preserved |
| `users.password_hash` | Overwritten and account permanently disabled |
| `refresh_tokens` | **Deleted outright**, all sessions revoked, `auth_version` bumped |
| `user_devices` | Deleted, including labels — a device label can name a person |
| `login_attempts.identifier` | **Scrubbed to the tombstone.** This is the field that most often preserves the original email after deletion |
| `login_attempts.ip_address`, `refresh_tokens.ip_address` | **Truncated** — IPv4 final octet, IPv6 final 80 bits — not merely masked on display |
| `login_attempts.user_agent`, `refresh_tokens.user_agent` | **Reduced** to browser and OS family; the full string is a fingerprint |
| `audit_logs.actor_id`, `status_history` | Actor id preserved as the tombstone; free-text reason fields scanned and scrubbed of the subject's identifiers |
| `user_profiles`, `user_preferences`, `notification_preferences` | Deleted |
| `privacy_consents` | **Retained** — proof of consent is itself the legal record — with the identifier replaced by the tombstone |
| Company rows, orders, quotations, documents | **Retained** — a company outlives its members |

- Scrubbing runs as **one transaction**. A partial scrub leaving identifiers in
  `login_attempts` is the failure mode to design against, so
  `QA-SECURITY` must assert that **no table** contains the subject's original
  email, username, phone, full IP or full user agent afterwards — a positive
  search across all tables, not a check of the ones we remembered.
- A company is never anonymized while it has non-terminal trade records; the
  request moves to `RETENTION_HOLD` with the blocking reason recorded.
- Anonymization is **irreversible** and requires explicit administrator
  confirmation separate from approval.

## 7. Contract for the parallel wave

Fixed before P2-P1 is assigned; a lane needing a change returns to this gate.

- **Route prefixes:** `/api/v1/companies`, `/api/v1/companies/{company_id}/...`,
  `/api/v1/me/profile`, `/api/v1/me/preferences`, `/api/v1/me/sessions`,
  `/api/v1/me/invitations`, `/api/v1/me/consents`,
  `/api/v1/me/deletion-request`, `/api/v1/admin/companies`,
  `/api/v1/admin/deletion-requests`.
- `/me/*` never takes a user id in the path — the subject is always the token.
- **Error codes** extend the Phase 1 envelope
  (`{error:{code,message,request_id}}`): `company_not_found`, `not_a_member`,
  `insufficient_company_role`, `company_type_mismatch`,
  `last_owner_cannot_leave`, `invitation_not_found`, `invitation_expired`,
  `duplicate_invitation`, `duplicate_deletion_request`,
  `unsupported_preference_value`, `session_not_owned`.
- **`DB-SCHEMA` owns migration `0003` alone** and commits a single head. Other
  lanes submit model proposals; CI already asserts `alembic heads == 1`.
- Typed client is regenerated at gate P2-S2 only, after OpenAPI is published.

## 8. Migration 0003 — upgrade, assertions, downgrade

The conversion in Decision 0.1 rewrites the ownership model of live data. It
gets explicit safety requirements.

### 8.1 Upgrade order

1. Create `companies`, `company_members`, and the remaining Phase 2 tables.
2. **Backfill** one `companies` row per existing `business_clients` and
   `vendors` row, carrying `company_name`, `country` and a `company_type`
   derived from the source table.
3. **Backfill** one `company_members` row per source row: the registering
   `user_id`, role `OWNER`, status `ACTIVE`, with `user_type` and `company_type`
   set from `users.user_type`.
4. Add `company_id` to `business_clients` and `vendors`, populate it, then make
   it `NOT NULL` with a foreign key.
5. **Only then** drop the `user_id` columns from `business_clients` and
   `vendors`.
6. Delete `user_roles` rows referencing the four company roles, then delete
   those role rows (section 1.4).

### 8.2 Assertions — the upgrade aborts rather than half-completing

Executed inside the migration transaction, before step 5:

- `COUNT(companies) == COUNT(business_clients) + COUNT(vendors)` at backfill
  time — no source row lost, none duplicated.
- Every `business_clients` / `vendors` row has a non-null `company_id`.
- Every company has **exactly one** `ACTIVE` `OWNER`.
- No `company_members` row has `user_type != company_type`.
- No orphaned `company_id` references.

Any failed assertion raises, rolling the transaction back. The entrypoint runs
under `set -eu`, so a failure exits non-zero and the container refuses to serve
rather than starting on a half-migrated schema.

### 8.3 Downgrade

- `downgrade()` is **implemented and tested**, not a `pass` stub.
- It restores `user_id` on `business_clients` and `vendors` from the `OWNER`
  membership row, re-creates the four global roles, then drops the Phase 2
  tables in reverse dependency order.
- **Documented limitation:** downgrade is faithful only while each company has a
  single member. Once a second member exists, that membership cannot be
  represented in the pre-0003 schema and is lost. The downgrade therefore
  **refuses to run** — raising rather than silently discarding — if any company
  has more than one `ACTIVE` member. This is the honest behaviour: a downgrade
  that silently drops team members is worse than one that stops.
- CI already runs `upgrade head → downgrade base → upgrade head`, which
  exercises this path on an empty database. `QA-SECURITY` adds a seeded
  round-trip test with a single-member company, plus a test asserting the
  multi-member refusal.

## 9. Sign-off

| Reviewer | Scope | Result | Date |
| --- | --- | --- | --- |
| Product owner | Multi-company membership, invitation defaults, retention periods | **APPROVED** | 13 September 2026 |
| Architecture | Tenant selection, role sourcing, ownership atomicity, migration safety | *pending* | |
| Testing / release | Isolation matrix, purge jobs, anonymization completeness, migration round-trip | *pending* | |

Wave P2-P1 must not be assigned until architecture and testing sign-off are
recorded above.
