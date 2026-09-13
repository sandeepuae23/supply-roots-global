# Phase 2 — Sequential gate P2-S1: Ownership contract

| Field | Value |
| --- | --- |
| Phase | 2 — Profiles, companies, sessions, preferences and privacy |
| Gate | P2-S1 (contract) — must be approved before wave P2-P1 is assigned |
| Depends on | Phase 1 (`804558d`) |
| Status | **DRAFT — awaiting approval** |

This resolves the five decisions the task breakdown requires before parallel
work begins. It is written against what Phase 1 actually built, not against a
clean slate.

## 0. What Phase 1 already established

Phase 2 extends these; it must not redefine them.

- `business_clients` and `vendors` exist, each with a **1:1 `user_id`** to the
  registering user, plus `company_name`, `contact_name`, `phone`, `country`
  (and `supply_categories` on vendors).
- Roles already seeded: `BUYER_OWNER`, `BUYER_MEMBER`, `VENDOR_OWNER`,
  `VENDOR_MEMBER`, plus the admin-side roles.
- `refresh_tokens` already stores `family_id`, `ip_address`, `user_agent`,
  `issued_at`, `expires_at`, `revoked_at`, `revoked_reason`, `auth_version`.

### Decision 0.1 — the 1:1 registration link must become 1:N membership

Today a company is reachable only through the single user who registered it.
Phase 2 introduces teams, so company identity must move up a level.

**Contract:** introduce `companies` as the canonical company row.
`business_clients` and `vendors` become **type-specific profile extensions**
keyed by `company_id`, not by `user_id`. The registering user becomes the first
`company_members` row with role `*_OWNER`. Migration `0003` backfills one
`companies` row and one owner membership per existing `business_clients` /
`vendors` row, then drops the direct `user_id` link.

This is the single highest-risk change in Phase 2. It must land in `DB-SCHEMA`
before any lane builds against company identity.

## 1. Company ownership and member permission rules

- A company has **exactly one OWNER** at all times. Ownership transfers are an
  explicit action, never implicit; the last owner cannot leave or be removed.
- `company_members` is the **sole** authority for access: `(company_id, user_id)`
  unique, carrying `role`, `status`, `invited_by`, `joined_at`.
- Member capability set, scoped to the member's own company only:

| Capability | OWNER | ADMIN_MEMBER | MEMBER | VIEWER |
| --- | --- | --- | --- | --- |
| View company profile | yes | yes | yes | yes |
| Edit company profile, addresses, contacts | yes | yes | no | no |
| Manage facilities / sourcing locations (vendor) | yes | yes | no | no |
| Invite / remove members | yes | yes | no | no |
| Change a member's role | yes | no | no | no |
| Transfer ownership | yes | no | no | no |
| Request account deletion | yes | no | no | no |
| Upload company documents | yes | yes | yes | no |

- A member may never grant a role above their own.
- Permission names follow the Phase 1 convention (`resource.action`):
  `company.read`, `company.update`, `company.members.invite`,
  `company.members.remove`, `company.members.set_role`,
  `company.ownership.transfer`, `company.documents.upload`,
  `company.addresses.manage`, `company.facilities.manage`.

### Decision 1.1 — isolation is enforced in the query, not after it

Every company-scoped query **must** filter by the caller's `company_id` in the
`WHERE` clause. Loading a row and then comparing ownership is prohibited: it
leaks existence through timing and through the difference between 403 and 404.

**A cross-company request returns 404, never 403** — a 403 confirms the
resource exists. This differs from the Phase 1 admin endpoints, which correctly
return 403, because admins are authorised to know an account exists.

## 2. Buyer and Vendor profile differences

Shared on `companies`: legal name, trading name, registration/licence number,
tax id, country, website, primary contact, status, timestamps.

| Concern | Buyer (`business_clients`) | Vendor (`vendors`) |
| --- | --- | --- |
| Purpose | Receives goods | Supplies goods |
| Distinct fields | Delivery addresses, preferred incoterms, buying categories, annual volume band | `supply_categories` (exists), facilities, warehouses, sourcing locations, certifications, capacity |
| Address roles | `BILLING`, `DELIVERY` | `BILLING`, `PICKUP`, `WAREHOUSE` |
| Required before approval | Billing address + one contact | Billing address + one contact + **one facility** |

- A user's `user_type` (Phase 1) fixes which profile extension may exist. A
  `BUYER` account may never hold a vendor profile. Enforced by a DB constraint,
  not only in the service layer.
- `vendor_facilities` and `vendor_sourcing_locations` are **child rows of the
  company**, never of a user, so they survive membership changes.

## 3. Supported preference values

Validated against the Phase 1 settings allowlists — **reject unknown values,
never silently fall back**.

- **Language:** `LEO_SUPPORTED_LANGUAGES` (`en, ar, fr, es, zh`). BCP-47.
- **Currency:** `LEO_SUPPORTED_CURRENCIES` (`AED, USD, EUR, GBP, INR, CNY`).
  ISO 4217. Display only in Phase 2 — it must not be read as a pricing currency
  until Phase 3 defines that.
- **Timezone:** IANA name validated against the runtime `zoneinfo` database.
  Default `LEO_DEFAULT_TIMEZONE` (`UTC`). Reject fixed offsets such as `GMT+4`.
- **Notification preferences:** a matrix of `(topic, channel, enabled)`, not a
  flat boolean set, so it extends without migration.
  - Channels: `EMAIL`, `IN_APP`, `WHATSAPP` (WhatsApp records the preference
    only; no delivery is implemented in Phase 2).
  - Topics: `ACCOUNT_SECURITY`, `COMPANY_REVIEW`, `ENQUIRY`, `QUOTATION`,
    `ORDER`, `DOCUMENT`, `SHIPMENT`, `MARKETING`.
  - **`ACCOUNT_SECURITY` on `EMAIL` cannot be disabled.** Lockouts, password
    changes and deletion decisions must always reach the account holder.
  - Default for `MARKETING` is **off** (opt-in); all others default on.

## 4. Session / device metadata and privacy retention

- The session list is **derived from `refresh_tokens`**, which already carries
  the needed metadata. Do not create a parallel session table. `user_devices`
  stores only a stable `device_id` plus a user-supplied label.
- Exposed per session: device label, browser/OS parsed from `user_agent`,
  **truncated** IP (last octet/hextet masked), city-level location if available,
  `issued_at`, `last_seen_at`, and a `current` flag.
- **Never exposed:** `token_hash`, `family_id`, full `user_agent`, full IP.
- A user may revoke **only their own** sessions. Revocation is immediate:
  revoke the whole token family and bump `auth_version`, reusing the Phase 1
  mechanism. Revoking the current session behaves as logout.
- Retention: `refresh_tokens` purged **90 days** after `expires_at` or
  `revoked_at`. `login_attempts` retained **180 days**. Audit records are
  **never** purged by this policy — see section 5.

## 5. Deletion request states and anonymization boundaries

States: `REQUESTED` to `UNDER_REVIEW` to `APPROVED` or `REJECTED`;
`APPROVED` to `RETENTION_HOLD` to `ANONYMIZED`; plus `CANCELLED` (by the
requester, before a decision).

- One active request per user; a duplicate is rejected with `409`.
- Only a company `OWNER` may request company deletion; any user may request
  deletion of their own personal account.
- Every transition requires an administrator reason and writes an audit record,
  matching the Phase 1 admin-action pattern.

### Decision 5.1 — anonymize, never delete

Trade records, audit history and status history are **retained**. Deletion
anonymizes the natural person and severs the link; it does not remove
transactional truth.

| Data | On anonymization |
| --- | --- |
| `users.email`, `username`, `phone`, `contact_name` | Replaced with a non-reversible tombstone (`deleted-user-<uuid>`) |
| `password_hash`, `refresh_tokens`, `user_devices` | Deleted; all sessions revoked |
| `user_profiles`, `user_preferences`, `notification_preferences` | Deleted |
| `privacy_consents` | **Retained** — proof of consent is itself the legal record |
| `audit_logs`, `status_history`, `login_attempts` | **Retained**, actor id preserved as the tombstone |
| Company rows, orders, quotations, documents | **Retained** — a company outlives its members |

- A company is never anonymized while it has non-terminal trade records. The
  request moves to `RETENTION_HOLD` with the blocking reason recorded.
- Anonymization is **irreversible** and requires explicit administrator
  confirmation separate from approval.

## 6. Contract for the parallel wave

Fixed before P2-P1 is assigned; a lane needing a change must return to this gate.

- **Route prefixes:** `/api/v1/companies`, `/api/v1/companies/{company_id}/...`,
  `/api/v1/me/profile`, `/api/v1/me/preferences`, `/api/v1/me/sessions`,
  `/api/v1/me/consents`, `/api/v1/me/deletion-request`,
  `/api/v1/admin/companies`, `/api/v1/admin/deletion-requests`.
- `/me/*` never takes a user id in the path — the subject is always the token.
- **Error codes** extend the Phase 1 envelope
  (`{error:{code,message,request_id}}`): `company_not_found`, `not_a_member`,
  `insufficient_company_role`, `last_owner_cannot_leave`,
  `duplicate_deletion_request`, `unsupported_preference_value`,
  `session_not_owned`.
- **`DB-SCHEMA` owns migration `0003` alone** and commits a single head. Other
  lanes submit model proposals; CI already asserts `alembic heads == 1`.
- Typed client is regenerated at gate P2-S2 only, after OpenAPI is published.

## Open questions for approval

1. **Does a user belong to more than one company?** This contract assumes
   **yes** (`company_members` is many-to-many) because staff move between
   trading entities. If a user is restricted to one company, say so now — it
   changes every isolation check and the Decision 0.1 migration.
2. **Is `MEMBER` the right default for an invite**, or should invitees start as
   `VIEWER` and be promoted?
3. **Is 90-day session / 180-day login-attempt retention acceptable**, or is
   there a jurisdictional requirement (UAE/EU) that sets a different figure?
