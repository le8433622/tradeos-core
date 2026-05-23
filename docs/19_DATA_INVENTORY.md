# Data Inventory And PII Map

## Classification Key

| Class   | Label                             | Description                                                                                                                |
| ------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **PII** | Personal Identifiable Information | Email, phone, name, IP address — can identify a natural person. Subject to GDPR/CCPA access and deletion rights.           |
| **CC**  | Commercial Confidential           | Business-sensitive data: company names, deal values, product pricing, trade needs. Protected by NDA/commercial agreements. |
| **AC**  | Audit-Critical                    | Records required for compliance, dispute resolution, or legal retention. Cannot be deleted without legal hold review.      |
| **OP**  | Operational Metadata              | System-internal identifiers, timestamps, status flags, counters. Low sensitivity.                                          |

## Data Classes And Retention

| Data Class | Retention                                                   | Rationale                                           |
| ---------- | ----------------------------------------------------------- | --------------------------------------------------- |
| PII        | Until tenant deletion request or 1 year after last activity | Subject to deletion rights; keep for dispute window |
| CC         | Indefinite (until tenant archive/deletion)                  | Core business value, tenant-owned                   |
| AC         | Indefinite                                                  | Legal and compliance requirement                    |
| OP         | Per-model retention rules                                   | Operational value                                   |

## Models

### Organization

| Field             | Classification | Purpose                    | Retention Basis            |
| ----------------- | -------------- | -------------------------- | -------------------------- |
| `id`              | OP             | Internal identifier        | Required for all relations |
| `name`            | CC             | Tenant trading name        | Business record            |
| `type`            | OP             | Tenant classification      | Business configuration     |
| `country`         | CC             | Home market                | Business context           |
| `website`         | CC             | Public business identity   | Business record            |
| `avgDealValue`    | CC             | DR cost estimation         | Business configuration     |
| `conversionRate`  | CC             | DR cost estimation         | Business configuration     |
| `aiMonthlyBudget` | CC             | Cost control configuration | Business configuration     |
| `metadata`        | CC             | Extensible config          | Business configuration     |
| `createdAt`       | OP             | Record timestamp           | Operational                |
| `updatedAt`       | OP             | Record timestamp           | Operational                |

### User

| Field            | Classification | Purpose             | Retention Basis             |
| ---------------- | -------------- | ------------------- | --------------------------- |
| `id`             | OP             | Internal identifier | Required for all relations  |
| `organizationId` | OP             | Tenant scope        | Required for tenancy        |
| `email`          | **PII**        | Login and contact   | Required for authentication |
| `name`           | **PII**        | Display name        | Operational UI              |
| `role`           | OP             | Authorization level | Required for access control |
| `createdAt`      | OP             | Record timestamp    | Operational                 |
| `updatedAt`      | OP             | Record timestamp    | Operational                 |

### Company

| Field            | Classification | Purpose                  | Retention Basis        |
| ---------------- | -------------- | ------------------------ | ---------------------- |
| `id`             | OP             | Internal identifier      | Required for relations |
| `organizationId` | OP             | Tenant scope             | Required for tenancy   |
| `name`           | CC             | Trade partner name       | Business record        |
| `country`        | CC             | Market location          | Trade context          |
| `industry`       | CC             | Sector classification    | Business record        |
| `type`           | CC             | Partner classification   | Business record        |
| `website`        | CC             | Public business identity | Business record        |
| `notes`          | CC             | Internal notes           | Business record        |
| `metadata`       | CC             | Extensible data          | Business record        |
| `createdAt`      | OP             | Record timestamp         | Operational            |
| `updatedAt`      | OP             | Record timestamp         | Operational            |

### Contact

| Field            | Classification | Purpose             | Retention Basis        |
| ---------------- | -------------- | ------------------- | ---------------------- |
| `id`             | OP             | Internal identifier | Required for relations |
| `organizationId` | OP             | Tenant scope        | Required for tenancy   |
| `companyId`      | OP             | Relation to Company | Required for relation  |
| `name`           | **PII**        | Contact person      | Business communication |
| `email`          | **PII**        | Contact email       | Business communication |
| `phone`          | **PII**        | Contact phone       | Business communication |
| `title`          | CC             | Job title           | Business context       |
| `country`        | CC             | Location            | Business context       |
| `metadata`       | CC             | Extensible data     | Business record        |
| `createdAt`      | OP             | Record timestamp    | Operational            |
| `updatedAt`      | OP             | Record timestamp    | Operational            |

### Lead

| Field            | Classification | Purpose               | Retention Basis        |
| ---------------- | -------------- | --------------------- | ---------------------- |
| `id`             | OP             | Internal identifier   | Required for relations |
| `organizationId` | OP             | Tenant scope          | Required for tenancy   |
| `companyId`      | OP             | Relation to Company   | Required for relation  |
| `source`         | OP             | Channel origin        | Business context       |
| `name`           | **PII**        | Lead/person name      | Trade communication    |
| `phone`          | **PII**        | Lead phone            | Trade communication    |
| `email`          | **PII**        | Lead email            | Trade communication    |
| `need`           | CC             | Trade requirement     | Core business value    |
| `status`         | OP             | Pipeline stage        | Sales process          |
| `score`          | OP             | Lead scoring          | Sales tool             |
| `aiSummary`      | CC             | AI-generated analysis | Business insight       |
| `nextAction`     | OP             | Suggested follow-up   | Sales process          |
| `metadata`       | CC             | Extensible data       | Business record        |
| `createdAt`      | OP             | Record timestamp      | Operational            |
| `updatedAt`      | OP             | Record timestamp      | Operational            |

### Product

| Field            | Classification | Purpose                | Retention Basis        |
| ---------------- | -------------- | ---------------------- | ---------------------- |
| `id`             | OP             | Internal identifier    | Required for relations |
| `organizationId` | OP             | Tenant scope           | Required for tenancy   |
| `name`           | CC             | Product name           | Business record        |
| `category`       | CC             | Product type           | Business record        |
| `description`    | CC             | Product details        | Business record        |
| `originCountry`  | CC             | Country of origin      | Trade context          |
| `priceRange`     | CC             | Pricing                | Business record        |
| `moq`            | CC             | Minimum order quantity | Business record        |
| `certification`  | CC             | Quality certs          | Business record        |
| `metadata`       | CC             | Extensible data        | Business record        |
| `createdAt`      | OP             | Record timestamp       | Operational            |
| `updatedAt`      | OP             | Record timestamp       | Operational            |

### Deal

| Field       | Classification | Purpose             | Retention Basis           |
| ----------- | -------------- | ------------------- | ------------------------- |
| `id`        | OP             | Internal identifier | Required for relations    |
| `companyId` | OP             | Relation to Company | Required for relation     |
| `leadId`    | OP             | Relation to Lead    | Required for relation     |
| `title`     | CC             | Deal description    | Business record           |
| `stage`     | OP             | Pipeline stage      | Sales process             |
| `value`     | CC             | Deal monetary value | **AC** — financial record |
| `currency`  | CC             | Currency of value   | **AC** — financial record |
| `metadata`  | CC             | Extensible data     | Business record           |
| `createdAt` | OP             | Record timestamp    | Operational               |
| `updatedAt` | OP             | Record timestamp    | Operational               |

### Conversation

| Field            | Classification | Purpose               | Retention Basis        |
| ---------------- | -------------- | --------------------- | ---------------------- |
| `id`             | OP             | Internal identifier   | Required for relations |
| `organizationId` | OP             | Tenant scope          | Required for tenancy   |
| `channel`        | OP             | Communication channel | Operational            |
| `externalId`     | OP             | Provider message ID   | Idempotency            |
| `title`          | CC             | Conversation topic    | Business context       |
| `aiSummary`      | CC             | AI-generated summary  | Business insight       |
| `metadata`       | CC             | Extensible data       | Business record        |
| `createdAt`      | OP             | Record timestamp      | Operational            |
| `updatedAt`      | OP             | Record timestamp      | Operational            |

### Message

| Field            | Classification | Purpose                                                                                          | Retention Basis                       |
| ---------------- | -------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------- |
| `id`             | OP             | Internal identifier                                                                              | Required for relations                |
| `conversationId` | OP             | Relation to Conversation                                                                         | Required for relation                 |
| `senderType`     | OP             | AI/User/System flag                                                                              | Operational                           |
| `content`        | **PII** / CC   | Message body — may contain personal names, contact info, trade terms, or sensitive business data | Business record (trade communication) |
| `metadata`       | OP             | Extensible data                                                                                  | Operational                           |
| `createdAt`      | OP             | Record timestamp                                                                                 | Operational                           |

### Quotation

| Field            | Classification | Purpose                                                          | Retention Basis                  |
| ---------------- | -------------- | ---------------------------------------------------------------- | -------------------------------- |
| `id`             | OP             | Internal identifier                                              | Required for relations           |
| `organizationId` | OP             | Tenant scope                                                     | Required for tenancy             |
| `leadId`         | OP             | Relation to Lead                                                 | Required for relation            |
| `title`          | CC             | Quotation name                                                   | Business record                  |
| `content`        | **PII** / CC   | Quotation body — may contain pricing, terms, customer references | **AC** — trade contract evidence |
| `status`         | OP             | Draft/Sent/Won/Lost                                              | Sales process                    |
| `totalAmount`    | CC             | Quoted amount                                                    | **AC** — financial record        |
| `currency`       | CC             | Currency                                                         | **AC** — financial record        |
| `metadata`       | CC             | Extensible data                                                  | Business record                  |
| `createdAt`      | OP             | Record timestamp                                                 | Operational                      |
| `updatedAt`      | OP             | Record timestamp                                                 | Operational                      |

### QuotationLineItem

| Field      | Classification | Purpose                                | Retention Basis                             |
| ---------- | -------------- | -------------------------------------- | ------------------------------------------- |
| All fields | CC             | Line-level pricing and product details | **AC** — part of quotation financial record |

### Task

| Field            | Classification | Purpose             | Retention Basis        |
| ---------------- | -------------- | ------------------- | ---------------------- |
| `id`             | OP             | Internal identifier | Required for relations |
| `organizationId` | OP             | Tenant scope        | Required for tenancy   |
| `leadId`         | OP             | Relation to Lead    | Required for relation  |
| `assigneeId`     | OP             | Assigned user       | Operational            |
| `title`          | CC             | Task subject        | Business record        |
| `description`    | CC             | Task details        | Business record        |
| `status`         | OP             | Open/Done status    | Operational            |
| `dueAt`          | OP             | Due date            | Operational            |
| `metadata`       | CC             | Extensible data     | Business record        |
| `createdAt`      | OP             | Record timestamp    | Operational            |
| `updatedAt`      | OP             | Record timestamp    | Operational            |

### Notification

| Field            | Classification | Purpose               | Retention Basis        |
| ---------------- | -------------- | --------------------- | ---------------------- |
| `id`             | OP             | Internal identifier   | Required for relations |
| `organizationId` | OP             | Tenant scope          | Required for tenancy   |
| `title`          | CC             | Notification subject  | Business record        |
| `body`           | CC             | Notification content  | Business record        |
| `audience`       | OP             | Target group          | Operational            |
| `status`         | OP             | Draft/Published       | Operational            |
| `metadata`       | OP             | Extensible data       | Operational            |
| `createdAt`      | OP             | Record timestamp      | Operational            |
| `publishedAt`    | OP             | Publication timestamp | Operational            |

### AuditLog

| Field            | Classification | Purpose                                                                               | Retention Basis      |
| ---------------- | -------------- | ------------------------------------------------------------------------------------- | -------------------- |
| `id`             | **AC**         | Immutable record identifier                                                           | Required for audit   |
| `organizationId` | OP             | Tenant scope                                                                          | Required for tenancy |
| `actorUserId`    | OP             | Who performed action                                                                  | Required for audit   |
| `actionName`     | **AC**         | What action was taken                                                                 | Required for audit   |
| `riskLevel`      | **AC**         | Risk classification                                                                   | Required for audit   |
| `input`          | **AC** / PII   | Action input (redacted before storage — sensitive fields masked, emails/phone masked) | Required for audit   |
| `result`         | **AC**         | Action output                                                                         | Required for audit   |
| `approved`       | **AC**         | Approval status                                                                       | Required for audit   |
| `createdAt`      | **AC**         | Immutable timestamp                                                                   | Required for audit   |

### ApprovalRequest

| Field            | Classification | Purpose                    | Retention Basis         |
| ---------------- | -------------- | -------------------------- | ----------------------- |
| `id`             | **AC**         | Approval record identifier | Required for compliance |
| `organizationId` | OP             | Tenant scope               | Required for tenancy    |
| `requestedById`  | OP             | Who requested              | Required for audit      |
| `reviewedById`   | OP             | Who reviewed               | Required for audit      |
| `actionName`     | **AC**         | Action being approved      | Required for compliance |
| `riskLevel`      | **AC**         | Risk at time of approval   | Required for compliance |
| `status`         | **AC**         | Approval lifecycle state   | Required for compliance |
| `input`          | **AC**         | Action input               | Required for audit      |
| `reason`         | **AC**         | Rationale                  | Required for audit      |
| `reviewNote`     | **AC**         | Reviewer notes             | Required for audit      |
| `result`         | **AC**         | Execution result           | Required for audit      |
| `createdAt`      | **AC**         | Immutable timestamp        | Required for compliance |
| `reviewedAt`     | **AC**         | Review timestamp           | Required for audit      |
| `executedAt`     | **AC**         | Execution timestamp        | Required for audit      |

### WebhookEvent

| Field            | Classification | Purpose                                                            | Retention Basis                                        |
| ---------------- | -------------- | ------------------------------------------------------------------ | ------------------------------------------------------ |
| `id`             | OP             | Internal identifier                                                | Required for relations                                 |
| `organizationId` | OP             | Tenant scope                                                       | Required for tenancy                                   |
| `channel`        | OP             | Webhook channel                                                    | Operational                                            |
| `eventKey`       | OP             | Idempotency key                                                    | Operational                                            |
| `status`         | OP             | Processing state                                                   | Operational                                            |
| `sourceIp`       | **PII**        | Sender IP address (if captured)                                    | Security/rate limiting; not displayed in UI            |
| `payload`        | **PII** / CC   | Raw webhook body — may contain customer fields, PII, trade secrets | **Redacted after 90 days** (see Data Retention Policy) |
| `result`         | OP             | Processing result                                                  | Operational                                            |
| `error`          | OP             | Error details                                                      | Operational                                            |
| `receivedAt`     | OP             | Receipt timestamp                                                  | Operational                                            |
| `processedAt`    | OP             | Processing timestamp                                               | Operational                                            |

### WebhookIntegration

| Field               | Classification | Purpose                         | Retention Basis         |
| ------------------- | -------------- | ------------------------------- | ----------------------- |
| `id`                | OP             | Internal identifier             | Required for relations  |
| `organizationId`    | OP             | Tenant scope                    | Required for tenancy    |
| `channel`           | OP             | Integration channel             | Operational             |
| `providerAccountId` | OP             | Provider-side identifier        | Required for routing    |
| `secretHash`        | **Secret**     | HMAC/SHA hash of webhook secret | Never exposed in API/UI |
| `status`            | OP             | Active/Disabled                 | Operational             |
| `createdAt`         | OP             | Record timestamp                | Operational             |
| `rotatedAt`         | OP             | Last rotation timestamp         | Operational             |

### Job

| Field      | Classification | Purpose        | Retention Basis                                 |
| ---------- | -------------- | -------------- | ----------------------------------------------- |
| All fields | OP             | Queue metadata | Operational — deleted 90d after terminal status |

### AiUsageEvent

| Field      | Classification | Purpose                                       | Retention Basis                                 |
| ---------- | -------------- | --------------------------------------------- | ----------------------------------------------- |
| All fields | OP / CC        | Usage metering — estimated cost is commercial | Aggregated for billing; raw records kept 1 year |

### ReportSnapshot

| Field      | Classification | Purpose                         | Retention Basis                                         |
| ---------- | -------------- | ------------------------------- | ------------------------------------------------------- |
| All fields | OP / CC        | Report data — aggregate, no PII | Operational — snapshots can be archived after relevance |

## Cross-Cutting Rules

1. **PII in free-text fields**: Fields marked "PII / CC" (Message.content, Quotation.content, WebhookEvent.payload) are free text that may contain PII or commercial data. These fields are:
   - Redacted from audit logs by `redactForAudit()`
   - Not searchable by content in standard UI
   - Subject to retention-based purging (webhook payload: 90 days)

2. **Audit-critical immutability**: AuditLog and ApprovalRequest records are **immutable by application logic**. No update endpoint exists. Direct database modification requires documented legal process.

3. **Tenant data ownership**: Every model with `organizationId` is tenant-scoped. No cross-tenant query is possible through the application. The Organization record is the root of all tenant data; deleting an Organization cascades to all child records.

4. **Export scope**: A tenant data export includes all records where `organizationId = tenant.id`. The export is a JSON bundle organized by model.

5. **Deletion rules**:
   - PII fields (email, phone, name) can be anonymized independently when deletion is requested but audit trail must be preserved
   - AuditLog and ApprovalRequest records cannot be deleted — PII within them is redacted instead
   - WebhookEvent payload is automatically redacted after 90 days (payload field set to NULL)
   - Jobs are deleted 90 days after terminal status (COMPLETED/FAILED/CANCELLED)
   - Organization deletion cascades to all child data

6. **Access control by data class**:

| Data Class | OWNER      | ADMIN      | SALES      | OPERATOR   | VIEWER |
| ---------- | ---------- | ---------- | ---------- | ---------- | ------ |
| PII        | Read/Write | Read/Write | Read       | Read       | —      |
| CC         | Read/Write | Read/Write | Read       | Read       | Read   |
| AC         | Read       | Read       | —          | —          | —      |
| OP         | Read/Write | Read/Write | Read/Write | Read/Write | Read   |
| Secret     | Write only | —          | —          | —          | —      |

## Related Documents

- `docs/18_DATA_RETENTION.md` — retention schedules per data class
- `docs/06_SECURITY_AND_TENANCY.md` — tenant isolation and access control
- `docs/01_ARCHITECTURE.md` — how data flows between packages
