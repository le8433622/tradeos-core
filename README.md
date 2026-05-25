# TradeOS Core

AI case execution operating system for economic and supply-chain decisions.

TradeOS is not a generic SaaS, CRM, ERP, marketplace, or chatbot. It is a system that turns human economic pain into structured cases, executes tools/actions through a gated policy engine, produces auditable evidence, enables risk-adjusted human decisions, checkpoint billing, and outcome learning.

## Core Chain

```txt
Human pain
→ Economic Case
→ Tool/action execution
→ Evidence
→ Risk-adjusted decision
→ Human approval
→ Checkpoint billing
→ Outcome learning
```

Every feature must strengthen this chain.

## Current Strategic Wedge

**Supplier Switch Intelligence / Procurement Case Execution**

Core question: _Am I buying from the right supplier, or should I switch, negotiate, or wait?_

## Current Project Mode

The repository is in **incident-proof / state-sync mode**. Production availability is being restored after a middleware-related incident. Open issues reflect this priority:

- `#25` — Rebuild current truth after incident recovery (docs sync)
- `#26` — Run authenticated production/staging smoke
- `#27` — Add authenticated E2E harness with env-blocked stop behavior
- `#28` — Define Supplier Switch Intelligence product spec
- `#29` — Design plugin intake layer architecture

Product feature expansion is frozen until production proof gates are clear. See `docs/CURRENT_TRUTH.md` and `docs/13_CHECKPOINTS.md` for live state.

## Non-Negotiable Rules

1. Manual workflows are the source of truth.
2. AI never writes directly to the database.
3. AI may only call registered actions through `@tradeos/policy-core`.
4. Every tenant-scoped query must include `organizationId`.
5. Every risky action must create an approval path before execution.
6. Every mutation through a registered action must create an audit log.
7. Missing env/auth/deployment access is not a code bug.
8. Fix root causes, not symptoms. Search sibling paths before editing.

Full rule document: `RULES.md`.

## Stack

- Turborepo
- TypeScript
- Next.js App Router
- Prisma
- Supabase Postgres (pgvector-ready)
- Redis queue-ready worker
- OpenAI/OpenRouter-compatible AI layer
- Vercel + Cloudflare-ready deployment

## Structure

```txt
apps/
  web/       Tenant dashboard and API routes
  worker/    Background jobs
packages/
  database/     Prisma schema and client
  auth/         Tenant/session helpers
  policy-core/  Action registry, policy gates, audit types
  ai-core/      Intent detection and agent planning
  crm-core/     Lead and follow-up actions
  trade-core/   Quotation and partner actions
  sourcing-core/ Sourcing run and supplier procurement actions
  evidence-core/ Evidence lifecycle actions
  approval-core/ Approval lifecycle and execution
  plan-core/     Plan and entitlement checks
  analytics-core/ Billing metrics, usage export, report snapshots
  inbox-core/    Inbound conversation/message ingestion
  webhook-core/  Webhook receipt, idempotency, processing
  job-core/      Job queue and scheduling
```

See `docs/03_DATABASE_CONTRACT.md` for the full schema contract.

## Getting Started

```bash
pnpm install
pnpm db:generate
pnpm db:seed
pnpm build
pnpm --filter @tradeos/web dev
```

Requires Node 20.x and a Supabase project for local development. See `docs/10_DEPLOYMENT_RUNBOOK.md` for environment setup.

## Verification

| Command              | Purpose                               |
| -------------------- | ------------------------------------- |
| `pnpm typecheck`     | TypeScript strict check (17 packages) |
| `pnpm build`         | Next.js production build              |
| `pnpm test`          | All test suites                       |
| `pnpm docs:check`    | Action registry ↔ docs parity         |
| `pnpm lint`          | ESLint                                |
| `pnpm license:check` | License compliance                    |
| `pnpm routes:check`  | Route ↔ action parity                 |

## Key Documents

- `RULES.md` — Hard rules discovered through code review and production analysis
- `agent.md` — Agent operating manual with anti-rework execution loop
- `AGENTS.md` — Repository charter
- `docs/CURRENT_TRUTH.md` — Short source of truth for current state
- `docs/13_CHECKPOINTS.md` — Honest production readiness ledger
- `docs/SUPER_AGENT_RULER.md` — Governance to prevent infinite agent loops
- `docs/10_DEPLOYMENT_RUNBOOK.md` — Deployment and rollback procedures
- `docs/04_ACTION_REGISTRY.md` — All registered actions with risk/roles/approval
- `docs/06_SECURITY_AND_TENANCY.md` — Security and tenant isolation
