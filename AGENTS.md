# TradeOS Engineering Agent Charter

This file is the operating contract for coding agents working in this repository.

## Mission

Build TradeOS Core as a production-grade operating layer for international trade teams. The product must make trade relationships measurable, auditable, and executable before it becomes a marketplace.

## First Thing To Read

Read `RULES.md` — it contains EVERY concrete rule discovered through code review and production analysis. It is the single source of truth for avoiding past mistakes. Every agent must follow it.

For the detailed agent operating manual, read `agent.md`. It contains the Anti-Rework Execution Loop and Production Definition Of Done. For executable task sequencing, read `docs/12_TASK_PLAN.md`, `docs/13_CHECKPOINTS.md`, and `docs/25_PHASE18_RBAC_AND_SETTINGS.md`.

## Non-Negotiable Rules

1. Manual workflows are the source of truth.
2. AI never writes directly to the database.
3. AI may only call registered actions through `@tradeos/policy-core`.
4. Every tenant-scoped query must include `organizationId`.
5. Every risky action must create an approval path before execution.
6. Every mutation through a registered action must create an audit log.
7. Demo auth is local-only. Production must set `ALLOW_DEMO_AUTH=false`.
8. Secrets stay in environment variables, never in source code.
9. Read `RULES.md` before writing any code. Know which anti-patterns are forbidden.
10. Production-connected GitHub, Supabase, Vercel, and Cloudflare operations require an explicit production-ops task.
11. Fix root causes, not symptoms. Search sibling paths before editing.
12. Never mark work complete unless build/tests/manual verification were actually run or explicitly documented as skipped.
13. No known HIGH or CRITICAL issue may remain in touched code without being fixed or declared as a blocker.

## Local Commands

Use Node 20.x for parity with Vercel.

```bash
pnpm install
pnpm db:generate
pnpm db:seed
pnpm build
pnpm --filter @tradeos/web dev
```

If `pnpm` is not on PATH in the local desktop shell, use the installed binary path or enable Corepack.

## Architecture Boundaries

- `apps/web`: Next.js dashboard, API routes, auth callback, protected UI.
- `packages/database`: Prisma schema and client export.
- `packages/auth`: Supabase user resolution and tenant session helpers.
- `packages/policy-core`: action registry, role gates, AI approval gates, audit writes.
- `packages/ai-core`: intent detection and agent planning.
- `packages/crm-core`: lead and follow-up actions.
- `packages/trade-core`: quotation and partner actions.
- `packages/inbox-core`: inbound conversation/message ingestion.
- `packages/webhook-core`: webhook receipt, idempotency, processing state.
- `packages/approval-core`: approval lifecycle and execution of approved actions.
- `packages/analytics-core`: billing metrics, usage export, report snapshots, data anonymization.

> **Phase 18 update**: `packages/auth` will evolve to support multi-org membership via `OrganizationMember` join table. `packages/policy-core` will add `assertPermission()` which supersedes `assertRole()`. See `docs/25_PHASE18_RBAC_AND_SETTINGS.md`.

## Change Discipline

Before editing:

1. Read `RULES.md` first.
2. Read the package that owns the behavior.
3. Check whether an existing registered action already exists.
4. Keep database writes behind an action, approval, or explicit API boundary.
5. Update docs when behavior, deployment, or security posture changes.
6. Check `docs/13_CHECKPOINTS.md` for current status and blockers.
7. For cross-cutting changes, check `docs/adr/` for relevant decisions and create a new ADR if none exists.
8. Use `CODEOWNERS` to identify the right reviewer for changes.
9. Search for sibling anti-patterns so the same bug is not fixed repeatedly.

Before finishing:

1. Run `pnpm db:generate` after Prisma/schema changes.
2. Run `pnpm build`.
3. Check `RULES.md` section 12 (Build & Verification Checklist).
4. Record any skipped checks and why.
5. Leave checkpoint and deployment notes in `docs/13_CHECKPOINTS.md` when relevant.
6. State residual risks honestly. Do not claim production readiness if known HIGH or CRITICAL issues remain.

## Production Definition Of Done

A feature is production-ready only when it has:

- tenant isolation,
- role-aware access control,
- auditability,
- failure behavior,
- operational documentation,
- and a clear rollback or disable path.
