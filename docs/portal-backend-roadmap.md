# Leo Infinity Trade Portal — Implementation Roadmap

| Document field | Value |
| --- | --- |
| Version | 1.0 |
| Date | 12 September 2026 |
| Status | Approved roadmap — implementation not started |
| Scope | Admin, Business Client, Vendor, FastAPI backend, PostgreSQL database |
| Source requirements | User account specification and complete portal module list |

## 1. Objective

Build a secure B2B trade portal with a Python backend and PostgreSQL database for three operating roles:

- **Administrator** — approves accounts, governs access, manages trade operations, and audits every privileged action.
- **Business Client (Buyer)** — discovers products, submits enquiries, approves quotations, follows orders, and receives documents.
- **Vendor (Supplier)** — maintains supply capabilities, responds to sourcing requests, submits evidence, and updates fulfilment milestones.

The first production release will establish identity, approval, company onboarding, catalog access, enquiries, vendor offers, quotations, quality requirements, documents, and basic order tracking. Later releases will add deeper logistics, finance, communication, content, and analytics functions.

## 2. Approved technology stack

| Layer | Technology |
| --- | --- |
| Backend API | Python 3.12+ and FastAPI |
| Validation | Pydantic 2 |
| Database | PostgreSQL 16+ |
| ORM | SQLAlchemy 2.x, async sessions |
| Migrations | Alembic |
| Password hashing | Argon2id |
| Authentication | Short-lived JWT access tokens and rotating refresh tokens |
| API documentation | OpenAPI and Swagger UI |
| Tests | Pytest, pytest-asyncio, HTTPX, PostgreSQL test database |
| Runtime | Gunicorn with Uvicorn workers |
| Packaging | Docker and Docker Compose |
| Frontend | Existing TanStack React application |

## 3. Scope decisions

### Included

- Username or email plus password login.
- Buyer and vendor self-registration.
- Administrator-created admin accounts.
- Manual administrator approval before first login.
- Account lock after three consecutive incorrect passwords.
- Administrator-only unlock, suspension, reactivation, rejection, disabling, and password reset.
- Forced password change after an administrator reset.
- Role-based permissions.
- Company and user profiles.
- Notification, locale, currency, and timezone preferences.
- Active-session and device management.
- Privacy consent records and account deletion requests.
- Immutable account-status history and administrator audit events.

### Explicitly excluded from the current version

- Email verification.
- OTP verification.
- Self-service forgot-password flow.
- Email or OTP password reset.
- Two-factor authentication.

An administrator reset generates a temporary password that is displayed once. Only its Argon2id hash is stored. The user must change it immediately after the next successful authentication, and normal portal access remains blocked until that change is complete.

## 4. Architecture

```text
TanStack React portal
        │ HTTPS / JSON
        ▼
FastAPI application
  ├── Authentication and RBAC
  ├── Account and company onboarding
  ├── Catalog and sourcing
  ├── Quotes and orders
  ├── Quality and documents
  ├── Logistics and finance
  └── Admin, audit and reporting
        │ SQLAlchemy 2.x
        ▼
PostgreSQL
  ├── Transactional business records
  ├── Status and audit history
  └── Hashed refresh-token sessions
```

The API should use a modular monolith initially. Each domain owns its routes, schemas, service layer, models, permissions, and tests. This keeps deployment simple while preserving boundaries that can be separated later if traffic or team structure requires it.

Suggested backend structure:

```text
backend/
├── app/
│   ├── api/v1/
│   ├── core/
│   ├── db/
│   ├── modules/
│   │   ├── auth/
│   │   ├── accounts/
│   │   ├── companies/
│   │   ├── catalog/
│   │   ├── enquiries/
│   │   ├── quotations/
│   │   ├── orders/
│   │   ├── quality/
│   │   ├── documents/
│   │   ├── logistics/
│   │   ├── finance/
│   │   ├── communications/
│   │   ├── content/
│   │   └── reporting/
│   └── main.py
├── alembic/
├── scripts/
├── tests/
├── Dockerfile
├── pyproject.toml
└── alembic.ini
```

## 5. Account state model

| Status | Login allowed | Meaning |
| --- | --- | --- |
| `PENDING_APPROVAL` | No | Registration awaits administrator review. |
| `ACTIVE` | Yes | Account is approved and operational. |
| `LOCKED` | No | Three consecutive incorrect passwords were recorded. |
| `SUSPENDED` | No | Administrator temporarily suspended the account. |
| `REJECTED` | No | Registration was rejected. |
| `DISABLED` | No | Account was permanently deactivated. |

Allowed transitions:

```text
PENDING_APPROVAL ──admin approve──────────▶ ACTIVE
PENDING_APPROVAL ──admin reject───────────▶ REJECTED
ACTIVE ──3 failed logins (SYSTEM)─────────▶ LOCKED
ACTIVE ──manual lock (ADMIN)──────────────▶ LOCKED
LOCKED ──admin unlock─────────────────────▶ ACTIVE
ACTIVE ──admin suspend────────────────────▶ SUSPENDED
SUSPENDED ──admin reactivate──────────────▶ ACTIVE
ACTIVE/LOCKED/SUSPENDED ──admin disable───▶ DISABLED
```

`REJECTED` and `DISABLED` are terminal in the first release. Restoring either requires a future, explicitly designed policy rather than an undocumented database update.

Only `ACTIVE` accounts can be suspended. A locked account must be explicitly unlocked before it can be suspended, preventing a suspend/reactivate sequence from bypassing the unlock action. Manual locking is valid only for `ACTIVE` accounts; invalid transitions return `409 Conflict`.

Every transition records the previous status, new status, reason, actor, timestamp, request identifier, and source IP when available.

## 6. Authentication and session rules

### Transactional failed-login handling

The password comparison and failed-attempt update must occur within one database transaction:

1. Begin the transaction.
2. Select the user row with `SELECT ... FOR UPDATE` using normalized username or email. For an unknown identifier, run verification against a fixed dummy Argon2id hash before returning the same generic error.
3. Check the current account status.
4. Verify the supplied password against the Argon2id hash.
5. On failure, increment `failed_login_attempts` and write a `login_attempts` row.
6. When the new count reaches three, set status to `LOCKED`, set `locked_at`, and write status history.
7. Commit before returning the authentication error.
8. On success, reset the counter, update `last_login_at`, record the successful attempt, create the session and refresh token, and commit.

This row lock prevents simultaneous failed attempts from reading the same counter and bypassing the three-attempt rule.

### Token strategy

- Access tokens: 10–15 minute expiry.
- Refresh tokens: opaque random secrets or JWTs with a unique `jti`, stored only as a cryptographic hash.
- Refresh-token rotation: each refresh revokes the current token and issues a replacement in the same transaction.
- Token-family tracking: reuse of an already rotated token revokes the entire session family.
- Logout: revoke the current session.
- Logout all devices: revoke every active session for the user.
- Password change, admin reset, suspension, disable, and lock: increment `auth_version` and revoke all active refresh sessions. Protected requests verify the current status and token `auth_version`, directly or through a short-lived cache, so access can be invalidated immediately.
- Browser delivery: prefer `HttpOnly`, `Secure`, `SameSite=Lax` refresh-token cookies; keep access tokens in memory.

### Password rules

- Minimum 12 characters.
- Accept long passphrases up to at least 128 characters.
- Reject common or compromised passwords when an offline deny-list is available.
- Never log passwords or temporary passwords.
- Temporary passwords expire after a configurable short period.
- `must_change_password=true` restricts the token to the password-change and logout endpoints.
- Administrator password reset changes credentials, sets the temporary-password expiry and `must_change_password`, increments `auth_version`, and revokes sessions. It never approves, reactivates, or unlocks the account. A locked user requires a separate audited unlock before using the temporary password.

## 7. Role-based access control

Initial roles:

| Role | Primary scope |
| --- | --- |
| `SUPER_ADMIN` | All system and role-management actions. |
| `ADMIN` | Account approval and operational administration. |
| `SALES` | Enquiries, sourcing, quotations, clients, and orders. |
| `QUALITY` | Specifications, samples, inspections, tests, incidents, and evidence. |
| `DOCUMENTATION` | Commercial, quality, certificate, and shipment documents. |
| `LOGISTICS` | Shipments, routes, milestones, tracking, and cold chain. |
| `FINANCE` | Invoices, schedules, balances, refunds, and payment evidence. |
| `BUYER_OWNER` | Buyer company administration and all buyer workflows. |
| `BUYER_MEMBER` | Buyer workflows granted by the company owner. |
| `VENDOR_OWNER` | Supplier company administration and all vendor workflows. |
| `VENDOR_MEMBER` | Vendor workflows granted by the company owner. |

Permissions should use stable names such as `accounts.approve`, `users.unlock`, `quotes.create`, `quality.review`, and `documents.verify`. API authorization must check both permission and resource ownership. Frontend route guards are for user experience only and cannot replace backend authorization.

## 8. Database roadmap

### Identity and governance

- `users`
- `roles`
- `permissions`
- `role_permissions`
- `user_roles`
- `login_attempts`
- `refresh_tokens`
- `account_status_history`
- `admin_audit_logs`
- `password_history`
- `user_devices`

Core `users` fields:

```text
id, username, normalized_username, email, normalized_email,
password_hash, user_type, status, failed_login_attempts, locked_at,
approved_at, approved_by, suspended_at, suspended_by,
suspension_reason, must_change_password, temporary_password_expires_at,
auth_version, last_login_at, created_at, updated_at
```

Use case-insensitive unique indexes for normalized username and normalized email. Use UUID primary keys, UTC timestamps, database constraints for enum-like values, and optimistic version columns where concurrent business editing is possible.

### Profiles, preferences, privacy, and company onboarding

- `companies`
- `business_clients`
- `vendors`
- `company_members`
- `company_addresses`
- `company_contacts`
- `company_documents`
- `vendor_facilities`
- `vendor_sourcing_locations`
- `user_profiles`
- `user_preferences`
- `notification_preferences`
- `privacy_consents`
- `account_deletion_requests`

Company approval should be related to the owning registration but kept as its own history-capable status. This supports future cases where a user remains valid while a facility, document, or company capability requires re-review.

### Catalog, inventory, and pricing

- `product_categories`
- `products`
- `product_images`
- `product_specifications`
- `packaging_options`
- `vendor_products`
- `product_availability`
- `warehouses`
- `inventory_positions`
- `vendor_price_lists`
- `vendor_price_items`

### Enquiries, sourcing, and quotations

- `enquiries`
- `enquiry_items`
- `enquiry_attachments`
- `sourcing_requests`
- `sourcing_request_vendors`
- `vendor_offers`
- `vendor_offer_items`
- `quotations`
- `quotation_versions`
- `quotation_items`
- `quotation_decisions`

### Orders, quality, and documents

- `orders`
- `order_items`
- `order_milestones`
- `order_status_history`
- `quality_requirements`
- `inspection_plans`
- `inspection_checkpoints`
- `sample_requests`
- `laboratory_test_requirements`
- `test_parameter_limits`
- `non_conformances`
- `corrective_actions`
- `documents`
- `document_versions`
- `document_verifications`
- `certificates`

### Logistics, finance, and communication

- `shipments`
- `shipment_routes`
- `shipment_milestones`
- `shipment_tracking_events`
- `containers`
- `pallets`
- `temperature_loggers`
- `temperature_readings`
- `invoices`
- `payment_schedules`
- `payments`
- `credit_notes`
- `refunds`
- `conversations`
- `messages`
- `internal_notes`
- `notification_events`
- `notification_deliveries`

### Content, settings, and reporting

- `content_pages`
- `content_blocks`
- `media_assets`
- `testimonials`
- `case_studies`
- `markets`
- `system_settings`
- `reference_sequences`
- `webhook_endpoints`
- `webhook_deliveries`
- `report_exports`

## 9. API roadmap

All endpoints should be versioned under `/api/v1`.

### Authentication and account endpoints

```text
POST   /auth/register/buyer
POST   /auth/register/vendor
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
POST   /auth/logout-all
POST   /auth/change-password
GET    /auth/me
GET    /auth/sessions
DELETE /auth/sessions/{session_id}

GET    /profile
PATCH  /profile
GET    /profile/preferences
PATCH  /profile/preferences
GET    /profile/notification-preferences
PATCH  /profile/notification-preferences
GET    /profile/consents
POST   /profile/consents
POST   /profile/deletion-requests
GET    /profile/deletion-requests/current
```

### Administrator identity endpoints

```text
GET  /admin/dashboard/account-summary
GET  /admin/users
GET  /admin/users/{user_id}
POST /admin/users/{user_id}/approve
POST /admin/users/{user_id}/reject
POST /admin/users/{user_id}/lock
POST /admin/users/{user_id}/unlock
POST /admin/users/{user_id}/suspend
POST /admin/users/{user_id}/reactivate
POST /admin/users/{user_id}/disable
POST /admin/users/{user_id}/reset-password
GET  /admin/users/{user_id}/login-attempts
GET  /admin/users/{user_id}/status-history
GET  /admin/audit-logs
GET  /admin/deletion-requests
POST /admin/deletion-requests/{request_id}/approve
POST /admin/deletion-requests/{request_id}/reject
```

Every administrator mutation requires a reason, including approval. Approval can use a controlled reason such as `REGISTRATION_VERIFIED` plus optional review notes. Responses return the new status, action timestamp, and audit reference.

### Business-domain endpoints

Create separate route groups for:

- `/products`, `/categories`, `/favorites`
- `/enquiries`, `/sourcing-requests`, `/vendor-offers`
- `/quotations`, `/orders`
- `/quality-requirements`, `/samples`, `/inspections`, `/laboratory-tests`, `/non-conformances`
- `/documents`, `/certificates`
- `/inventory`, `/availability`, `/price-lists`
- `/shipments`, `/tracking`, `/cold-chain`
- `/invoices`, `/payments`, `/credit-notes`, `/refunds`
- `/conversations`, `/messages`, `/notifications`
- `/content`, `/reports`, `/settings`

Use cursor pagination for event feeds and large lists. Use standard filtering, stable sorting, idempotency keys for create/submit actions, and optimistic concurrency for editable quotes, offers, orders, and documents.

## 10. Portal module delivery map

| Module | Admin | Buyer | Vendor | Target phase |
| --- | --- | --- | --- | --- |
| Login, approval, lockout, reset | Manage | Use | Use | 1 |
| RBAC, profiles, preferences | Manage | Own company | Own company | 1–2 |
| Sessions, privacy, deletion | Manage/audit | Self-service request | Self-service request | 2 |
| Catalog and product management | Manage | Search/compare | Capabilities | 3 |
| Availability, inventory, pricing | Govern | View quoted data | Maintain | 3 |
| Enquiries and sourcing | Assign | Create | Receive opportunity | 4 |
| Vendor offers and buyer quotations | Compare/prepare | Review/decide | Submit/revise | 4 |
| Orders and milestones | Manage | Track | Fulfil/update | 5 |
| Quality, samples, tests, incidents | Review | Specify/report | Respond/upload | 5 |
| Documents and certificates | Verify/publish | Request/download | Upload/maintain | 5 |
| Logistics and cold chain | Coordinate | Track | Update evidence | 6 |
| Finance and payments | Manage | View/pay evidence | Invoice/track | 6 |
| Communication and notifications | Monitor/configure | Message | Message | 6 |
| CMS and public evidence | Publish | View | Submit source material | 7 |
| Reports and analytics | Full | Company scope | Company scope | 7 |
| System configuration | Full | None | None | 7 |

### 10.1 Module-wise frontend, backend, and database roadmap

This matrix is the working implementation contract. A module is not ready for sign-off until its frontend, backend, database, authorization, audit, and test work are complete.

| # | Module | Frontend scope | Backend/API scope | PostgreSQL scope | Phase |
| --- | --- | --- | --- | --- | --- |
| 1 | Authentication and registration | Buyer/vendor registration, login, pending/rejected/locked/suspended screens, forced-password-change page | Registration, transactional login, access/refresh tokens, logout, password change, status-aware authentication | `users`, `login_attempts`, `refresh_tokens`, `password_history`, initial status history | 1 |
| 2 | Admin account control | Account queues, user search/filter, detail drawer, approve/reject/lock/unlock/suspend/reactivate/disable/reset actions | State-transition service, admin action endpoints, one-time temporary password, session revocation | `account_status_history`, `admin_audit_logs`, status/actor/reason fields and indexes | 1 |
| 3 | Roles and permissions | Admin role editor, team role display, permission-aware navigation and controls | Permission catalog, role assignment, authorization dependencies, resource ownership checks | `roles`, `permissions`, `role_permissions`, `user_roles` | 1–2 |
| 4 | User profile and settings | Personal details, language, currency, timezone, notification settings | Profile/preferences read and update with field allowlists and validation | `user_profiles`, `user_preferences`, `notification_preferences` | 2 |
| 5 | Company onboarding | Buyer/vendor company forms, status tracker, contacts, addresses, documents, vendor facilities | Company onboarding, validation, admin review, ownership and membership APIs | `companies`, `business_clients`, `vendors`, `company_members`, `company_contacts`, `company_addresses`, `company_documents`, `vendor_facilities`, `vendor_sourcing_locations` | 2 |
| 6 | Sessions and devices | Active-session list, current-device label, revoke one session, logout all devices | Session inventory, device metadata, refresh-family revocation, security-event handling | `refresh_tokens`, `user_devices`, security event fields/indexes | 2 |
| 7 | Privacy, consent, and deletion | Consent history, preference controls, deletion-request form and status | Versioned consent capture, withdrawal, deletion review, retention hold and anonymization workflow | `privacy_consents`, `account_deletion_requests`, related audit records | 2 |
| 8 | Portal dashboards | Admin operational cards; buyer quote/order cards; vendor opportunity/fulfilment cards | Role-scoped aggregate endpoints, urgent-action feeds, cached summary queries | Read models or indexed aggregate queries over users, enquiries, orders, quality and shipments | 2–7 incrementally |
| 9 | Product catalog | Admin category/product editor; buyer search/filter/compare/favorites; vendor capability editor | Catalog publishing, specification/version APIs, search, visibility, favorite and capability services | `product_categories`, `products`, `product_images`, `product_specifications`, `packaging_options`, `vendor_products`, `favorites` | 3 |
| 10 | Availability and inventory | Admin overview, vendor seasonal calendar and stock updates, buyer availability indicators | Capacity, availability, reservation, warehouse and inventory services | `product_availability`, `warehouses`, `inventory_positions`, inventory movements/reservations | 3 |
| 11 | Pricing | Vendor price-list editor, admin comparison/margin view, buyer quotation prices | Price-list versioning, currency validity, freight/insurance costing, margin authorization | `vendor_price_lists`, `vendor_price_items`, currencies, cost components and approvals | 3–4 |
| 12 | Enquiries | Buyer multi-product enquiry wizard; admin inbox/assignment; enquiry timelines | Enquiry creation, attachments, assignment, references, validation and idempotency | `enquiries`, `enquiry_items`, `enquiry_attachments`, enquiry status history | 4 |
| 13 | Vendor sourcing and offers | Admin vendor selection; vendor opportunity inbox and offer editor; admin offer comparison | Sourcing dispatch, vendor eligibility, versioned offer submission and comparison | `sourcing_requests`, `sourcing_request_vendors`, `vendor_offers`, `vendor_offer_items`, offer versions | 4 |
| 14 | Buyer quotations | Admin quote composer/version history; buyer review, accept, reject and change request | Quote calculation, approval, immutable revisions, expiry, buyer decisions | `quotations`, `quotation_versions`, `quotation_items`, `quotation_decisions`, approval records | 4 |
| 15 | Orders | Admin order workspace; buyer milestones/reorder; vendor production and fulfilment updates | Accepted-quote conversion, sales/purchase orders, milestones, transitions and history | `orders`, `order_items`, purchase orders, `order_milestones`, `order_status_history` | 5 |
| 16 | Quality and samples | Buyer quality builder/claims; admin review; vendor specification response, samples and checkpoints | Quality brief, samples, inspection plans, tests, decisions, non-conformance and corrective action | `quality_requirements`, `sample_requests`, `inspection_plans`, `inspection_checkpoints`, `laboratory_test_requirements`, `test_parameter_limits`, `non_conformances`, `corrective_actions` | 5 |
| 17 | Documents and certificates | Role-scoped document centre, upload, preview, expiry/status labels, download and verification screens | Secure upload/download, versioning, verification, visibility, expiry alerts and publishing approval | `documents`, `document_versions`, `document_verifications`, `certificates`, storage-object metadata | 5 |
| 18 | Logistics and cold chain | Shipment planner, tracking timeline, route view, container/pallet details, temperature charts | Shipment creation, milestone ingestion, tracking, loading evidence, logger import and excursion review | `shipments`, `shipment_routes`, `shipment_milestones`, `shipment_tracking_events`, `containers`, `pallets`, `temperature_loggers`, `temperature_readings` | 6 |
| 19 | Payments and finance | Admin finance workspace, buyer invoice/balance view, vendor invoice/payment status | Proforma/invoice lifecycle, schedules, evidence, reconciliation, credit notes and refunds | `invoices`, `invoice_items`, `payment_schedules`, `payments`, `credit_notes`, `refunds` | 6 |
| 20 | Communication centre | Buyer/vendor conversations, admin internal notes, notification inbox and delivery preferences | Thread/message APIs, private internal notes, templates, channel adapters and delivery tracking | `conversations`, `conversation_members`, `messages`, `internal_notes`, `notification_events`, `notification_deliveries` | 6 |
| 21 | Content and public evidence | Admin page/block editor, media library, FAQ/market/testimonial/case-study review | Draft/publish workflow, media processing, evidence verification and public read APIs | `content_pages`, `content_blocks`, `media_assets`, `markets`, `testimonials`, `case_studies`, publishing approvals | 7 |
| 22 | Reports and analytics | Admin filters/charts/exports; company-scoped buyer/vendor scorecards | Authorized aggregates, background export jobs, saved report definitions | Indexed operational data, `report_exports`, optional materialized views | 7 |
| 23 | System settings and integrations | Admin reference formats, upload limits, retention, webhook/email/CRM/WhatsApp configuration | Typed settings, encrypted secrets references, webhook delivery/retry, spam and upload policies | `system_settings`, `reference_sequences`, `webhook_endpoints`, `webhook_deliveries`, retention jobs | 7 |
| 24 | Audit and operational monitoring | Admin audit search, login attempts, activity timelines and export | Append-only audit queries, correlation IDs, security events, health/readiness/metrics | `admin_audit_logs`, status histories, login attempts, integration delivery logs and operational indexes | 1–8 |

### 10.2 Portal-specific module ownership

#### Administrator frontend

| Workspace | Primary screens | Depends on |
| --- | --- | --- |
| Dashboard | Buyer/vendor/enquiry/order counts, pending approvals, urgent quality/document/shipment actions | Modules 2, 8 |
| Buyers | Approval queue, company profile, contacts, documents, status and activity | Modules 2, 5, 17, 24 |
| Vendors | Onboarding, facilities, capabilities, certifications, availability and performance | Modules 2, 5, 9, 10, 17, 22 |
| Users and roles | Admin users, operational roles, permissions and access history | Modules 1–3, 24 |
| Products | Categories, products, specifications, packaging, media and publishing | Module 9 |
| Enquiries and quotes | Assignment, vendor comparison, quote builder, versions and handoffs | Modules 11–14, 20 |
| Orders | Sales/purchase orders, milestones, changes and history | Module 15 |
| Quality | Requirements, samples, inspections, test limits, decisions and incidents | Module 16 |
| Documents and certificates | Versions, issuer/scope/expiry, verification and publishing | Module 17 |
| Logistics | Freight mode, routes, containers, loading, tracking and cold chain | Module 18 |
| Inventory and pricing | Availability, reservations, warehouses, price lists, costs and margins | Modules 10–11 |
| Finance | Proforma invoices, schedules, evidence, balances, credit notes and refunds | Module 19 |
| Communications | Internal notes, external threads, notifications and channel history | Module 20 |
| Content | Pages, markets, FAQs, media, policies, testimonials and case studies | Module 21 |
| Reports | Conversion, sales, vendor, quality, delivery and document reporting | Module 22 |
| Settings and audit | References, integrations, security limits, retention, logs and monitoring | Modules 23–24 |

#### Business Client frontend

| Workspace | Primary screens | Depends on |
| --- | --- | --- |
| Account | Profile, company, delivery addresses, team, preferences, sessions, consent and deletion request | Modules 3–7 |
| Dashboard | Enquiry, quotation, order, shipment, document and payment summaries | Module 8 |
| Products | Catalog, filters, comparison, favorites, specifications and availability | Modules 9–10 |
| Enquiries | Multi-product request, quantities, units, packaging, destination, date, Incoterm and attachments | Module 12 |
| Quality | Product requirements, custom limits, samples, inspection/evidence requests and issue claims | Module 16 |
| Quotations | Version comparison, accept, reject and request changes | Module 14 |
| Orders | Order detail, milestones, previous-order reorder and changes | Module 15 |
| Shipments | Route, tracking, loading evidence and cold-chain checkpoints | Module 18 |
| Documents | Role-approved commercial, quality, certificate and transport downloads | Module 17 |
| Finance | Proforma, invoices, schedules, balances and payment evidence | Module 19 |
| Messages | Trade-desk conversations, support and notifications | Module 20 |

#### Vendor frontend

| Workspace | Primary screens | Depends on |
| --- | --- | --- |
| Account | Company onboarding, facilities, warehouses, contacts, team, bank details, preferences, sessions and privacy | Modules 3–7 |
| Dashboard | Opportunities, offers, orders, quality actions, documents, shipments and payments | Module 8 |
| Products | Capabilities, origin, variety, grade, specifications, MOQ, capacity and packaging | Module 9 |
| Availability and pricing | Seasonal calendar, stock/capacity, warehouses and price-list submission | Modules 10–11 |
| Opportunities and offers | Sourcing requests, buyer specification review, offer submission and revisions | Module 13 |
| Orders | Purchase orders, production, packing and fulfilment milestones | Module 15 |
| Quality | Samples, custom-limit acknowledgment, inspections, batch/lot records, laboratory reports, non-conformance and corrective action | Module 16 |
| Documents | Facility certificates, expiry/scope, order documents and loading evidence | Module 17 |
| Shipments | Transport references, containers, logger details and tracking events | Module 18 |
| Finance | Vendor invoices and payment status | Module 19 |
| Messages | Admin/buyer-approved conversations, notifications and support | Module 20 |

## 11. Delivery phases

### Phase 0 — Foundation and decisions

Deliverables:

- Create `backend/` project and dependency lock.
- Configure FastAPI, SQLAlchemy, Alembic, structured settings, logging, and health endpoints.
- Add PostgreSQL, API, and frontend services to Docker Compose.
- Define API error format, pagination format, audit metadata, and UTC timestamp rules.
- Add CI for linting, type checking, migrations, tests, and container build.
- Create an administrator bootstrap command that reads credentials securely from environment or prompt.

Exit criteria:

- Fresh checkout starts with one documented Docker Compose command.
- API health and database readiness endpoints pass.
- Alembic can migrate an empty database to head and back one revision.
- No default production password or signing key exists in source control.
- CI runs Ruff, mypy, Pytest, OpenAPI contract validation, Alembic upgrade/downgrade against PostgreSQL 16, and container builds.

### Phase 1 — Authentication, approval, and RBAC

Deliverables:

- Identity and audit tables.
- Buyer and vendor registration with `PENDING_APPROVAL` status.
- Admin approval/rejection and user-list filters.
- Transactional three-attempt account locking.
- Admin unlock, suspension, reactivation, disable, and reset password.
- JWT access tokens and rotating refresh sessions.
- Forced password change after administrator reset.
- Permission dependencies and initial role seed.
- Admin account dashboard counts and user detail history.

Exit criteria:

- Pending, locked, suspended, rejected, and disabled accounts cannot receive normal access tokens.
- The third consecutive incorrect password locks exactly once under concurrent requests.
- Successful login resets the counter to zero.
- Every admin action creates status history and an audit log containing actor, time, reason, target, and request ID.
- Refresh-token reuse revokes the token family.
- Concurrent lockout and refresh-rotation tests pass repeatedly with independent PostgreSQL sessions.
- Authentication and account service coverage is at least 90%, with branch coverage reported.

### Phase 2 — Profiles, companies, preferences, sessions, and privacy

Deliverables:

- Buyer and vendor company profiles.
- Company contacts, addresses, delivery profiles, facilities, sourcing locations, and company documents.
- Team membership and owner/member permissions.
- Language, currency, timezone, and notification preferences.
- Active-session and device list with individual and global revocation.
- Versioned privacy consent capture.
- Account deletion request, admin review, retention hold, and anonymization workflow.

Exit criteria:

- A user can access only their company and permitted team records.
- Company onboarding and approval states are visible to both the owner and admin.
- Revoked sessions cannot refresh.
- Consent evidence includes policy version, timestamp, source, and user.
- Deletion never removes records that must remain under an active trade or retention obligation; the decision is audited.

### Phase 3 — Product, vendor capability, availability, and pricing

Deliverables:

- Category and product administration.
- Images, specifications, origins, grades, varieties, packaging, MOQ, states, and downloadable specifications.
- Vendor product capabilities, facilities, capacity, seasonal availability, and inventory positions.
- Vendor price lists with currency and validity.
- Buyer catalog search, filters, favorites, comparison, and evidence visibility.

Exit criteria:

- Only published products appear to buyers.
- Vendor data remains private to authorized staff until approved for buyer use.
- Price versions are traceable and cannot silently replace historical quote data.

### Phase 4 — Enquiry, sourcing, offer, and quotation workflow

Workflow:

```text
Buyer enquiry → Admin review → Vendor sourcing request → Vendor offer
→ Admin quotation → Buyer acceptance / change request / rejection
```

Deliverables:

- Multi-product enquiries with units, packaging, Incoterms, destination, delivery date, requirements, and attachments.
- Admin assignment and sourcing request creation.
- Vendor opportunity inbox and versioned offer submission.
- Side-by-side vendor-offer comparison.
- Versioned buyer quotation with prices, freight, insurance, currency, validity, and margin authorization.
- Buyer decision and revision loop.
- Email, CRM, WhatsApp, and webhook adapters behind configurable interfaces.

Exit criteria:

- Every commercial revision remains immutable and traceable.
- A buyer sees only the final buyer quotation, never internal vendor pricing or margin.
- Accepted quotation data is frozen for order conversion.
- Duplicate submissions are prevented with idempotency keys.

### Phase 5 — Orders, quality, and documents

Deliverables:

- Quote-to-order conversion, sales order, purchase order, items, milestones, and status history.
- Buyer quality brief, custom limits, sample request, inspection plan, laboratory requirements, and acceptance decisions.
- Vendor quality response, batch/lot records, evidence uploads, non-conformance, and corrective action.
- Document library with type, version, issuer, date, expiry, scope, verification, visibility, and download authorization.
- Certificate expiry and missing-document alerts.

Exit criteria:

- Order values come from an accepted quotation version.
- Quality acceptance and rejection decisions identify the responsible actor and evidence.
- Documents cannot be marked verified by the uploader unless the role explicitly permits it.
- Replaced document versions remain retained and auditable.

### Phase 6 — Logistics, finance, and communications

Deliverables:

- Sea, air, and land shipments; routes, carriers, ports, containers, pallets, milestones, and tracking events.
- Packing, loading, seal, and delivery evidence.
- Temperature logger metadata, readings, checkpoints, and excursion review.
- Proforma invoice, payment schedules, payment evidence, balances, credit notes, and refunds.
- Conversations, internal notes, buyer/vendor messages, notification preferences, and delivery records.

Exit criteria:

- Buyer and vendor see only milestones and financial information appropriate to their company role.
- Internal notes never appear in external APIs.
- Financial adjustments retain reason, actor, approval, and source transaction.
- Temperature records preserve device, timestamp, timezone, unit, and source file.

### Phase 7 — Content, system settings, and analytics

Deliverables:

- Managed homepage/company content, markets, FAQs, media, policies, testimonials, and case studies.
- Evidence-publishing workflow that requires source, consent, scope, date, and approval.
- Reference number formats, webhook configuration, spam controls, upload rules, retention policies, and audit views.
- Admin analytics for conversion, product/market sales, vendor performance, incidents, delivery, and document completion.
- Company-scoped buyer and vendor scorecards.
- CSV and PDF exports processed as background jobs.

Exit criteria:

- Unverified certificates, reports, logos, testimonials, and outcomes cannot be published.
- Reports enforce the same resource-level authorization as transactional APIs.
- Large exports run asynchronously and expire securely.

### Phase 8 — Hardening and launch

Deliverables:

- Threat-model review and penetration-test remediation.
- Load and concurrency testing for login, refresh, enquiry, offer, and quotation flows.
- Database backup, point-in-time recovery, and restore rehearsal.
- Monitoring, structured audit search, alerting, and incident runbooks.
- Data retention and deletion job verification.
- Staging acceptance, production migration rehearsal, launch checklist, and rollback plan.

Exit criteria:

- No unresolved critical or high-severity security findings.
- Restore rehearsal meets the agreed recovery objectives.
- Production secrets are externally managed and rotatable.
- Rate limits, CORS, trusted hosts, TLS, secure cookies, body limits, and upload scanning are enabled.
- Admin, buyer, and vendor acceptance scenarios pass in staging.

## 12. Frontend portal route plan

```text
/login
/register/buyer
/register/vendor
/account/pending
/change-temporary-password

/admin/dashboard
/admin/users
/admin/buyers
/admin/vendors
/admin/enquiries
/admin/quotes
/admin/orders
/admin/quality
/admin/documents
/admin/logistics
/admin/finance
/admin/content
/admin/reports
/admin/settings
/admin/audit

/buyer/dashboard
/buyer/company
/buyer/products
/buyer/enquiries
/buyer/quotes
/buyer/orders
/buyer/quality
/buyer/shipments
/buyer/documents
/buyer/invoices
/buyer/messages
/buyer/settings

/vendor/dashboard
/vendor/company
/vendor/products
/vendor/availability
/vendor/opportunities
/vendor/offers
/vendor/orders
/vendor/quality
/vendor/documents
/vendor/shipments
/vendor/invoices
/vendor/messages
/vendor/settings
```

Each portal should use route-level loading and error boundaries, backend permission checks, accessible forms, clear status labels, responsive tables, saved filters, and activity timelines.

## 13. Testing strategy

### Unit tests

- Password hashing and verification.
- Account transition rules.
- Permission evaluation and company ownership.
- Token creation, rotation, expiry, and family revocation.
- Temporary-password expiry and forced-change restriction.
- Reference-number generation and domain calculations.

### Integration tests with PostgreSQL

- Registration creates the correct profile and pending history.
- Concurrent registrations using case variants of the same username or email produce one account and deterministic conflicts for all other requests.
- User and buyer/vendor profile creation is atomic; a profile failure rolls back the user record.
- Public registration cannot create an `ADMIN`; responses and logs never expose passwords, password hashes, refresh hashes, or temporary passwords after the one-time reset response.
- Admin approval requires a reason, activates the account, and records the actor, timestamp, reason, and request ID.
- Three sequential and three concurrent password failures lock the account correctly.
- Successful login resets prior failures.
- Locked and suspended accounts remain blocked with the correct password.
- Admin unlock and reactivation restore only the intended state.
- Admin password reset revokes sessions and requires password change.
- Refresh rotation prevents replay.
- A PostgreSQL barrier test submits the same refresh token simultaneously from independent sessions: exactly one request succeeds, every other request fails, and detected reuse revokes the token family and descendants. The race test runs repeatedly to detect intermittent bypasses.
- Resource queries enforce company ownership.
- Audit and status history cannot be modified through normal APIs.

An endpoint-level authorization matrix must exercise every protected route with no token, an expired token, a revoked token, the wrong role, the correct role, and a cross-company identifier. Profile and settings tests must cover supported language, currency and timezone validation; notification topic/channel preferences; session ownership; append-only consent versions and withdrawal; duplicate deletion requests; deletion decision states; and retention-preserving anonymization.

### API contract tests

- OpenAPI schema generation.
- Validation and consistent error payloads.
- Pagination, filtering, sorting, and authorization.
- File size, MIME type, extension, malware-scan state, and download authorization.
- Idempotent enquiry, offer, quote acceptance, and order conversion.

### End-to-end acceptance tests

1. Buyer registers, waits for approval, logs in, completes company profile, creates enquiry, accepts quote, and tracks order.
2. Vendor registers, is approved, publishes capabilities, receives sourcing request, submits offer, uploads evidence, and updates milestones.
3. Administrator approves both accounts, compares offers, issues quotation, reviews quality/documents, and audits the complete history.
4. Three simultaneous incorrect logins lock the user; an administrator unlocks them; successful login resets the counter.
5. Administrator reset produces a one-time temporary password; the user must change it before accessing the portal.

## 14. Operational and security requirements

- Store all secrets outside source control.
- Use separate signing keys by environment with a rotation procedure.
- Apply rate limiting to login, refresh, registration, uploads, and exports.
- Return generic login errors so account existence is not disclosed.
- Record both successful and failed authentication attempts without storing credentials.
- Redact authorization headers, cookies, passwords, tokens, bank data, and sensitive documents from logs.
- Encrypt traffic with TLS and encrypt managed database/storage volumes at rest.
- Use object storage with signed, short-lived URLs for uploaded files.
- Scan uploads before making them available.
- Use database backups with point-in-time recovery and documented restore tests.
- Add health, readiness, metrics, error tracking, and alerting endpoints or integrations.
- Use UTC in storage and render in each user's configured timezone.
- Maintain an append-only audit trail for privileged and commercial actions.

## 15. Recommended delivery schedule

The schedule depends on team size and review speed. For a small focused team, use two-week iterations:

| Iteration | Primary outcome |
| --- | --- |
| 1 | Backend foundation, PostgreSQL, migrations, CI, admin bootstrap |
| 2 | Registration, approval, login, lockout, reset, refresh rotation |
| 3 | RBAC, profiles, companies, preferences, sessions, privacy |
| 4 | Catalog, vendor capabilities, availability, price lists |
| 5 | Buyer enquiries and admin sourcing requests |
| 6 | Vendor offers, comparisons, quotations, buyer decisions |
| 7 | Orders, milestones, quality requirements, samples and tests |
| 8 | Documents, certificates, verification and expiry handling |
| 9 | Logistics, tracking, cold chain and loading evidence |
| 10 | Finance, conversations and notification delivery |
| 11 | CMS, analytics, settings and exports |
| 12 | Security hardening, performance, recovery rehearsal and launch |

Do not begin a later commercial phase until the identity, audit, authorization, and company-ownership foundations it depends on have passed their exit criteria.

## 16. Definition of done

A module is complete only when:

- Database migration and rollback are reviewed.
- Pydantic request and response schemas are documented.
- Authorization and company ownership are enforced in the service and API layers.
- Success, validation, permission, conflict, and concurrency paths are tested.
- Administrator actions create required audit records.
- Sensitive values are excluded from responses and logs.
- OpenAPI examples and operational notes are updated.
- Frontend states cover loading, empty, error, forbidden, and success outcomes.
- Docker and CI checks pass from a clean checkout.
- The module's acceptance criteria are demonstrated in staging.

## 17. Immediate next milestone

Start with **Phase 0 and Phase 1**:

1. Scaffold the FastAPI project and PostgreSQL service.
2. Create identity, role, session, login-attempt, status-history, and audit migrations.
3. Add the admin bootstrap command.
4. Implement registration and approval.
5. Implement transactional login lockout.
6. Implement refresh rotation and session management.
7. Implement administrator status actions and temporary-password reset.
8. Add concurrency and lifecycle tests before connecting the frontend login pages.

## 18. Document review and sign-off

This sign-off approves the roadmap as a planning document. It does not authorize or indicate that portal, backend, or database implementation has started.

| Reviewer | Review scope | Result | Sign-off date |
| --- | --- | --- | --- |
| Primary agent (`/root`) | User requirements, module completeness, frontend/backend/database mapping, delivery order | **APPROVED** | 12 September 2026 |
| Architecture and security agent (`/root/auth_backend_design_audit`) | FastAPI/PostgreSQL architecture, account transitions, transaction safety, tokens, auditability and dependencies | **APPROVED** | 12 September 2026 |
| Testing and release-gate agent (`/root/auth_backend_test_plan`) | Migration, lifecycle, concurrency, refresh replay, RBAC, tenant isolation, settings, privacy and CI gates | **APPROVED** | 12 September 2026 |

Review findings incorporated before approval:

- Administrator reason is mandatory for every account action, including approval.
- Manual locking and valid account transitions are explicit; suspension cannot bypass unlocking.
- Password reset never approves, reactivates, or unlocks an account.
- `auth_version` supports immediate invalidation after security-sensitive account changes.
- Unknown login identifiers use dummy Argon2id verification to reduce timing differences.
- Concurrent duplicate registration, account lockout, and refresh rotation have PostgreSQL test gates.
- The endpoint authorization matrix covers role, token state, company isolation, sessions, settings, consent, and deletion requests.
- CI gates name the migration, OpenAPI, lint, type, test, coverage, and container checks required for release.
