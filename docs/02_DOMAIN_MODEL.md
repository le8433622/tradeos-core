# TradeOS Domain Model

## Modeling Principles

1. Tenant-owned objects must include `organizationId`.
2. Core reporting fields should be explicit columns, not only `metadata`.
3. `metadata` is allowed for provider-specific or experimental fields.
4. External IDs must be scoped by organization and provider/channel.
5. Risky lifecycle transitions should be actions, not raw updates.
6. Deletion should be rare, role-gated, audit-logged, and preferably soft-delete for customer data.

## Core Entities

### Organization

Represents an exporter, importer, distributor, logistics provider, service provider, association, or other tenant workspace.

Required fields:

- `id`
- `name`
- `type`

Common optional fields:

- `country`
- `website`
- `metadata`

Rules:

- All tenant-owned data belongs to an organization.
- Organization deletion is destructive and must not be available in normal tenant UI.

### User

Represents an authenticated person mapped to an organization and role.

Required fields:

- `id`
- `organizationId`
- `email`
- `role`

Rules:

- Production auth must resolve user identity through Supabase.
- Demo auth is local-only.
- Future multi-organization support should introduce `Membership` instead of overloading `User`.

### Company

Represents a buyer, seller, partner, logistics provider, service provider, or other trade relationship.

Required fields:

- `id`
- `organizationId`
- `name`
- `type`

Common optional fields:

- `country`
- `industry`
- `website`
- `notes`
- `metadata`

Rules:

- Company matching must never cross tenant boundaries unless an explicit opt-in marketplace model exists.
- Company records should be linked to contacts, leads, and deals where possible.

### Contact

Represents a person at a company or an inbound trade contact.

Common fields:

- `companyId`
- `name`
- `email`
- `phone`
- `title`
- `country`

Rules:

- If contact becomes tenant-owned independent of company, add `organizationId`.
- PII display and export should be role-aware in production.

### Lead

Represents a potential trade opportunity from inbound messages, manual input, partner referral, or association routing.

Required fields:

- `id`
- `organizationId`
- `source`
- `status`

Common optional fields:

- `companyId`
- `name`
- `phone`
- `email`
- `need`
- `score`
- `aiSummary`
- `nextAction`
- `metadata`

Recommended future explicit fields:

- `productCategory`
- `quantity`
- `destinationCountry`
- `originCountry`
- `budget`
- `currency`
- `timeline`
- `incoterm`

Rules:

- AI may create low-risk leads through `crm.createLead`.
- Lead deletion is high-risk.
- Lead status changes should be auditable.

### Task

Represents follow-up or operational work.

Required fields:

- `id`
- `organizationId`
- `title`
- `status`

Common optional fields:

- `leadId`
- `assigneeId`
- `description`
- `dueAt`
- `metadata`

Rules:

- AI may create follow-up tasks.
- Assignment must reference a user in the same organization.

### Product

Represents products a company can sell, buy, source, or quote.

Required fields:

- `id`
- `organizationId`
- `name`

Common optional fields:

- `category`
- `description`
- `originCountry`
- `priceRange`
- `moq`
- `certification`
- `metadata`

Rules:

- Product data powers quotation drafting and partner matching.
- Product publication to a marketplace requires opt-in consent.

### TradeRequest

Recommended future entity for structured buyer/seller demand extracted from messages.

Recommended fields:

- `organizationId`
- `leadId`
- `requestType`
- `productCategory`
- `description`
- `quantity`
- `originCountry`
- `destinationCountry`
- `incoterm`
- `budget`
- `currency`
- `timeline`
- `status`
- `metadata`

Rules:

- Use when lead `need` becomes too unstructured for reporting.
- TradeRequest should not replace Lead; it structures the trade need attached to a lead.

### Quotation

Represents a commercial quotation draft or sent quote.

Required fields:

- `id`
- `organizationId`
- `title`
- `content`
- `status`

Common optional fields:

- `leadId`
- `totalAmount`
- `currency`
- `metadata`

Recommended future fields:

- `validUntil`
- `incoterm`
- `paymentTerms`
- `leadTime`
- `version`
- `sentAt`

Rules:

- AI may draft quotations.
- Sending quotations is high-risk and requires approval.
- Quotation amount, delivery terms, and certifications require human review.

### QuotationLineItem

Recommended future entity for structured quote details.

Recommended fields:

- `quotationId`
- `productId`
- `description`
- `quantity`
- `unit`
- `unitPrice`
- `currency`
- `totalAmount`
- `metadata`

Rules:

- Add before building serious quotation editing.
- Line items must belong to a quotation in the same organization through relation traversal.

### Deal

Represents commercial pipeline after qualification.

Required fields:

- `id`
- `title`
- `stage`

Common optional fields:

- `companyId`
- `leadId`
- `value`
- `currency`
- `metadata`

Rules:

- Add `organizationId` if deals become queried independently from company/lead.
- Deal stage transitions should be auditable once used for reporting.

### Conversation

Represents a channel thread or manual conversation.

Required fields:

- `id`
- `organizationId`
- `channel`

Common optional fields:

- `externalId`
- `title`
- `aiSummary`
- `metadata`

Rules:

- Conversation lookup by external provider ID must be tenant-scoped.
- A conversation must preserve raw message history.

### Message

Represents a single inbound/outbound/system/AI message.

Required fields:

- `id`
- `conversationId`
- `senderType`
- `content`

Rules:

- Messages are tenant-scoped through conversation.
- Raw customer text should not be silently discarded.

### WebhookEvent

Represents a received external event and its processing state.

Required fields:

- `id`
- `organizationId`
- `channel`
- `eventKey`
- `status`

Rules:

- Unique by organization, channel, and event key.
- Duplicate events must not create duplicate business objects.
- Failed events must be inspectable and retryable.

### ApprovalRequest

Represents a high-risk action waiting for human review.

Required fields:

- `id`
- `organizationId`
- `actionName`
- `riskLevel`
- `status`
- `input`

Rules:

- Approved requests execute through `executeAction` with `approved=true`.
- Approval review and execution should be visible in audit logs.

### AuditLog

Represents policy/action execution history.

Required fields:

- `id`
- `actionName`
- `riskLevel`
- `approved`
- `createdAt`

Common optional fields:

- `organizationId`
- `actorUserId`
- `input`
- `result`

Rules:

- Every registered mutation must write an audit log.
- Failed or blocked policy attempts should also be logged.

### Notification

Represents tenant or association notifications.

Rules:

- Drafting notifications can be low-risk.
- Sending bulk notifications is high-risk and approval-gated.

### ReportSnapshot

Recommended future entity for generated association reports and weekly metrics.

Recommended fields:

- `organizationId`
- `reportType`
- `periodStart`
- `periodEnd`
- `metrics`
- `summary`
- `createdBy`
- `createdAt`

Rules:

- Store snapshots when report numbers need auditability over time.

## Status Lifecycle Guidelines

Lead statuses:

- `NEW`
- `CONTACTED`
- `QUALIFIED`
- `QUOTED`
- `WON`
- `LOST`

Quotation statuses:

- `DRAFT`
- `SENT`
- `ACCEPTED`
- `REJECTED`
- `EXPIRED`

Approval statuses:

- `PENDING`
- `APPROVED`
- `REJECTED`
- `EXECUTED`
- `FAILED`

Webhook statuses:

- `RECEIVED`
- `DUPLICATE`
- `BLOCKED`
- `PROCESSED`
- `FAILED`
