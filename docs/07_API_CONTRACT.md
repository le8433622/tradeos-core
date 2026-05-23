# API Contract

## API Principles

1. Protected routes must resolve session before reading or writing tenant data.
2. `organizationId` comes from session, not request body.
3. Mutating routes should call registered actions where practical.
4. Responses should be JSON-serializable.
5. Errors should be explicit and safe to expose.
6. Webhook routes must verify source and record idempotency before processing.

## Standard Error Shape

```ts
type ApiError = {
  error: string;
  code?: string;
  details?: unknown;
};
```

## Standard Auth Pattern

```txt
request
-> requireSessionFromRequest(request)
-> derive organizationId and role
-> validate input
-> read tenant data or execute action
-> return JSON
```

## Endpoint Inventory

| Method | Path                         | Auth            | Purpose                  | Mutation Boundary                                   |
| ------ | ---------------------------- | --------------- | ------------------------ | --------------------------------------------------- |
| GET    | `/api/health`                | No              | Health check             | None                                                |
| GET    | `/api/leads`                 | Yes             | List leads               | Read with tenant scope                              |
| POST   | `/api/leads`                 | Yes             | Create lead              | `crm.createLead`                                    |
| GET    | `/api/leads/:id`             | Yes             | Lead detail              | Read with tenant scope                              |
| PATCH  | `/api/leads/:id`             | Yes             | Update lead              | `crm.updateLeadStatus` or future lead update action |
| GET    | `/api/companies`             | Yes             | List companies           | Read with tenant scope                              |
| POST   | `/api/companies`             | Yes             | Create company           | `crm.createCompany`                                 |
| GET    | `/api/companies/:id`         | Yes             | Company detail           | Read with tenant scope                              |
| GET    | `/api/conversations`         | Yes             | List conversations       | Read with tenant scope                              |
| GET    | `/api/conversations/:id`     | Yes             | Conversation timeline    | Read with tenant scope                              |
| POST   | `/api/agent`                 | Yes             | Run trade agent          | AI through policy actions                           |
| GET    | `/api/quotations`            | Yes             | List quotations          | Read with tenant scope                              |
| POST   | `/api/quotations`            | Yes             | Draft quotation          | `trade.draftQuotation`                              |
| GET    | `/api/approvals`             | Yes             | List approval requests   | Read with tenant scope                              |
| POST   | `/api/approvals`             | Yes             | Create approval request  | `approval-core`                                     |
| POST   | `/api/approvals/:id/approve` | Yes             | Approve request          | `approval-core`                                     |
| POST   | `/api/approvals/:id/reject`  | Yes             | Reject request           | `approval-core`                                     |
| POST   | `/api/approvals/:id/execute` | Yes             | Execute approved request | `executeAction` with approved context               |
| POST   | `/api/webhooks/inbox`        | Provider/secret | Generic inbound message  | webhook-core then inbox/AI                          |
| POST   | `/api/webhooks/zalo`         | Provider/secret | Zalo inbound message     | webhook-core then inbox/AI                          |
| POST   | `/api/webhooks/whatsapp`     | Provider/secret | WhatsApp inbound message | webhook-core then inbox/AI                          |
| POST   | `/api/webhooks/email`        | Provider/secret | Email inbound message    | webhook-core then inbox/AI                          |

## Endpoint Contracts

### `GET /api/health`

Auth: not required.

Behavior:

- return service health
- optionally include database connectivity status when safe

Acceptance:

- returns 200 when app is healthy
- does not expose secrets

### `GET /api/leads`

Auth: required.

Tenant: `session.organizationId`.

Behavior:

- list leads for current organization
- sort newest first by default

Acceptance:

- cannot return leads from another organization
- viewer can read if product policy allows

### `POST /api/leads`

Auth: required.

Tenant: `session.organizationId`.

Body:

```ts
type CreateLeadBody = {
  source: string;
  name?: string;
  email?: string;
  phone?: string;
  need?: string;
};
```

Behavior:

- call `crm.createLead`
- write audit through policy-core

Acceptance:

- creates lead in current organization only
- rejected role is blocked
- request body cannot override organization

### `POST /api/agent`

Auth: required.

Tenant: `session.organizationId`.

Body:

```ts
type AgentBody = {
  channel?: "web" | "zalo" | "whatsapp" | "email" | "manual";
  text: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
};
```

Behavior:

- construct incoming message with session organization
- run trade agent
- execute safe actions through policy
- return plan and results

Acceptance:

- AI does not call Prisma directly
- high-risk steps are not executed without approval
- audit logs are written for executed actions

### `POST /api/webhooks/*`

Auth: provider signature or shared secret.

Tenant: resolved from secure route config, provider mapping, or current session in local/demo mode.

Behavior:

- verify webhook secret/signature
- derive idempotency key
- store webhook event
- normalize payload into inbox message
- store conversation and message
- run AI triage or queue processing
- mark processed or failed

Acceptance:

- duplicate event does not create duplicate business data
- failed processing is inspectable
- unsigned production request is rejected
- raw payload is not trusted as domain data

## API Versioning

Initial app can use unversioned routes. Add `/api/v1` only when external consumers need stable contracts.

## Validation Direction

Add a runtime validation library when request bodies become complex. Until then, validate required fields manually and fail closed.
