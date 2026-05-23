# ADR 0004: Monorepo With Domain Packages

## Status

Accepted

## Context

TradeOS spans UI, auth, database, AI, CRM, trade workflows, inbox ingestion, webhooks, approvals, and analytics. Keeping all logic inside the Next.js app would make boundaries unclear and encourage direct database mutation from routes or UI.

## Decision

Use a TypeScript monorepo with application shells under `apps/` and domain packages under `packages/`.

Domain logic belongs in packages. The web app should orchestrate session resolution, validation, action calls, and rendering.

## Package Direction

- `apps/web`: tenant dashboard and API routes
- `apps/admin`: future internal admin console
- `apps/worker`: future background jobs
- `packages/database`: Prisma schema and client
- `packages/auth`: session and tenant resolution
- `packages/policy-core`: registered actions, role gates, audit
- `packages/ai-core`: agent planning and safety
- `packages/crm-core`: lead/company/contact/task actions
- `packages/trade-core`: products, quotations, trade requests, partner suggestions
- `packages/inbox-core`: conversations and messages
- `packages/webhook-core`: webhook receipt and idempotency
- `packages/approval-core`: approval lifecycle
- `packages/notification-core`: future notifications
- `packages/analytics-core`: future metrics and reports

## Consequences

Positive:

- clearer ownership
- easier testing
- safer AI/action boundaries
- easier worker/admin extraction later

Negative:

- more package wiring
- build configuration must stay healthy
- small features may require touching package and app layers

## Rule

If logic is reusable, domain-critical, security-sensitive, or used by AI, put it in a package instead of a page component.
