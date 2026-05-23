# TradeOS Architecture

## Principle

TradeOS is a business operating layer for trade workflows. It keeps manual flows as the source of truth and lets AI operate only by calling registered actions through policy.

## Runtime Flow

```txt
Inbound message
-> Webhook gateway
-> Webhook event idempotency check
-> Conversation/message storage
-> AI triage
-> Agent plan
-> Registered action
-> Policy engine
-> Audit log
-> Database mutation
-> Dashboard/notification update
-> Optional approval queue
```

## Layered Architecture

```txt
UI Layer
  Next.js pages, route handlers, forms, dashboards

Application Layer
  API routes, server-side session resolution, validation, orchestration

Domain Layer
  CRM, trade, inbox, approval, policy, AI, webhook, analytics packages

Data Layer
  Prisma schema, migrations, database client, tenant-scoped queries

Infrastructure Layer
  Supabase Postgres/Auth, Vercel, Cloudflare, external channels, AI provider
```

## Application Boundaries

### `apps/web`

Owns tenant dashboard, API routes, protected UI, auth callback, and operational pages.

Rules:

- Pages may read tenant-scoped data.
- Mutations should call registered actions where practical.
- API routes must resolve session before accessing tenant data.
- Production pages must not rely on demo auth.

### `apps/admin`

Future internal/superadmin console.

Rules:

- Build only after tenant app controls are stable.
- Superadmin access must be separate from tenant roles.
- No cross-tenant data exposure without explicit admin policy.

### `apps/worker`

Background processor for webhooks, AI jobs, reports, retries, and scheduled tasks.

Implementation: `apps/worker` runs `tsx src/index.ts`, registers processors via `@tradeos/job-core`, and polls for pending jobs. First processor: `PROCESS_WEBHOOK_EVENT` — fetches webhook event by ID, extracts channel-specific message content, calls `ingestInboundMessage` + `runTradeAgent`, then marks processed/failed.

Rules:

- Jobs must be idempotent.
- Jobs must record status and failures.
- Jobs that mutate tenant data must use registered actions or explicit internal action boundaries.

## Package Boundaries

### `packages/database`

Owns Prisma schema, migrations, generated client, and database exports.

### `packages/auth`

Owns Supabase user resolution, local demo auth boundary, tenant session helpers, and role context.

### `packages/policy-core`

Owns registered action registry, role gates, risk levels, AI approval gates, and audit writes.

### `packages/ai-core`

Owns intent detection, structured AI plans, tool/action selection, safety fallbacks, and evaluation fixtures.

### `packages/crm-core`

Owns lead, company, contact, task, and follow-up domain actions.

### `packages/trade-core`

Owns products, trade requests, quotations, partner suggestions, and trade workflow actions.

### `packages/job-core`

Owns `Job` model access (`enqueueJob`, `claimNextJob`, `completeJob`, `failJob` with backoff), processor registry (`JobProcessor` contract, `registerProcessor`), and the polling worker loop (`runWorkerLoop` with graceful shutdown).

### `packages/inbox-core`

Owns conversations, messages, channel normalization, and inbound message storage.

### `packages/webhook-core`

Owns webhook signature checks, idempotency, event state, rate-limit helpers, and retry metadata.

### `packages/approval-core`

Owns approval request lifecycle and execution of approved actions.

### `packages/notification-core`

Future package for internal notifications, association broadcasts, and high-risk bulk-send approval gates.

### `packages/analytics-core`

Owns metrics aggregation, dashboard queries, report generation, conversion analytics, stale opportunity detection, and association reports.

## Mutation Patterns

### Preferred Manual Mutation

```txt
User action
-> API route/server action
-> require session
-> validate input
-> execute registered action
-> policy check
-> handler writes database
-> audit log
-> response
```

### Required AI Mutation

```txt
AI plan
-> registered action only
-> policy check with source=ai
-> low-risk action executes
-> high-risk action creates approval request
-> audit log
```

### Read Pattern

```txt
require session
-> derive organizationId from session
-> query with organizationId
-> render or return response
```

## High-Risk Actions

These must require approval before execution:

- sending quotations
- deleting customer/company/trade data
- changing payment state
- sending bulk messages
- altering user permissions
- approving contracts
- publishing marketplace listings
- sharing data across organizations

## Production Architecture Direction

The practical production direction is:

1. Keep one `apps/web` until the tenant dashboard is stable.
2. Add `apps/worker` when webhook/AI/report workloads need retries and queues.
3. Add `apps/admin` only when internal operations need cross-tenant tools.
4. Keep domain logic in packages, not app routes.
5. Keep production infrastructure changes explicit and documented.

## Marketplace Boundary

Marketplace features are not part of the initial architecture. They require:

- repeated demand evidence from CRM/inbox data
- opt-in data sharing model
- approval-gated introductions
- privacy policy and dispute process
- monetization trigger definition
