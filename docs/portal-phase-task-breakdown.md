# Leo Infinity Trade Portal — Phase Task Breakdown

| Document field | Value |
| --- | --- |
| Version | 1.0 |
| Date | 12 September 2026 |
| Status | Approved multi-agent plan — implementation not started |
| Parent roadmap | [Portal Backend Roadmap](./portal-backend-roadmap.md) |
| Portals | Administrator, Business Client, Vendor |
| Stack | TanStack React, FastAPI, SQLAlchemy, Alembic, PostgreSQL |

## Delivery sequence

```text
Phase 0  Foundation
   ↓
Phase 1  Authentication, approval and RBAC
   ↓
Phase 2  Companies, profiles, sessions and privacy
   ↓
Phase 3  Products, availability, inventory and pricing
   ↓
Phase 4  Enquiries, sourcing, vendor offers and quotations
   ↓
Phase 5  Orders, quality, samples, documents and certificates
   ↓
Phase 6  Logistics, cold chain, finance and communications
   ↓
Phase 7  Content, reports, analytics and system settings
   ↓
Phase 8  Security hardening, acceptance and production launch
```

Phases must pass their exit gate before dependent work is released. Frontend, backend, database and testing tasks within a phase can proceed in parallel after contracts and schemas are agreed.

## Phase 0 — Project foundation

**Goal:** Establish a repeatable local, test and deployment environment.

**Depends on:** Approved roadmap.

### Architecture and contracts

- [ ] Confirm API base path `/api/v1`.
- [ ] Confirm same-site production routing between frontend and API.
- [ ] Define standard success, validation, authorization and conflict responses.
- [ ] Define UUID, UTC timestamp, pagination, filtering and sorting conventions.
- [ ] Define request/correlation ID and audit metadata format.
- [ ] Record supported languages, currencies, timezones and file limits.

### Frontend

- [ ] Add environment-based API URL configuration.
- [ ] Add generated or typed API-client foundation.
- [ ] Add global API error handling.
- [ ] Add authentication state and protected-route foundation.
- [ ] Add Admin, Buyer and Vendor layout shells without business screens.

### Backend

- [ ] Create the `backend/` FastAPI project.
- [ ] Configure Pydantic settings and environment validation.
- [ ] Configure async SQLAlchemy sessions.
- [ ] Configure Alembic.
- [ ] Add structured logging and request IDs.
- [ ] Add `/health/live` and `/health/ready`.
- [ ] Add OpenAPI metadata and versioning.
- [ ] Add administrator bootstrap command.

### PostgreSQL and infrastructure

- [ ] Add PostgreSQL 16 service.
- [ ] Add API service to Docker Compose.
- [ ] Add backend Dockerfile and health checks.
- [ ] Create development and test databases.
- [ ] Configure connection pooling and migration execution.
- [ ] Configure secret placeholders without committing credentials.

### Tests and automation

- [ ] Configure Ruff, mypy, Pytest and coverage.
- [ ] Add migration upgrade/downgrade checks.
- [ ] Add OpenAPI contract validation.
- [ ] Add frontend type check, lint and build checks.
- [ ] Add backend and container CI jobs.

### Phase 0 exit gate

- [ ] Fresh checkout starts frontend, API and PostgreSQL using documented commands.
- [ ] Health and readiness checks pass.
- [ ] Empty PostgreSQL database migrates to head and rolls back one revision.
- [ ] Frontend can call a versioned health endpoint.
- [ ] CI passes without default passwords or signing keys.

## Phase 1 — Authentication, account approval and RBAC

**Goal:** Deliver secure registration and administrator-controlled access.

**Depends on:** Phase 0.

### Frontend

- [ ] Create Buyer registration page.
- [ ] Create Vendor registration page.
- [ ] Create login page.
- [ ] Create pending, rejected, locked, suspended and disabled status pages.
- [ ] Create forced temporary-password change page.
- [ ] Add role-aware route guards and navigation.
- [ ] Create Admin account dashboard cards.
- [ ] Create Admin user list with type, company, username and status filters.
- [ ] Create Admin user detail, login-attempt and status-history views.
- [ ] Add approve, reject, lock, unlock, suspend, reactivate, disable and password-reset dialogs.
- [ ] Require a reason in every administrator action dialog.
- [ ] Display generated temporary password once with secure copy guidance.

### Backend

- [ ] Implement Buyer and Vendor registration.
- [ ] Prevent public Admin registration.
- [ ] Normalize username and email.
- [ ] Hash passwords with Argon2id.
- [ ] Implement account status transition service.
- [ ] Implement transactional login with `SELECT ... FOR UPDATE`.
- [ ] Lock account on the third consecutive incorrect password.
- [ ] Reset failed attempts after successful active-account login.
- [ ] Use dummy Argon2id verification for unknown identifiers.
- [ ] Issue short-lived access tokens.
- [ ] Implement refresh-token families and rotation.
- [ ] Detect refresh-token reuse and revoke the family.
- [ ] Implement logout, logout-all and current-user endpoints.
- [ ] Implement administrator approval and account-control endpoints.
- [ ] Implement administrator temporary-password reset.
- [ ] Restrict forced-change sessions to password change and logout.
- [ ] Increment `auth_version` on security-sensitive actions.
- [ ] Require current status and matching `auth_version` on protected requests.
- [ ] Add permission dependencies and resource authorization foundation.

### PostgreSQL

- [ ] Create account and user-type enums or constrained values.
- [ ] Create `users`.
- [ ] Create `roles` and `permissions`.
- [ ] Create `role_permissions` and `user_roles`.
- [ ] Create `login_attempts`.
- [ ] Create `refresh_tokens` with family, parent and replacement relationships.
- [ ] Create `password_history`.
- [ ] Create `account_status_history`.
- [ ] Create append-only `admin_audit_logs`.
- [ ] Add case-insensitive unique identity indexes.
- [ ] Add status, user-type, history and token indexes.
- [ ] Seed operational and portal roles.

### Tests

- [ ] Registration creates `PENDING_APPROVAL` atomically.
- [ ] Concurrent case-insensitive duplicate registrations create one account.
- [ ] Public registration cannot create an administrator.
- [ ] Every non-active status is denied normal login.
- [ ] Three sequential incorrect passwords lock the account.
- [ ] Repeated PostgreSQL concurrency tests prove simultaneous failures cannot bypass locking.
- [ ] Successful login resets the failed-attempt counter.
- [ ] Every valid and invalid status transition is tested.
- [ ] Every administrator action records actor, reason, timestamp and target.
- [ ] Reset password does not approve, reactivate or unlock an account.
- [ ] Temporary password is returned once and never stored or logged.
- [ ] Simultaneous refresh requests allow exactly one rotation.
- [ ] Refresh replay revokes the token family.
- [ ] Unauthenticated, wrong-role, expired, revoked and stale-version tokens are denied.

### Phase 1 exit gate

- [ ] Buyer and Vendor can register but cannot log in before approval.
- [ ] Administrator can manage the complete account lifecycle.
- [ ] Third failed login locks exactly once under concurrency.
- [ ] Locked users require a separate administrator unlock.
- [ ] Reset users must change their temporary password.
- [ ] Authentication/account service coverage is at least 90%.
- [ ] Security and audit test suites pass.

## Phase 2 — Profiles, companies, sessions, preferences and privacy

**Goal:** Complete company onboarding and account self-management.

**Depends on:** Phase 1.

### Frontend

- [ ] Create personal profile screen.
- [ ] Create Buyer company and delivery profiles.
- [ ] Create Vendor company, facility, warehouse and sourcing-location profiles.
- [ ] Create team member and permission screens.
- [ ] Create language, currency and timezone settings.
- [ ] Create notification preferences.
- [ ] Create active sessions and devices screen.
- [ ] Add revoke-session and logout-all actions.
- [ ] Create privacy consent history.
- [ ] Create account deletion request and status screens.
- [ ] Create Admin company review and deletion-request queues.

### Backend

- [ ] Implement personal profile services.
- [ ] Implement Buyer and Vendor company services.
- [ ] Implement addresses, contacts, facilities and sourcing locations.
- [ ] Implement company membership and owner/member permissions.
- [ ] Implement locale and notification preference services.
- [ ] Implement session/device listing and revocation.
- [ ] Implement append-only consent versions and withdrawal records.
- [ ] Implement deletion request, review, hold and anonymization workflow.
- [ ] Enforce company ownership on every company resource.

### PostgreSQL

- [ ] Create `companies`, `business_clients` and `vendors`.
- [ ] Create `company_members`.
- [ ] Create `company_addresses` and `company_contacts`.
- [ ] Create `company_documents`.
- [ ] Create `vendor_facilities` and `vendor_sourcing_locations`.
- [ ] Create `user_profiles`.
- [ ] Create `user_preferences` and `notification_preferences`.
- [ ] Create `user_devices`.
- [ ] Create `privacy_consents`.
- [ ] Create `account_deletion_requests`.

### Tests

- [ ] Buyer and Vendor profile validations match their account type.
- [ ] Company owners can manage permitted members only.
- [ ] Cross-company and identifier-substitution attempts are denied.
- [ ] Language, currency and timezone values are validated.
- [ ] Notification channels and topics persist correctly.
- [ ] Users can revoke only their own sessions.
- [ ] Consent grant and withdrawal remain historically visible.
- [ ] Duplicate active deletion requests are rejected.
- [ ] Deletion decisions and retention holds are audited.

### Phase 2 exit gate

- [ ] Buyer and Vendor onboarding flows are complete.
- [ ] Company isolation matrix passes for every protected endpoint.
- [ ] Session revocation works immediately.
- [ ] Preferences and consent history are reliable.
- [ ] Deletion workflow preserves legally retained trade and audit records.

## Phase 3 — Product catalog, vendor capabilities, availability, inventory and pricing

**Goal:** Establish the supply catalog used by sourcing and quotations.

**Depends on:** Phase 2.

### Frontend

- [ ] Create Admin category and product manager.
- [ ] Add specifications, grades, varieties, origins, packaging and media editors.
- [ ] Create Buyer catalog, search, filters, comparison and favorites.
- [ ] Create Vendor capability and product submission screens.
- [ ] Create Vendor seasonal availability calendar.
- [ ] Create warehouse and inventory screens.
- [ ] Create Vendor price-list upload/editor.
- [ ] Create Admin price and margin review workspace.

### Backend

- [ ] Implement catalog publishing and versioning.
- [ ] Implement product search and filters.
- [ ] Implement buyer favorites.
- [ ] Implement vendor capability review.
- [ ] Implement availability, capacity, reservation and inventory services.
- [ ] Implement versioned price lists, currencies and validity periods.
- [ ] Implement freight/insurance cost and margin authorization foundation.

### PostgreSQL

- [ ] Create product/category/specification/image tables.
- [ ] Create packaging options and product-market attributes.
- [ ] Create vendor-product capabilities.
- [ ] Create availability and seasonal windows.
- [ ] Create warehouses, inventory positions, movements and reservations.
- [ ] Create vendor price lists and price items.
- [ ] Create favorites.

### Tests and exit gate

- [ ] Only published products appear to Buyers.
- [ ] Vendors can change only their own capabilities, availability and prices.
- [ ] Historical specifications and prices remain traceable.
- [ ] Inventory reservation concurrency cannot oversell available quantity.
- [ ] Catalog, capability, availability and pricing acceptance tests pass.

## Phase 4 — Enquiries, sourcing, vendor offers and Buyer quotations

**Goal:** Deliver the core commercial workflow from demand to accepted quotation.

**Depends on:** Phase 3.

### Frontend

- [ ] Connect the existing quote builder to authenticated Buyer accounts.
- [ ] Create Buyer enquiry list, detail and revision history.
- [ ] Create Admin enquiry inbox and assignment workspace.
- [ ] Create Admin vendor-selection and sourcing-request screens.
- [ ] Create Vendor opportunity inbox and offer editor.
- [ ] Create Admin vendor-offer comparison.
- [ ] Create Admin Buyer quotation composer.
- [ ] Create Buyer quotation review, accept, reject and change-request screens.

### Backend

- [ ] Implement multi-product enquiries and attachments.
- [ ] Implement reference numbers and idempotent submission.
- [ ] Implement assignment and sourcing requests.
- [ ] Implement eligible-vendor selection.
- [ ] Implement immutable vendor-offer versions.
- [ ] Implement offer comparison without Buyer exposure.
- [ ] Implement Buyer quotation versions, costing, approval and expiry.
- [ ] Implement Buyer decisions and revision loop.
- [ ] Add configurable email, CRM, WhatsApp and webhook adapters.

### PostgreSQL

- [ ] Create enquiry, item, attachment and history tables.
- [ ] Create sourcing request and vendor-recipient tables.
- [ ] Create vendor offer, item and version tables.
- [ ] Create quotation, item, version, approval and decision tables.
- [ ] Create reference sequences and idempotency records.

### Tests and exit gate

- [ ] Buyer can access only their company's enquiries and quotations.
- [ ] Vendor cannot see competing offers or another vendor's request.
- [ ] Buyer never sees vendor cost or internal margin.
- [ ] Duplicate submissions cannot create duplicate enquiries or decisions.
- [ ] Accepted quotation version is immutable and ready for order conversion.

## Phase 5 — Orders, quality, samples, documents and certificates

**Goal:** Convert accepted trade terms into a controlled fulfilment record.

**Depends on:** Phase 4.

### Frontend

- [ ] Create Admin order workspace and milestone timeline.
- [ ] Create Buyer order tracking and reorder screens.
- [ ] Create Vendor production/packing milestone workspace.
- [ ] Connect the existing quality brief to authenticated orders.
- [ ] Create sample, inspection, laboratory and acceptance screens.
- [ ] Create non-conformance, quality claim and corrective-action screens.
- [ ] Create role-based document centre.
- [ ] Add certificate issuer, date, expiry, scope and verification views.

### Backend

- [ ] Convert accepted quotation to sales and purchase orders atomically.
- [ ] Implement order items, milestones and state history.
- [ ] Implement quality requirements and custom limits.
- [ ] Implement sample and inspection workflows.
- [ ] Implement laboratory requirements and results metadata.
- [ ] Implement non-conformance and corrective action.
- [ ] Implement secure document upload/download and versioning.
- [ ] Implement verification, visibility, expiry alerts and publishing approval.

### PostgreSQL

- [ ] Create order, item, milestone and history tables.
- [ ] Create quality requirement and test-limit tables.
- [ ] Create sample, inspection and checkpoint tables.
- [ ] Create laboratory requirement metadata.
- [ ] Create non-conformance and corrective-action tables.
- [ ] Create document, version, verification and certificate tables.
- [ ] Create object-storage metadata and access records.

### Tests and exit gate

- [ ] Order values match the accepted quotation version.
- [ ] Order conversion is idempotent.
- [ ] Quality decisions identify actor, criteria and evidence.
- [ ] Uploaders cannot self-verify without explicit permission.
- [ ] Replaced documents remain historically available to authorized roles.
- [ ] Unverified public evidence cannot be published.

## Phase 6 — Logistics, cold chain, finance and communications

**Goal:** Track physical delivery, financial progress and controlled communication.

**Depends on:** Phase 5.

### Frontend

- [ ] Create sea, air and land shipment workspace.
- [ ] Create route, carrier, port, container and pallet screens.
- [ ] Create shipment milestones and tracking timeline.
- [ ] Create packing, loading, seal and delivery evidence views.
- [ ] Create temperature logger and cold-chain charts.
- [ ] Create Admin finance dashboard.
- [ ] Create Buyer invoices, schedules, balances and payment-evidence views.
- [ ] Create Vendor invoice and payment-status views.
- [ ] Create Buyer/Vendor conversations and Admin internal notes.
- [ ] Create notification inbox and delivery-status views.

### Backend

- [ ] Implement shipment, route and milestone services.
- [ ] Implement external tracking-event ingestion.
- [ ] Implement container, pallet and evidence records.
- [ ] Implement logger import and excursion review.
- [ ] Implement proforma invoices and payment schedules.
- [ ] Implement payments, reconciliation, credit notes and refunds.
- [ ] Implement conversations, messages and internal notes.
- [ ] Implement notification templates, routing and delivery tracking.

### PostgreSQL

- [ ] Create shipment, route, milestone and tracking tables.
- [ ] Create container, pallet and loading-evidence tables.
- [ ] Create logger and temperature-reading tables.
- [ ] Create invoice, schedule, payment, credit-note and refund tables.
- [ ] Create conversation, member, message and internal-note tables.
- [ ] Create notification event and delivery tables.

### Tests and exit gate

- [ ] External roles never receive internal notes.
- [ ] Shipment visibility follows order/company ownership.
- [ ] Temperature data preserves source, unit, timestamp and timezone.
- [ ] Financial adjustments require authorization and an audit reason.
- [ ] Notification retries are idempotent and traceable.

## Phase 7 — Content, reports, analytics and system settings

**Goal:** Complete administration, publishing and operational intelligence.

**Depends on:** Phase 6 operational data; content work may begin after Phase 2.

### Frontend

- [ ] Create Admin page and content-block editor.
- [ ] Create media, market, FAQ, policy, testimonial and case-study screens.
- [ ] Create evidence verification and publishing queue.
- [ ] Create dashboards for conversion, sales, vendors, quality, delivery and documents.
- [ ] Create Buyer and Vendor company-scoped scorecards.
- [ ] Create CSV/PDF export history.
- [ ] Create system setting, reference, webhook, upload and retention screens.
- [ ] Create searchable audit and operational log views.

### Backend

- [ ] Implement draft, review and publish workflows.
- [ ] Require verified source, consent, scope and approval for public evidence.
- [ ] Implement authorized aggregates and report jobs.
- [ ] Implement expiring report downloads.
- [ ] Implement typed system settings.
- [ ] Implement reference-number configuration.
- [ ] Implement webhook retry and delivery history.
- [ ] Implement retention jobs and audit search.

### PostgreSQL

- [ ] Create content page, block and media tables.
- [ ] Create markets, testimonials, case studies and publishing approvals.
- [ ] Create report exports and optional materialized views.
- [ ] Create system settings, reference sequences and webhook tables.
- [ ] Add reporting and audit-search indexes.

### Tests and exit gate

- [ ] Unverified claims cannot enter a published state.
- [ ] Reports enforce the same company authorization as operational APIs.
- [ ] Export jobs are authorized, expiring and auditable.
- [ ] Sensitive settings never appear in API responses or logs.
- [ ] Content rollback and publishing history work correctly.

## Phase 8 — Hardening, acceptance and launch

**Goal:** Demonstrate security, resilience and production readiness.

**Depends on:** All release-scope modules.

### Security and reliability

- [ ] Complete threat model and abuse-case review.
- [ ] Complete dependency and container scanning.
- [ ] Complete penetration testing and remediation.
- [ ] Configure rate limits, CORS, trusted hosts and secure headers.
- [ ] Configure TLS and secure cookie policies.
- [ ] Configure secret and signing-key rotation.
- [ ] Configure file scanning, signed downloads and retention.
- [ ] Configure monitoring, metrics, tracing and alerting.
- [ ] Configure PostgreSQL backup and point-in-time recovery.
- [ ] Rehearse database restore and application rollback.

### Performance and acceptance

- [ ] Load-test login, refresh, catalog search, enquiries, offers and quotations.
- [ ] Repeat lockout and refresh concurrency tests under load.
- [ ] Complete Admin end-to-end acceptance journey.
- [ ] Complete Buyer end-to-end acceptance journey.
- [ ] Complete Vendor end-to-end acceptance journey.
- [ ] Verify tablet, mobile, keyboard and screen-reader workflows.
- [ ] Rehearse production migration and rollback.
- [ ] Approve support, incident and recovery runbooks.

### Phase 8 exit gate

- [ ] No unresolved critical or high-severity security findings.
- [ ] Backup restore meets agreed recovery objectives.
- [ ] Production secrets are external, restricted and rotatable.
- [ ] All release migrations and rollback steps are rehearsed.
- [ ] Admin, Buyer and Vendor acceptance tests pass in staging.
- [ ] Product, engineering, security and operations sign-off is recorded.

## Multi-agent execution plan

### Agent work lanes

| Lane | Responsibility | Owned paths or artifacts |
| --- | --- | --- |
| `FE-FOUNDATION` | Frontend session state, API client, shared protected-layout primitives and shared portal components | `src/lib/api/`, shared auth state, top-level protected route entries, shared navigation registry, `src/routeTree.gen.ts`, shared portal UI and frontend package/config scripts |
| `FE-ADMIN` | Administrator screens and workflows | `src/routes/admin/`, Admin-specific components and styles |
| `FE-BUYER` | Business Client screens and workflows | `src/routes/buyer/`, Buyer-specific components and styles |
| `FE-VENDOR` | Vendor screens and workflows | `src/routes/vendor/`, Vendor-specific components and styles |
| `BE-FOUNDATION` | FastAPI bootstrap, settings, middleware, shared errors and dependencies | `backend/app/core/`, `backend/app/api/`, `backend/app/main.py`, `backend/pyproject.toml`, `backend/Dockerfile` and backend environment template |
| `BE-IDENTITY` | Authentication, accounts, RBAC, sessions and privacy | `backend/app/modules/auth/`, `accounts/`, `companies/` |
| `BE-TRADE` | Catalog, enquiries, sourcing, offers, quotations and orders | `backend/app/modules/catalog/`, `enquiries/`, `quotations/`, `orders/` |
| `BE-OPERATIONS` | Quality, documents, logistics, finance, communication and content | Corresponding backend module directories |
| `DB-SCHEMA` | PostgreSQL models, constraints, indexes, migrations and seed data | `backend/app/db/`, `backend/alembic/`, every SQLAlchemy model file including module-local `models.py`, and schema decision records |
| `QA-SECURITY` | Contract, integration, concurrency, tenant isolation, security and release tests | `backend/tests/`, frontend integration tests and CI proposals/validation reports |
| `INTEGRATION` | Root/shared configuration, cross-lane merges, end-to-end wiring and phase sign-off | Root `docker-compose.yml`, root `.env.example`, root docs/scripts, CI workflow files and integration-only patches |

One person or agent may own several lanes, but a file must have one active owner at a time.

### Parallel and sequential rules

1. **Sequential contract gate:** API paths, request/response schemas, permission names, status transitions and database ownership are agreed first.
2. **Parallel implementation wave:** Frontend, backend, database and test agents work within assigned paths after the contract gate.
3. **Sequential database gate:** `DB-SCHEMA` creates and validates migrations. Other agents do not create competing Alembic heads.
4. **Sequential backend integration:** Backend modules are integrated against the migration head and OpenAPI is regenerated.
5. **Sequential typed-client gate:** after backend integration, `FE-FOUNDATION` generates, validates and commits the typed client. Admin, Buyer and Vendor API wiring begins only after this gate passes.
6. **Parallel verification wave:** each agent or CI worker receives a unique disposable PostgreSQL database or schema with migrations applied independently. Migration-chain, lockout, refresh-rotation, inventory-reservation and restore tests run serially whenever complete isolation cannot be guaranteed.
7. **Sequential release gate:** `INTEGRATION` and `QA-SECURITY` run migration, build, end-to-end and security checks before phase sign-off.

### Shared-file coordination rules

- Only `DB-SCHEMA` edits Alembic migration files during an active phase.
- Domain agents submit schema contracts and model proposals to `DB-SCHEMA`; they do not edit SQLAlchemy model files. `DB-SCHEMA` implements models and migrations, commits one migration head, and then domain agents integrate their services.
- Only `BE-FOUNDATION` edits shared backend configuration and global middleware.
- Only `FE-FOUNDATION` edits the generated API client, global auth provider, shared navigation registry, `src/routeTree.gen.ts` and protected layout contracts.
- `FE-FOUNDATION` owns only shared layout primitives and top-level route entries. `FE-ADMIN`, `FE-BUYER` and `FE-VENDOR` create and own their respective portal shells, routes and components.
- `INTEGRATION` is the sole editor of root Compose, environment, documentation/script and CI workflow files. Other lanes submit dependency or configuration proposals for the integration patch.
- Portal agents own only their Admin, Buyer or Vendor routes and components.
- Domain agents add exports through small integration patches after their isolated module is complete.
- Agents do not reformat unrelated files or overwrite another agent's uncommitted work.
- Database migrations are integrated in dependency order; parallel schema proposals are handed to `DB-SCHEMA` for one migration chain.
- OpenAPI is generated after backend integration and before frontend wiring.
- A failed sequential gate blocks the next wave but does not invalidate completed isolated work.

## Phase-by-phase agent waves

### Phase 0 agent waves — Foundation

#### Sequential gate P0-S1: Contract and repository boundaries

| Task | Owner | Output |
| --- | --- | --- |
| Freeze API version, error envelope, pagination, UTC and identifier rules | `BE-FOUNDATION` + `INTEGRATION` | API convention record |
| Define frontend/backend environment variables and proxy strategy | `FE-FOUNDATION` + `BE-FOUNDATION` | Environment contract |
| Define database naming, migration and seed rules | `DB-SCHEMA` | Schema convention record |
| Define CI commands and required checks | `QA-SECURITY` | Release-check matrix |

#### Parallel wave P0-P1

| Lane | Tasks | May run with |
| --- | --- | --- |
| Frontend | API configuration, error handling, auth-state interface and shared protected-layout primitives | Backend, database, QA |
| Backend | FastAPI scaffold, settings, middleware, health endpoints, OpenAPI metadata | Frontend, database, QA |
| Database | PostgreSQL configuration proposal, SQLAlchemy/Alembic foundation and empty baseline | Frontend, backend, QA |
| Portal frontends | Admin, Buyer and Vendor shell routes within their owned directories | Frontend foundation, backend, database, QA |
| QA | Ruff/mypy/Pytest/coverage setup, frontend checks and CI workflow proposal | Frontend, backend, database |

#### Sequential gate P0-S2: Integration

1. `INTEGRATION` applies the approved root Compose, environment and CI proposals.
2. `DB-SCHEMA` validates database readiness and migration commands.
3. `BE-FOUNDATION` connects FastAPI readiness to PostgreSQL.
4. `FE-FOUNDATION` connects the frontend health check to the API.
5. `QA-SECURITY` runs clean-checkout, migration, build and container checks.
6. `INTEGRATION` records Phase 0 sign-off.

### Phase 1 agent waves — Authentication and RBAC

#### Sequential gate P1-S1: Identity contract

| Task | Owner | Required decision |
| --- | --- | --- |
| Finalize account states and valid transitions | `BE-IDENTITY` + `QA-SECURITY` | Transition matrix and `409` cases |
| Finalize registration/login/token/reset schemas | `BE-IDENTITY` + `FE-FOUNDATION` | OpenAPI contract |
| Finalize roles and permission names | `BE-IDENTITY` + portal owners | Permission matrix |
| Finalize transactional lockout and refresh rotation | `BE-IDENTITY` + `DB-SCHEMA` | Locking and token-family design |

#### Parallel wave P1-P1

| Lane | Tasks | Owned result |
| --- | --- | --- |
| `DB-SCHEMA` | Users, roles, permissions, login attempts, refresh tokens, password history, status history, audit logs and seeds | One identity migration chain |
| `BE-IDENTITY` | Registration, Argon2id, login transaction, JWT access, refresh rotation, logout and forced password change | Auth/account services and routes |
| `FE-FOUNDATION` | Auth store, secure refresh behavior, protected routes and role-aware navigation | Shared authentication UI foundation |
| `FE-ADMIN` | User queues, filters, detail, action dialogs, status/login/audit timelines | Admin account-control UI |
| `FE-BUYER` | Buyer registration and account-status views | Buyer identity UI |
| `FE-VENDOR` | Vendor registration and account-status views | Vendor identity UI |
| `QA-SECURITY` | Registration, lifecycle, lockout, refresh, reset and RBAC tests | Identity test suite |

#### Sequential gate P1-S2: Database and backend integration

1. `DB-SCHEMA` migrates PostgreSQL and seeds permissions.
2. `BE-IDENTITY` runs services against the migration head.
3. `QA-SECURITY` runs sequential and concurrent lockout tests.
4. `QA-SECURITY` runs simultaneous refresh-token rotation tests.
5. `BE-FOUNDATION` publishes the stable Phase 1 OpenAPI document.

#### Sequential gate P1-S2b: Typed client

1. `FE-FOUNDATION` generates the typed API client from the stable OpenAPI document.
2. `QA-SECURITY` validates that generated types and endpoint contracts match the backend.
3. `FE-FOUNDATION` commits the client before portal API wiring begins.

#### Parallel wave P1-P2: Frontend wiring

- `FE-ADMIN` connects account lists and actions.
- `FE-BUYER` connects registration, login and status pages.
- `FE-VENDOR` connects registration, login and status pages.
- `QA-SECURITY` runs role and status browser/API acceptance cases.

#### Sequential gate P1-S3: Sign-off

1. Verify the third failed login locks exactly once.
2. Verify reset does not unlock, reactivate or approve.
3. Verify every admin action requires and stores a reason.
4. Verify stale sessions and tokens are invalidated.
5. Verify the endpoint permission matrix.
6. Record frontend, backend, database and security approval.

### Phase 2 agent waves — Companies, profiles, sessions and privacy

#### Sequential gate P2-S1: Ownership contract

- Define company ownership and member permission rules.
- Define Buyer and Vendor profile differences.
- Define supported preference values.
- Define session/device metadata and privacy retention rules.
- Define deletion request states and anonymization boundaries.

#### Parallel wave P2-P1

| Lane | Tasks |
| --- | --- |
| `DB-SCHEMA` | Company, profile, member, contact, address, facility, preference, device, consent and deletion tables |
| `BE-IDENTITY` | Company/profile CRUD, membership, settings, sessions, consent and deletion services |
| `FE-ADMIN` | Company-review and deletion-request queues |
| `FE-BUYER` | Buyer company, delivery, team, preferences, sessions and privacy screens |
| `FE-VENDOR` | Vendor company, facility, warehouse, sourcing, team, preferences, sessions and privacy screens |
| `QA-SECURITY` | Field validation, tenant isolation, session ownership, consent history and deletion tests |

#### Sequential gate P2-S2: Integration and sign-off

1. Apply and validate Phase 2 migrations.
2. Integrate company services and publish OpenAPI.
3. `FE-FOUNDATION` generates, validates and commits the shared typed client.
4. Connect portal screens in parallel.
5. Run the endpoint-level tenant-isolation matrix.
6. Run cumulative Phase 0–2 migration, authentication, RBAC and OpenAPI regression suites.
7. Record Phase 2 sign-off.

### Phase 3 agent waves — Catalog, availability, inventory and pricing

#### Sequential gate P3-S1: Catalog contract

- Agree product, specification, packaging and publishing schemas.
- Agree Vendor capability and approval boundaries.
- Agree availability, inventory reservation and price version rules.
- Agree which price/cost fields are Admin-only.

#### Parallel wave P3-P1

| Lane | Tasks |
| --- | --- |
| `DB-SCHEMA` | Catalog, specification, media, capability, availability, warehouse, inventory, reservation, favorite and price-list schema |
| `BE-TRADE` | Catalog, search, publishing, favorites, capabilities, availability, reservations and pricing services |
| `FE-ADMIN` | Category/product editor, publishing, availability and pricing review |
| `FE-BUYER` | Search, filters, comparison, favorites, specifications and availability |
| `FE-VENDOR` | Capabilities, seasonal calendar, inventory and price lists |
| `QA-SECURITY` | Visibility, ownership, versioning and inventory-concurrency tests |

#### Sequential gate P3-S2: Integration and sign-off

1. Integrate the catalog migration chain.
2. Run inventory reservation concurrency tests.
3. Publish the stable OpenAPI document.
4. `FE-FOUNDATION` generates, validates and commits the typed client.
5. Wire the three portal workspaces in parallel.
6. Verify price and internal-cost field isolation.
7. Run cumulative Phase 0–3 migration, authentication, RBAC and OpenAPI regression suites.
8. Record Phase 3 sign-off.

### Phase 4 agent waves — Enquiries, sourcing, offers and quotations

#### Sequential gate P4-S1: Commercial workflow contract

- Freeze enquiry, sourcing, offer, quotation and decision states.
- Freeze versioning, validity, currency, Incoterm and idempotency rules.
- Define Buyer-visible, Vendor-visible and Admin-only fields.
- Define external email/CRM/WhatsApp/webhook adapter boundaries.

#### Parallel wave P4-P1

| Lane | Tasks |
| --- | --- |
| `DB-SCHEMA` | Enquiry, sourcing, offer, quote, version, decision, attachment, reference and idempotency tables |
| `BE-TRADE` | Enquiry, assignment, sourcing, offer, comparison, quotation and decision services |
| `BE-OPERATIONS` | Message/webhook adapter interfaces and delivery records |
| `FE-ADMIN` | Enquiry inbox, assignment, vendor selection, offer comparison and quote composer |
| `FE-BUYER` | Enquiry wizard/history and quotation decision screens |
| `FE-VENDOR` | Opportunity inbox, specification review and offer editor |
| `QA-SECURITY` | Versioning, hidden-cost, idempotency, authorization and workflow tests |

#### Sequential gate P4-S2: Workflow integration

1. Apply Phase 4 migrations.
2. Integrate enquiry before sourcing, sourcing before offer, and offer before quotation services.
3. Publish the stable OpenAPI document.
4. `FE-FOUNDATION` generates, validates and commits the typed client.
5. Connect Admin, Buyer and Vendor screens in parallel.
6. Execute the complete enquiry-to-accepted-quote journey.
7. Run cumulative Phase 0–4 migration, authentication, RBAC and OpenAPI regression suites.
8. Record Phase 4 sign-off.

### Phase 5 agent waves — Orders, quality and documents

#### Sequential gate P5-S1: Fulfilment contract

- Freeze quote-to-order conversion and order state rules.
- Freeze quality requirement, inspection, test and decision schemas.
- Freeze document visibility, version, verification and publication rules.
- Define object-storage and malware-scan states.

#### Parallel wave P5-P1

| Lane | Tasks |
| --- | --- |
| `DB-SCHEMA` | Order, milestone, quality, sample, inspection, laboratory, incident, document and certificate schema |
| `BE-TRADE` | Quote-to-order conversion, purchase/sales order and milestone services |
| `BE-OPERATIONS` | Quality, sample, inspection, test, incident, document and certificate services |
| `FE-ADMIN` | Order, quality-review, document-verification and certificate workspaces |
| `FE-BUYER` | Orders, reorder, quality requirements, samples, claims and document centre |
| `FE-VENDOR` | Production, packing, quality response, lot/batch, evidence and corrective-action screens |
| `QA-SECURITY` | Conversion, decision, upload, version, verification and publication tests |

#### Sequential gate P5-S2: Integration

1. Apply Phase 5 migrations.
2. Integrate order conversion before downstream quality/documents.
3. Integrate object storage and file scanning before enabling downloads.
4. Publish the stable OpenAPI document.
5. `FE-FOUNDATION` generates, validates and commits the typed client.
6. Connect the three portal workspaces in parallel.
7. Run accepted-quote-to-controlled-order end-to-end tests.
8. Run cumulative Phase 0–5 migration, authentication, RBAC and OpenAPI regression suites.
9. Record Phase 5 sign-off.

### Phase 6 agent waves — Logistics, finance and communication

#### Sequential gate P6-S1: Operational contract

- Freeze shipment, tracking, cold-chain and excursion states.
- Freeze invoice, payment, adjustment and reconciliation states.
- Freeze conversation visibility and internal-note boundaries.
- Define external carrier and notification adapter contracts.

#### Parallel wave P6-P1

| Lane | Tasks |
| --- | --- |
| `DB-SCHEMA` | Shipment, tracking, container, pallet, temperature, invoice, payment, conversation and notification schema |
| `BE-OPERATIONS-A` | Logistics, carrier tracking, evidence and cold-chain services |
| `BE-OPERATIONS-B` | Finance, reconciliation, conversation and notification services |
| `FE-ADMIN` | Logistics, finance, internal note and delivery-monitoring screens |
| `FE-BUYER` | Shipment, cold-chain, invoice, payment and conversation screens |
| `FE-VENDOR` | Shipment updates, evidence, invoice and conversation screens |
| `QA-SECURITY` | Visibility, financial authorization, temperature integrity and delivery idempotency tests |

`BE-OPERATIONS-A` and `BE-OPERATIONS-B` must own different module directories. If only one backend agent is available, complete logistics first and finance/communication second.

#### Sequential gate P6-S2: Integration and sign-off

1. Apply the migration chain.
2. Integrate shipment/order relationships and invoice/order relationships.
3. Publish the stable OpenAPI document.
4. `FE-FOUNDATION` generates, validates and commits the typed client.
5. Connect portal screens in parallel.
6. Verify internal notes and internal financial fields never reach external roles.
7. Execute order-to-delivery-and-payment acceptance tests.
8. Run cumulative Phase 0–6 migration, authentication, RBAC and OpenAPI regression suites.
9. Record Phase 6 sign-off.

### Phase 7 agent waves — Content, analytics and settings

#### Sequential gate P7-S1: Publishing and reporting contract

- Define content review/publish permissions.
- Define evidence verification requirements.
- Define report measures, filters and tenant scopes.
- Define settings ownership, encryption and secret references.

#### Parallel wave P7-P1

| Lane | Tasks |
| --- | --- |
| `DB-SCHEMA` | Content, media, evidence approval, report export, settings, reference and webhook schema |
| `BE-OPERATIONS-A` | Content, evidence and media services |
| `BE-OPERATIONS-B` | Reporting, export, settings and webhook services |
| `FE-ADMIN` | CMS, evidence queue, reports, settings, webhook and audit screens |
| `FE-BUYER` | Company-scoped reports and export history |
| `FE-VENDOR` | Performance scorecard and export history |
| `QA-SECURITY` | Publishing, report scope, secret redaction, export and webhook tests |

#### Sequential gate P7-S2: Integration and sign-off

1. Apply Phase 7 migrations.
2. Integrate background jobs and secure export storage.
3. Publish the stable OpenAPI document.
4. `FE-FOUNDATION` generates, validates and commits the typed client.
5. Connect reporting and content screens in parallel.
6. Verify no unverified evidence can be published.
7. Verify reports cannot cross company boundaries.
8. Run cumulative Phase 0–7 migration, authentication, RBAC and OpenAPI regression suites.
9. Record Phase 7 sign-off.

### Phase 8 agent waves — Hardening and launch

#### Sequential gate P8-S0: Freeze and isolate

1. Freeze the release candidate and migration head before rehearsal work begins.
2. Provision separate disposable application/database environments for load testing, restore testing and migration rehearsal.
3. Take and identify the backup artifact used for restore testing.
4. Confirm that no parallel agent will mutate the final staging environment during the verification wave.

#### Parallel wave P8-P1

| Lane | Tasks |
| --- | --- |
| Frontend agents | Accessibility, responsive behavior, error recovery and performance |
| Backend agents | Rate limiting, secure headers, trusted hosts, observability and performance |
| `DB-SCHEMA` | Index review, query plans, backups, point-in-time recovery and restore rehearsal in its dedicated disposable environment |
| `QA-SECURITY` | Threat tests, penetration findings, load tests, full regression and acceptance |
| `INTEGRATION` | Migration rehearsal in a separate disposable environment, rollback plan and runbooks |

#### Sequential gate P8-S1: Production approval

1. Confirm parallel disposable-environment checks completed without changing final staging.
2. Deploy the frozen release candidate to final staging.
3. Run the final staging migration, restore verification and rollback rehearsal sequentially.
4. Run full frontend, backend, migration, authentication, RBAC and OpenAPI CI.
5. Run Admin, Buyer and Vendor end-to-end acceptance.
6. Resolve critical and high-severity findings.
7. Obtain product, frontend, backend, database, security and operations sign-off.
8. Schedule production release and rollback window.

## Recommended agent allocation by team size

### Four-agent team

| Agent | Primary lanes |
| --- | --- |
| Agent 1 | `FE-FOUNDATION`, then integration |
| Agent 2 | Active portal frontend: Admin, Buyer or Vendor by phase |
| Agent 3 | Backend domain implementation |
| Agent 4 | Database migrations plus QA/security review; serialize migration and test work |

### Six-agent team

| Agent | Primary lanes |
| --- | --- |
| Agent 1 | `FE-FOUNDATION` and shared components |
| Agent 2 | `FE-ADMIN` |
| Agent 3 | `FE-BUYER` and `FE-VENDOR` |
| Agent 4 | Backend foundation/identity or active backend domain |
| Agent 5 | `DB-SCHEMA` |
| Agent 6 | `QA-SECURITY` and integration coordination |

### Eight-or-more-agent team

- Assign separate Admin, Buyer and Vendor frontend owners.
- Assign separate identity, trade and operations backend owners.
- Keep one database migration owner even when several agents propose models.
- Keep one integration owner and one independent security/test reviewer.
- Split work only by module directory and stable API contract, never by editing the same file concurrently.

## Agent handoff checklist

Every agent handoff must include:

- [ ] Task and phase identifier.
- [ ] Owned files and files intentionally untouched.
- [ ] API or schema contract used.
- [ ] Migrations required or proposed.
- [ ] Permission and company-ownership rules.
- [ ] Tests run and results.
- [ ] Known limitations or deferred cases.
- [ ] Integration order and dependencies.
- [ ] Confirmation that unrelated work was not overwritten.

## Suggested iteration allocation

| Iteration | Phase | Deliverable |
| --- | --- | --- |
| 1 | 0 | Foundation, Docker, PostgreSQL, migrations and CI |
| 2 | 1 | Registration, approval, login, lockout and reset |
| 3 | 1–2 | RBAC, companies, profiles, sessions and privacy |
| 4 | 3 | Catalog, vendor capabilities, availability and pricing |
| 5 | 4 | Buyer enquiries and Admin sourcing requests |
| 6 | 4 | Vendor offers, comparison and Buyer quotations |
| 7 | 5 | Orders, milestones, quality, samples and tests |
| 8 | 5 | Documents, certificates and verification |
| 9 | 6 | Logistics, tracking, loading and cold chain |
| 10 | 6 | Finance, conversations and notifications |
| 11 | 7 | Content, analytics, reports and settings |
| 12 | 8 | Security, performance, recovery and launch |

## Phase sign-off template

Copy this block into the project decision log at the end of each phase:

```text
Phase:
Version / commit:
Environment:

Frontend owner:             APPROVED / CHANGES REQUIRED
Backend owner:              APPROVED / CHANGES REQUIRED
Database owner:             APPROVED / CHANGES REQUIRED
Security reviewer:          APPROVED / CHANGES REQUIRED
Test/release reviewer:      APPROVED / CHANGES REQUIRED
Product owner:              APPROVED / CHANGES REQUIRED

Exit criteria passed:
Known limitations:
Deferred items:
Rollback verified:
Approval date:
```

## Current document status

- [x] Requirements divided into implementation phases.
- [x] Frontend, backend and PostgreSQL tasks identified for each phase.
- [x] Dependencies and release gates documented.
- [x] Sequential gates and parallel agent waves documented.
- [x] Shared-file, generated-client, SQLAlchemy-model and Alembic ownership assigned.
- [x] Parallel test database isolation and cumulative regression gates documented.
- [x] Architecture/security and testing/release reviews approved.
- [x] No implementation started.

## Document review and sign-off

| Reviewer | Scope | Result | Date |
| --- | --- | --- | --- |
| Primary agent (`/root`) | Requirements, frontend/backend/database division and delivery sequencing | **APPROVED** | 12 September 2026 |
| Architecture and security agent (`/root/auth_backend_design_audit`) | Dependency chain, work ownership, schema/migration serialization, typed-client gate and conflict prevention | **APPROVED** | 12 September 2026 |
| Testing and release-gate agent (`/root/auth_backend_test_plan`) | Test isolation, concurrency suites, cumulative regression and staging/recovery sequencing | **APPROVED** | 12 September 2026 |

This approval covers the planning document only. It does not start or authorize implementation.
