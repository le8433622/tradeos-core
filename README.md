# TradeOS Core

**Độc lập · Tự do · Hạnh phúc**

Operating system for measurable, auditable, executable trade relationships.

## Mission

TradeOS exists to eliminate asymmetric information in international trade. We turn fragmented, opaque supply chains into structured cases that anyone can audit, decide on, and learn from.

We are not a marketplace, CRM, ERP, or chatbot. We are an execution OS for trade teams.

## Core Chain

```txt
Human pain
→ Structured trade case
→ Evidence-gated actions
→ Risk-adjusted recommendation
→ Buyer decision
→ Outcome recording
→ Organizational learning
```

Everything in TradeOS strengthens one link in this chain.

## Strategic Wedge: Supplier Switch Intelligence

Current focus: **Am I buying from the right supplier, or should I switch, negotiate, or wait?**

Every sourcing run captures:

- Who is buying, what, from whom, at what price
- What hurts (pain categories, evidence gaps, decision authority)
- Current baseline + alternative quotes with evidence
- Risk-adjusted recommendation (SWITCH / NEGOTIATE / WAIT / INSUFFICIENT_EVIDENCE)
- Buyer decision and actual outcome

## Current State

| Capability                                             | Status      |
| ------------------------------------------------------ | ----------- |
| Demo auth (cookie/header bypass)                       | ✅ Done     |
| Global app shell + sidebar navigation                  | ✅ Done     |
| Dashboard with stats + outcome tracking                | ✅ Done     |
| Trade pain intake (3-step form)                        | ✅ Done     |
| Sourcing run lifecycle (DRAFT → REPORT_DELIVERED)      | ✅ Done     |
| Baseline + alternatives + quotes + evidence            | ✅ Done     |
| Switch decision engine (INSUFFICIENT_EVIDENCE gates)   | ✅ Done     |
| Buyer report (6-section decision freedom report)       | ✅ Done     |
| Buyer decision + outcome recording                     | ✅ Done     |
| Outcome as truth (stale approval detection)            | ✅ Done     |
| Real pilot: Coffee Bean Sourcing (Vietnam → Singapore) | ✅ Seeded   |
| Multi-org RBAC (OrganizationMember join table)         | 🏗️ Phase 18 |

## Deployment

- **Production**: [https://tradeos-core.vercel.app](https://tradeos-core.vercel.app)
- **Staging**: Supabase `ulnjanlaehfmxurreibj` · `pnpm dev`

## Non-Negotiable Rules

1. Manual workflows are the source of truth.
2. AI never writes directly to the database.
3. AI may only call registered actions through `@tradeos/policy-core`.
4. Every tenant-scoped query must include `organizationId`.
5. Every risky action must create an approval path before execution.
6. Every mutation through a registered action must create an audit log.
7. Demo auth is local-only. Production must set `ALLOW_DEMO_AUTH=false`.
8. Secrets stay in environment variables, never in source code.

Full rule document: `RULES.md`.

## Stack

- **Monorepo**: Turborepo + pnpm
- **Runtime**: Node 20, TypeScript
- **Frontend**: Next.js App Router, React
- **Database**: Prisma + Supabase Postgres
- **Auth**: Supabase Auth + demo auth for local development
- **Deployment**: Vercel + Cloudflare-ready

## Structure

```
apps/
  web/        Tenant dashboard and API routes
  worker/     Background jobs
packages/
  database/     Prisma schema and client
  auth/         Tenant/session helpers
  policy-core/  Action registry, role/permission gates, audit
  ai-core/      Intent detection and agent planning
  sourcing-core/ Sourcing runs, procurement actions, switch decisions
  crm-core/     Lead and follow-up actions
  trade-core/   Quotation and partner actions
  evidence-core/ Evidence lifecycle
  approval-core/ Approval lifecycle and execution
  plan-core/     Plan and entitlement checks
  analytics-core/ Billing metrics, usage export
  inbox-core/    Inbound message ingestion
  webhook-core/  Webhook receipt and idempotency
  job-core/      Job queue and scheduling
```

## Getting Started

```bash
pnpm install
pnpm db:generate
pnpm db:seed
pnpm build
pnpm --filter @tradeos/web dev
```

Requires Node 20.x and a Supabase project. See `docs/10_DEPLOYMENT_RUNBOOK.md`.

## Verification

| Command          | Purpose                 |
| ---------------- | ----------------------- |
| `pnpm typecheck` | TypeScript strict check |
| `pnpm build`     | Production build        |
| `pnpm test`      | All test suites         |
| `pnpm lint`      | ESLint                  |

## Key Documents

- `RULES.md` — Hard rules from production analysis
- `agent.md` — Agent operating manual
- `AGENTS.md` — Repository charter
- `docs/13_CHECKPOINTS.md` — Production readiness ledger
- `docs/10_DEPLOYMENT_RUNBOOK.md` — Deployment procedures
- `docs/04_ACTION_REGISTRY.md` — Registered actions reference
