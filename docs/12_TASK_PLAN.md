# TradeOS Task Plan

## Purpose

This is the executable plan for autonomous coding agents. Each task should be small enough to implement, verify, and checkpoint without losing direction.

## Active Post-PR #3 Plan

The current master upgrade plan is `docs/29_PERFECTION_TASK_PLAN.md`. It supersedes older production-readiness sequencing for work after PR #3 and maps the active GitHub issue backlog (#4-#7, #9-#19) into execution gates.

Use this file for the general task format and historical foundation tasks. Use `docs/29_PERFECTION_TASK_PLAN.md` for the current production-perfect roadmap.

## Agent Execution Protocol

For every task:

1. Read `AGENTS.md`.
2. Read `agent.md`.
3. Read `docs/13_CHECKPOINTS.md`.
4. Read this task plan.
5. Read relevant contract docs.
6. Read the owning package before editing.
7. Search for existing implementation.
8. Make the smallest correct change.
9. Run required verification.
10. Update checkpoint if status changed.

## Task ID Format

```txt
T<phase>.<area>.<number>
```

Examples:

- `T0.Foundation.001`
- `T1.Auth.003`
- `T4.AI.008`

## Task Template

```md
### Task ID

T1.Auth.001

### Title

Implement tenant session resolver

### Goal

Resolve authenticated user into session context containing userId, organizationId, role, and authProvider.

### Files To Read First

- `packages/auth/src/*`
- `packages/database/prisma/schema.prisma`
- `docs/06_SECURITY_AND_TENANCY.md`

### Files Allowed To Edit

- `packages/auth/src/tenant.ts`
- `apps/web/lib/page-session.ts`
- `apps/web/app/api/**/route.ts`

### Forbidden

- Do not bypass organizationId.
- Do not add demo auth to production path.
- Do not hardcode organizationId.

### Implementation Steps

1. Read existing auth package.
2. Define or update `SessionContext`.
3. Resolve Supabase user.
4. Load mapped local user by email.
5. Return organizationId and role.
6. Throw clear errors for unauthenticated or unmapped users.

### Acceptance Criteria

- API route can resolve session.
- Page route can resolve session.
- Missing user returns controlled error.
- No tenant query is possible without organizationId.

### Verification

- `pnpm build`

### Rollback

Revert auth resolver changes only. Do not delete user or organization data.
```

## Phase 0: Documentation Operating System

### T0.Foundation.001 Product manifesto

Goal: define what TradeOS is and is not.

Read first:

- `README.md`
- `docs/PRODUCT_FRAMEWORK.md`

Edit:

- `docs/00_PRODUCT_MANIFESTO.md`

Acceptance:

- north star is explicit
- target users are explicit
- marketplace-later rule is explicit
- weekly scorecard is explicit

Verification:

- review diff

### T0.Foundation.002 Architecture contract

Goal: define runtime flow, package boundaries, and mutation patterns.

Edit:

- `docs/01_ARCHITECTURE.md`

Acceptance:

- AI mutation path is policy-gated
- manual mutation path is documented
- package ownership is clear

Verification:

- review diff

### T0.Foundation.003 Domain model contract

Goal: prevent agents from inventing inconsistent entities.

Edit:

- `docs/02_DOMAIN_MODEL.md`

Acceptance:

- core entities are defined
- tenant ownership is clear
- future entities are marked future

Verification:

- review diff

### T0.Foundation.004 Database contract

Goal: define schema and migration discipline.

Edit:

- `docs/03_DATABASE_CONTRACT.md`

Acceptance:

- tenant query pattern is explicit
- migration discipline is explicit
- deletion policy is explicit

Verification:

- review diff

### T0.Foundation.005 Action registry contract

Goal: define allowed actions, risk, roles, and audit expectations.

Edit:

- `docs/04_ACTION_REGISTRY.md`

Acceptance:

- action table exists
- high-risk action handling is clear
- direct DB mutation exceptions are limited

Verification:

- review diff

### T0.Foundation.006 AI agent contract

Goal: define what AI can and cannot do.

Edit:

- `docs/05_AI_AGENT_CONTRACT.md`

Acceptance:

- plan schema exists
- safe and blocked actions are explicit
- fallback behavior is explicit

Verification:

- review diff

### T0.Foundation.007 Security and tenancy contract

Goal: define auth, tenant, secrets, webhook, and production-ops rules.

Edit:

- `docs/06_SECURITY_AND_TENANCY.md`

Acceptance:

- production guardrails are explicit
- tenant scope is non-negotiable
- risky operations require approval

Verification:

- review diff

### T0.Foundation.008 Task and checkpoint system

Goal: create executable agent task sequencing.

Edit:

- `docs/12_TASK_PLAN.md`
- `docs/13_CHECKPOINTS.md`

Acceptance:

- task template exists
- phases exist
- checkpoint format exists

Verification:

- review diff

### T0.Foundation.009 ADR baseline

Goal: record core architectural decisions.

Edit:

- `docs/ADR/*.md`

Acceptance:

- marketplace-later decision is recorded
- AI policy-gate decision is recorded
- production-ops guardrail is recorded
- monorepo package boundary is recorded

Verification:

- review diff

## Phase 1: Auth, Tenant, Policy

### T1.Auth.001 Harden session resolver

Goal: every page/API route can resolve user, organization, role, and auth provider.

Read first:

- `packages/auth/src/*`
- `apps/web/lib/page-session.ts`
- `docs/06_SECURITY_AND_TENANCY.md`

Forbidden:

- no production `demo-org` fallback
- no request-body organization override

Acceptance:

- authenticated user maps to local `User`
- unmapped user goes to pending onboarding
- route handlers receive `SessionContext`

Verification:

- `pnpm build`

### T1.Auth.002 Remove hardcoded organization IDs from production routes

Goal: replace hardcoded tenant IDs with session-derived organization IDs.

Read first:

- `apps/web/app/api/leads/route.ts`
- `apps/web/app/api/companies/route.ts`
- `apps/web/app/api/quotations/route.ts`

Acceptance:

- routes derive organization from session
- tests or manual review confirm no production `demo-org` path
- viewer mutation is blocked by policy where actions exist

Verification:

- `pnpm build`

### T1.Policy.001 Add policy-core tests

Goal: prove role gates, AI approval gates, and audit expectations.

Read first:

- `packages/policy-core/src/index.ts`
- `docs/04_ACTION_REGISTRY.md`

Acceptance:

- allowed roles pass
- denied roles fail
- AI high-risk action fails without approval
- approved context passes

Verification:

- package test command if available
- `pnpm build`

### T1.Policy.002 Enforce same-organization relation validation

Goal: actions must reject related IDs from another organization.

Read first:

- `packages/crm-core/src/index.ts`
- `packages/trade-core/src/index.ts`
- `packages/auth/src/tenant.ts`

Acceptance:

- leadId, companyId, assigneeId checks are tenant-safe
- invalid cross-tenant relation throws clear error

Verification:

- `pnpm build`

## Phase 2: CRM Core

### T2.CRM.001 Add company/contact registered actions

Goal: create and update companies/contacts through policy.

Read first:

- `packages/crm-core/src/index.ts`
- `docs/02_DOMAIN_MODEL.md`
- `docs/04_ACTION_REGISTRY.md`

Acceptance:

- `crm.createCompany` exists
- `crm.updateCompany` exists if UI needs edit
- actions are tenant-scoped
- audit logs are written through policy execution

Verification:

- `pnpm build`

### T2.CRM.002 Lead detail page

Goal: sales user can inspect a lead, related tasks, quotations, and conversation context.

Read first:

- `apps/web/app/leads/page.tsx`
- `packages/database/prisma/schema.prisma`

Acceptance:

- page is protected
- query is tenant-scoped
- empty states are clear
- lead not in tenant returns not found or denied

Verification:

- `pnpm build`

### T2.CRM.003 Task ownership and due dates

Goal: follow-up tasks can be assigned and scheduled.

Read first:

- `packages/crm-core/src/index.ts`
- `apps/web/app/leads/page.tsx`

Acceptance:

- task assignee belongs to same organization
- due date displays clearly
- overdue tasks can be queried

Verification:

- `pnpm build`

## Phase 3: Inbox And Webhooks

### T3.Inbox.001 Conversation detail timeline

Goal: show messages for one conversation in chronological order.

Read first:

- `apps/web/app/conversations/page.tsx`
- `packages/inbox-core/src/index.ts`

Acceptance:

- page is tenant-scoped
- sender type is visible
- AI summary is visible when present

Verification:

- `pnpm build`

### T3.Webhook.001 Harden webhook signature and tenant resolution

Goal: public webhook routes are safe for production.

Read first:

- `packages/webhook-core/src/index.ts`
- `apps/web/app/api/webhooks/**/route.ts`
- `docs/06_SECURITY_AND_TENANCY.md`

Acceptance:

- unsigned production request is rejected
- route has idempotency key
- event failure is recorded
- tenant source is explicit and safe

Verification:

- `pnpm build`

### T3.Webhook.002 Retry failed webhook event

Goal: operator can inspect and retry failed inbound events.

Read first:

- `apps/web/app/webhook-events/page.tsx`
- `packages/webhook-core/src/index.ts`

Acceptance:

- failed event details are visible
- retry is idempotent
- retry result updates event status

Verification:

- `pnpm build`

## Phase 4: AI Inbox

### T4.AI.001 Structured LLM output

Goal: replace keyword-only detection with structured output while keeping deterministic fallback.

Read first:

- `packages/ai-core/src/index.ts`
- `docs/05_AI_AGENT_CONTRACT.md`

Acceptance:

- output matches `AgentPlan`
- invalid JSON falls back safely
- missing fields are not invented
- provider errors do not lose message

Verification:

- `pnpm build`

### T4.AI.002 Vietnamese and English fixtures

Goal: prevent regressions in bilingual trade intent detection.

Read first:

- `packages/ai-core/src/index.ts`
- `docs/09_TESTING_STRATEGY.md`

Acceptance:

- fixture categories exist
- expected intents are asserted
- high-risk prompt injection is blocked

Verification:

- package test command if available
- `pnpm build`

### T4.AI.003 Convert risky AI steps into approval requests

Goal: AI plans high-risk actions but does not execute them.

Read first:

- `packages/ai-core/src/index.ts`
- `packages/approval-core/src/index.ts`
- `packages/policy-core/src/index.ts`

Acceptance:

- high-risk planned step creates approval request
- safe planned step executes through policy
- response distinguishes executed and pending steps

Verification:

- `pnpm build`

## Phase 5: Trade Core

### T5.Trade.001 Quotation line items

Goal: make quotation drafts structured enough for real trade use.

Read first:

- `packages/database/prisma/schema.prisma`
- `packages/trade-core/src/index.ts`
- `docs/02_DOMAIN_MODEL.md`

Acceptance:

- schema supports line items
- draft action can store structured items
- total amount can be calculated or safely stored

Verification:

- `pnpm db:generate`
- `pnpm build`

### T5.Trade.002 Quotation review page

Goal: human can review AI draft before send.

Read first:

- `apps/web/app/quotations/page.tsx`
- `packages/trade-core/src/index.ts`

Acceptance:

- draft content visible
- status visible
- send path is approval-gated
- AI-generated terms are clearly review-required

Verification:

- `pnpm build`

### T5.Trade.003 Product catalog

Goal: tenant can maintain products used by quotes and partner suggestions.

Read first:

- `packages/database/prisma/schema.prisma`
- `packages/trade-core/src/index.ts`

Acceptance:

- products are tenant-scoped
- create/edit actions exist
- list page exists

Verification:

- `pnpm build`

## Phase 6: Approval And Audit

### T6.Approval.001 Approval detail page

Goal: approver can inspect action input, risk, reason, and history.

Read first:

- `apps/web/app/approvals/page.tsx`
- `packages/approval-core/src/index.ts`

Acceptance:

- page is tenant-scoped
- action name and input are visible
- approve/reject/execute flow is clear
- status transitions are safe

Verification:

- `pnpm build`

### T6.Audit.001 Audit filters

Goal: operators can investigate actions by actor, action, risk, approval, and date.

Read first:

- `apps/web/app/audit-logs/page.tsx`
- `packages/database/prisma/schema.prisma`

Acceptance:

- filters are tenant-scoped
- blocked actions are visible when logged
- sensitive input is not overexposed

Verification:

- `pnpm build`

## Phase 7: Analytics

### T7.Analytics.001 Dashboard metrics service

Goal: centralize metrics for dashboard and reports.

Read first:

- `apps/web/app/page.tsx`
- `docs/00_PRODUCT_MANIFESTO.md`

Acceptance:

- metrics are tenant-scoped
- response speed can be calculated or marked unavailable
- stale opportunities can be counted

Verification:

- `pnpm build`

### T7.Analytics.002 Weekly association report

Goal: generate a weekly report showing member value.

Read first:

- `docs/08_WORKFLOWS.md`
- `docs/02_DOMAIN_MODEL.md`

Acceptance:

- report includes inbound volume, response speed, quotation volume, stale leads, and top demand
- private member data rules are explicit
- distribution is approval-gated

Verification:

- `pnpm build`

## Phase 8: Integrations

### T8.Integration.001 Zalo production adapter

Goal: normalize signed Zalo events into inbox messages.

Read first:

- `apps/web/app/api/webhooks/zalo/route.ts`
- `docs/WEBHOOKS.md`

Acceptance:

- signature/secret verification exists
- stable event key exists
- normalized message is stored
- duplicate is ignored safely

Verification:

- `pnpm build`

### T8.Integration.002 WhatsApp production adapter

Goal: normalize signed WhatsApp events into inbox messages.

Read first:

- `apps/web/app/api/webhooks/whatsapp/route.ts`
- `docs/WEBHOOKS.md`

Acceptance:

- signature/secret verification exists
- stable event key exists
- normalized message is stored
- duplicate is ignored safely

Verification:

- `pnpm build`

### T8.Integration.003 Email inbound adapter

Goal: normalize inbound email events into inbox messages.

Read first:

- `apps/web/app/api/webhooks/email/route.ts`
- `docs/WEBHOOKS.md`

Acceptance:

- sender email is captured
- subject and body are preserved
- duplicate message ID is ignored safely

Verification:

- `pnpm build`

## Phase 9: Marketplace Readiness

### T9.Marketplace.001 Matching evidence threshold

Goal: define objective criteria before marketplace expansion.

Read first:

- `docs/00_PRODUCT_MANIFESTO.md`
- `docs/11_ROADMAP.md`

Acceptance:

- threshold uses real CRM/inbox metrics
- opt-in model is required
- approval-gated introduction flow is required

Verification:

- review diff

### T9.Marketplace.002 Opt-in data sharing model

Goal: define how companies consent to public/private matching.

Read first:

- `docs/06_SECURITY_AND_TENANCY.md`
- `docs/02_DOMAIN_MODEL.md`

Acceptance:

- no default public exposure
- tenant can opt in and opt out
- audit trail exists for consent changes

Verification:

- review diff

## Post-MVP Executive Plan

The MVP plan above is complete. Continue execution from `docs/16_EXECUTIVE_TASK_PLAN.md`, which defines the next production-readiness program across CEO, CFO, CTO, CHRO, CISO, and CCO/CMO concerns.

For the global commerce scale-up sequence, use `docs/26_GLOBAL_COMMERCE_MASTER_PLAN.md`. It turns the existing MVP/executive work into a detailed backlog for super value, super revenue, and super intelligence.

Current mandatory sequence:

- Complete the `G0` red-gate tasks in `docs/26_GLOBAL_COMMERCE_MASTER_PLAN.md` before growth, monetization, marketplace, or network-intelligence tasks.

Do not start new growth or marketplace features before the Phase 10 stop-the-bleed hardening tasks and the `G0` red-gate blockers are complete.
