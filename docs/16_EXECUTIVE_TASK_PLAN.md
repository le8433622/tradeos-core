# TradeOS Executive Task Plan

## Purpose

This is the next execution plan after the MVP task plan. Its goal is to move TradeOS from a strong internal MVP to an enterprise-grade, revenue-grade, legally defensible, scalable operating system for global trade.

This plan is written to satisfy six executive perspectives at the same time:

| Executive | Primary Concern                                               | Required Outcome                                         |
| --------- | ------------------------------------------------------------- | -------------------------------------------------------- |
| CEO       | Enterprise value, brand trust, legal survival, long-term moat | No catastrophic product risk, clear strategic sequencing |
| CFO       | Cloud cost, LLM spend, engineering ROI, license exposure      | Unit economics visible and controllable                  |
| CTO       | Architecture, reliability, correctness, maintainability       | No rebuild required at 100x usage                        |
| CHRO      | Team load, onboarding, handover, key-person risk              | Junior-safe docs, ownership, runbooks                    |
| CISO      | Tenant isolation, secrets, OWASP, privacy, incident risk      | Zero critical/high security findings before production   |
| CCO/CMO   | Customer value, conversion, activation, revenue proof         | Faster response, clearer value, measurable ROI           |

## Executive Green Gate

TradeOS cannot be called production-grade until all gates are green.

| Gate                      | Green Definition                                                                       | Current Risk |
| ------------------------- | -------------------------------------------------------------------------------------- | ------------ |
| Auth and tenant isolation | No route can read or mutate tenant data without session or verified tenant integration | Yellow       |
| Approval lifecycle        | High-risk actions use atomic transitions and cannot double-execute                     | Yellow/Red   |
| Webhook reliability       | Public webhooks store event, acknowledge safely, process async, replay idempotently    | Red          |
| Auditability              | Every mutation either commits with audit log or does not commit                        | Yellow/Red   |
| Privacy                   | PII inventory, redaction, retention, export/delete workflows exist                     | Red          |
| Cost control              | LLM/API/storage spend tracked per tenant with caps                                     | Red          |
| Observability             | SLO, error rate, queue depth, webhook failure, AI cost visible                         | Red          |
| UX/revenue proof          | Funnel from inbound to won deal is tracked and visible                                 | Yellow       |
| Handover                  | New engineer can safely add a route/action with docs and tests                         | Yellow       |

## Execution Rules

1. Security and audit tasks outrank feature tasks.
2. Any tenant-scoped write must include `organizationId` and audit behavior.
3. Public webhook routes must fail closed in production.
4. AI may propose actions but registered action policy is the source of truth.
5. Every task must define verification before implementation starts.
6. Production operations require explicit production-ops task approval.
7. Do not build public marketplace mechanics until private workflow data hits the marketplace gate.

## Phase 10: Stop-The-Bleed Hardening

Goal: remove critical production blockers that can destroy brand trust, legal safety, or tenant isolation.

### T10.Security.001 Route Auth Error Boundary

Executive owner: CISO, CEO

Goal: every API route returns controlled `401`, `403`, and `500` responses instead of leaking unhandled auth errors.

Read first:

- `packages/auth/src/tenant.ts`
- `apps/web/app/api/**/route.ts`
- `docs/06_SECURITY_AND_TENANCY.md`

Implementation:

1. Create shared API error helper in `apps/web/lib/api-errors.ts`.
2. Add `withApiSession(request, allowedRoles?)` helper that resolves session and converts auth errors to typed responses.
3. Replace route-level naked `requireSessionFromRequest` usage in high-risk routes first: approvals, products, contacts, quotations, tasks, reports.
4. Return user-safe errors: `AUTH_REQUIRED`, `ROLE_ACCESS_DENIED`, `ORGANIZATION_ACCESS_DENIED`.
5. Preserve server-side logs with request path and error code, not raw PII.

Acceptance:

- unauthenticated request returns `401`
- wrong role returns `403`
- cross-tenant attempt returns `403`
- no route exposes stack trace
- existing successful route behavior remains unchanged

Verification:

- `pnpm build`
- targeted route smoke tests with no token, viewer role, admin role

Rollback:

- revert helper and route wrappers only

Executive questions answered:

- CEO: what happens when customers hit permission errors?
- CISO: can auth failures leak implementation details?
- CCO: does the user get a recoverable error?

### T10.Approval.001 Atomic Approval Execution

Executive owner: CTO, CISO, CEO

Goal: prevent double execution, status regression, and race conditions in approval lifecycle.

Read first:

- `packages/approval-core/src/index.ts`
- `packages/database/prisma/schema.prisma`
- `apps/web/app/api/approvals/[id]/**/route.ts`

Implementation:

1. Add `EXECUTING` to `ApprovalStatus` enum.
2. Generate Prisma client.
3. Change `executeApprovedRequest` to claim request with `updateMany` where `{ id, organizationId, status: 'APPROVED' }` and set status `EXECUTING`.
4. Execute registered action only after claim succeeds.
5. On success set status `EXECUTED` with `executedAt` and result.
6. On failure set status `FAILED` with structured failure result.
7. Reject approve/reject calls unless current status is exactly `PENDING`.
8. Add tests for concurrent execute attempts.

Acceptance:

- two concurrent execute calls produce exactly one action execution
- executed request cannot be re-approved or rejected
- failed execution stores structured result
- approval transition audit log is written

Verification:

- `pnpm db:generate`
- `pnpm --filter @tradeos/approval-core test` if package test exists
- `pnpm build`

Rollback:

- forward migration to map `EXECUTING` back to `APPROVED` only if no execution is in progress

Executive questions answered:

- CEO: can a quotation be sent twice?
- CTO: does concurrency corrupt state?
- CISO: can possession of an approval ID execute cross-tenant action?

### T10.Audit.001 Transactional Action And Audit Contract

Executive owner: CISO, CTO, CEO

Goal: registered action mutation and audit log must succeed or fail together.

Read first:

- `packages/policy-core/src/index.ts`
- `packages/crm-core/src/index.ts`
- `packages/trade-core/src/index.ts`
- `packages/database/src/index.ts`

Implementation:

1. Extend registered action handler signature to optionally receive a Prisma transaction client.
2. Update `executeAction` to run handler and audit write inside `prisma.$transaction`.
3. Update CRM/trade action handlers to use provided transaction client when present.
4. Keep read-only helper behavior unchanged.
5. Add audit redaction hook before writing input/result.
6. Fail action if audit write fails.

Acceptance:

- if audit create fails, business mutation does not commit
- blocked action attempts still write audit when possible
- all registered action handlers still compile
- audit log includes action name, risk, actor, org, approval status

Verification:

- `pnpm --filter @tradeos/policy-core test`
- `pnpm build`
- manual failure injection test if practical

Rollback:

- revert transaction wrapper and handler signature change together

Executive questions answered:

- CEO: can we prove what changed and who did it?
- CISO: can a mutation happen without audit evidence?
- CTO: are writes consistent under failure?

### T10.Security.002 Tenant-Scoped Webhook Integration Registry

Executive owner: CISO, CTO, CFO

Goal: stop trusting caller-controlled `x-organization-id`; resolve tenant from registered integration credentials.

Read first:

- `packages/webhook-core/src/index.ts`
- `apps/web/app/api/webhooks/**/route.ts`
- `packages/database/prisma/schema.prisma`
- `docs/WEBHOOKS.md`

Implementation:

1. Add `WebhookIntegration` model: `organizationId`, `channel`, `providerAccountId`, `secretHash`, `status`, `createdAt`, `rotatedAt`.
2. Add unique index on `(channel, providerAccountId)`.
3. Add helper `resolveWebhookTenantFromIntegration(request, channel, providerAccountId)`.
4. Hash secrets at rest using HMAC or strong one-way hash with server-side pepper in env.
5. Update Zalo/WhatsApp/Email routes to extract provider account ID and resolve org from registry.
6. Keep `x-organization-id` demo fallback only when `NODE_ENV !== 'production'`.
7. Add secret rotation procedure to `docs/WEBHOOKS.md`.

Acceptance:

- production webhook cannot choose arbitrary org via header
- invalid provider account ID returns `401` or `404` without revealing tenant existence
- secret rotation path exists
- webhook integration status can disable provider immediately

Verification:

- `pnpm db:generate`
- `pnpm build`
- signed webhook smoke test with valid/invalid integration

Rollback:

- keep old route disabled behind env flag for emergency only

Executive questions answered:

- CISO: what happens if a global webhook secret leaks?
- CEO: can one tenant poison another tenant's inbox?
- CFO: can compromised integrations be disabled without incident-wide downtime?

### T10.Security.003 Input Validation And Redaction Framework

Executive owner: CISO, CTO, CCO

Goal: validate all external input and prevent raw PII overexposure in logs, audit, metadata, and UI.

Read first:

- all `apps/web/app/api/**/route.ts`
- `packages/policy-core/src/index.ts`
- `apps/web/app/audit-logs/page.tsx`

Implementation:

1. Choose validation library or internal schema helpers.
2. Add schemas for leads, contacts, products, tasks, quotations, approvals, webhooks.
3. Reject unknown dangerous fields such as request-body `organizationId` for session routes.
4. Add `redactForAudit(value)` helper that masks emails, phone numbers, tokens, secrets.
5. Use redaction before audit writes and webhook event UI display.
6. Add max payload size guidance for public webhook routes.

Acceptance:

- malformed input returns `400` with safe message
- raw secret/token values never appear in audit UI
- request body cannot override session organization
- large payload rejection behavior is documented

Verification:

- `pnpm build`
- targeted malformed body smoke tests

Rollback:

- disable strict schemas per route with feature flag only if blocking pilot onboarding

Executive questions answered:

- CISO: how are SQL injection and XSS prevented?
- CCO: does bad input produce helpful UX?
- CTO: are route contracts explicit?

## Phase 11: Resilience And Self-Healing

Goal: answer the CEO question: if the system fails for 2 hours, how much money is lost and how much can recover automatically?

### T11.Queue.001 Worker App And Job Model

Executive owner: CEO, CTO, CFO

Goal: move slow/retryable work out of synchronous API routes.

Read first:

- `docs/01_ARCHITECTURE.md`
- `apps/web/app/api/webhooks/**/route.ts`
- `packages/webhook-core/src/index.ts`

Implementation:

1. Add `apps/worker` package or define worker entrypoint under existing monorepo.
2. Add `Job` model with `organizationId`, `type`, `status`, `payload`, `attempts`, `nextRunAt`, `lastError`.
3. Add `enqueueJob` helper in new `packages/job-core`.
4. Add processor contract with idempotency key.
5. Start with `PROCESS_WEBHOOK_EVENT` job.
6. Add local dev command for worker.

Acceptance:

- webhook route can enqueue job
- worker can process queued webhook event
- failed job retries with backoff
- job failure is visible in UI or logs

Verification:

- `pnpm db:generate`
- `pnpm build`
- local enqueue/process smoke test

Rollback:

- route can temporarily process synchronously if worker disabled

Executive questions answered:

- CEO: does the system recover after downtime?
- CFO: can worker cost be separated from web request cost?
- CTO: is long-running work decoupled from Next.js route lifecycle?

### T11.Webhook.001 Persist-And-Ack Webhook Flow

Executive owner: CEO, CISO, CCO

Goal: public webhook routes store event and return quickly; processing happens async and idempotently.

Implementation:

1. Route verifies signature and tenant integration.
2. Route derives stable event key from provider ID.
3. Route writes `WebhookEvent` as `RECEIVED`.
4. Route enqueues job and returns `200`.
5. Worker ingests message and runs AI.
6. Worker marks event `PROCESSED` or `FAILED`.
7. Duplicate provider retry returns existing event state without changing it.

Acceptance:

- p95 webhook route latency < 500 ms excluding network
- provider retries do not duplicate messages/actions
- failed processing can retry from stored payload
- original event state is preserved

Verification:

- signed duplicate webhook smoke test
- failed worker retry smoke test
- `pnpm build`

Rollback:

- disable queue path with env flag and use synchronous fallback in dev only

### T11.Observability.001 SLO Dashboard And Incident Metrics

Executive owner: CEO, CFO, CTO, CISO

Goal: make downtime, errors, queue depth, LLM cost, and webhook failures visible.

Metrics:

| Metric                     | Target                          |
| -------------------------- | ------------------------------- |
| API p95 latency            | < 500 ms for non-AI routes      |
| webhook route p95 latency  | < 500 ms after async conversion |
| worker queue lag p95       | < 60 seconds                    |
| webhook processing success | > 99.5%                         |
| audit write success        | 100% for registered actions     |
| AI fallback rate           | < 10% after provider stable     |
| LLM cost per tenant        | capped by plan                  |

Implementation:

1. Add structured logging helper.
2. Add request ID propagation.
3. Add `/api/health/deep` for DB and queue checks.
4. Add webhook failure and queue depth dashboard cards.
5. Document on-call thresholds.

Acceptance:

- operator can see if system is degraded
- failed webhooks and failed jobs are countable per tenant
- health check does not leak secrets or tenant data

Verification:

- `pnpm build`
- manual degraded DB/worker scenario documented

Rollback:

- keep basic `/api/health` available

### T11.DR.001 Backup, Restore, And Downtime Cost Runbook

Executive owner: CEO, CFO, CISO

Goal: quantify outage cost and prove recovery path.

Implementation:

1. Define outage cost formula: `missedInbound x conversionRate x avgDealValue x delayPenalty`.
2. Add tenant-specific inputs for average deal value and conversion rate.
3. Document RPO/RTO targets.
4. Define Supabase backup verification schedule.
5. Run restore drill in staging.

Acceptance:

- RPO target documented
- RTO target documented
- restore drill evidence recorded
- CEO can estimate 2-hour outage impact

Verification:

- review runbook diff
- staging restore drill task when authorized

Rollback:

- docs-only rollback unless backup automation added

## Phase 12: CFO Cost And Unit Economics

Goal: make every expensive path measurable, capped, and justifiable.

### T12.Cost.001 LLM Usage Metering And Budget Caps

Executive owner: CFO, CTO, CCO

Goal: track and cap AI spend per tenant, route, model, and feature.

Implementation:

1. Add `AiUsageEvent` model: org, provider, model, inputTokens, outputTokens, estimatedCost, feature, createdAt.
2. Wrap `planWithLlm` with usage tracking when provider returns token usage.
3. Add cost estimate fallback when provider lacks usage field.
4. Add tenant monthly budget fields or env-configured defaults.
5. If budget exhausted, use deterministic fallback and mark plan `budgetLimited`.
6. Add dashboard card for AI usage and spend.

Acceptance:

- every LLM call is attributable to tenant and feature
- budget cap prevents runaway spend
- fallback does not drop inbound messages
- finance can export monthly usage

Verification:

- `pnpm db:generate`
- `pnpm build`
- mocked LLM response with usage data

Rollback:

- disable enforcement while keeping usage logging

### T12.Cost.002 Data Retention And Archive Policy

Executive owner: CFO, CISO, CEO

Goal: control storage growth while respecting audit and compliance.

Implementation:

1. Define retention classes: audit logs, webhook payloads, messages, reports, AI traces.
2. Add retention policy doc and config constants.
3. Add redaction/archive job for old webhook payloads.
4. Keep minimal metadata for idempotency and audit.
5. Add tenant-level export before destructive retention operations.

Acceptance:

- raw webhook payload is not stored forever by default
- audit-critical metadata remains available
- retention behavior is documented per data class
- no data deletion runs without explicit task in production

Verification:

- review diff
- staging-only archive dry run when implemented

Rollback:

- pause retention job via env flag

### T12.License.001 SBOM And Open-Source License Review

Executive owner: CFO, CISO, CTO

Goal: prevent accidental GPL/commercial license risk.

Implementation:

1. Add dependency license scanning command.
2. Generate SBOM for root workspace.
3. Add allowed/blocked license policy.
4. Record exceptions in docs.
5. Add CI check before production release.

Acceptance:

- dependency list is exportable
- GPL/AGPL dependencies are flagged
- license policy is documented

Verification:

- license scan command output
- review diff

## Phase 13: Revenue And UX Conversion

Goal: make TradeOS prove revenue impact, not just operational activity.

### T13.Funnel.001 Trade Revenue Funnel Instrumentation

Executive owner: CCO, CFO, CEO

Goal: measure every step from inbound message to won deal.

Funnel:

1. inbound event received
2. message stored
3. lead created
4. follow-up scheduled
5. quotation drafted
6. quotation approved
7. quotation sent
8. deal won/lost

Implementation:

1. Add `FunnelEvent` or derive from audit/webhook/action logs.
2. Add conversion dashboard in analytics-core.
3. Add response time by channel.
4. Add stale value estimate: stale leads x average quote value x historical conversion.
5. Add report copy suitable for association operators.

Acceptance:

- tenant can see revenue pipeline by stage
- association can see member response performance
- dashboard shows missed revenue estimate

Verification:

- `pnpm build`
- seed-data smoke test

### T13.UX.001 Human-Friendly Error And Recovery UX

Executive owner: CCO, CISO, CHRO

Goal: replace raw technical errors with actionable user messages.

Implementation:

1. Create error code dictionary.
2. Map API errors to user-facing Vietnamese/English messages.
3. Add retry guidance for webhook/operator failures.
4. Keep technical detail hidden behind admin-only diagnostic panel.
5. Add empty states for no leads, no products, no approvals.

Acceptance:

- customer never sees stack trace
- operator knows next action after failure
- error messages are localized-ready

Verification:

- `pnpm build`
- manual UI review

### T13.Report.001 Stored Weekly Report Snapshots

Executive owner: CEO, CCO, CISO

Goal: weekly reports are reproducible, approvable, and distributable.

Implementation:

1. Add `ReportSnapshot` model with period, organizationId, reportType, payload, status, approvedById.
2. Generate snapshot via analytics-core.
3. Add report detail page.
4. Add approval flow before external distribution.
5. Add private/member data rules in snapshot payload.

Acceptance:

- same report can be viewed later without live recomputation drift
- distribution is approval-gated
- snapshot excludes private member details unless authorized

Verification:

- `pnpm db:generate`
- `pnpm build`

## Phase 14: AI Trust And Intelligence

Goal: make AI useful enough to sell, safe enough to trust, and measurable enough to improve.

### T14.AI.001 Safe Unknown And Prompt-Injection Fallback

Executive owner: CISO, CTO, CCO

Goal: uncertain or malicious messages do not cause automatic mutations.

Implementation:

1. Allow LLM plans with `UNKNOWN` and zero steps.
2. Change heuristic fallback so `UNKNOWN` creates no action or creates review-only recommendation.
3. Add explicit prompt-injection detector before intent mapping.
4. If injection suspected, store message, mark review required, do not execute actions.
5. Add tests for mixed malicious/quotation prompts.

Acceptance:

- prompt injection does not create lead/quotation automatically
- unknown trade messages are preserved but not mutated
- UI surfaces review-needed state

Verification:

- `pnpm --filter @tradeos/ai-core test`
- `pnpm build`

### T14.AI.002 Registered Action Risk Is Source Of Truth

Executive owner: CTO, CISO

Goal: LLM cannot downgrade risk level to bypass approval.

Implementation:

1. In `runTradeAgent`, look up action via `getAction(step.action)`.
2. Use registered action `riskLevel` and `requiresApprovalForAI`, not LLM-provided risk.
3. Store LLM risk as advisory metadata only.
4. Reject unknown action before execution.
5. Add tests where LLM labels `trade.sendQuotation` as LOW.

Acceptance:

- high-risk registered action always creates approval request
- LLM risk mismatch is recorded
- unknown action cannot execute

Verification:

- `pnpm --filter @tradeos/ai-core test`
- `pnpm build`

### T14.AI.003 AI Evaluation Harness

Executive owner: CTO, CCO, CHRO

Goal: measure AI quality before changing prompts/models.

Implementation:

1. Add golden dataset for Vietnamese/English trade messages.
2. Track precision/recall by intent.
3. Track false-positive mutation rate.
4. Track missing-field extraction accuracy.
5. Add command `pnpm --filter @tradeos/ai-core eval`.
6. Store eval result artifacts under ignored output directory.

Acceptance:

- prompt/model changes require eval report
- false-positive mutation rate is visible
- regression threshold blocks risky changes

Verification:

- eval command output
- package tests

## Phase 15: Human Operations And Team Scalability

Goal: reduce key-person risk and make the system safe for a growing engineering team.

### T15.Onboarding.001 Developer Onboarding Manual

Executive owner: CHRO, CTO

Goal: junior engineer can safely run, test, and modify the app.

Implementation:

1. Create `docs/17_DEVELOPER_ONBOARDING.md`.
2. Add architecture reading path.
3. Add local setup with Node 20, pnpm, Supabase requirements.
4. Add common task recipes: add API route, add registered action, add Prisma field, add webhook provider.
5. Add "never do this" section for tenant/security mistakes.

Acceptance:

- new developer can run app locally
- new developer can identify package owner for a change
- docs include troubleshooting for common build/db errors

Verification:

- docs review

### T15.Runbook.001 Incident Response Runbooks

Executive owner: CHRO, CISO, CEO

Goal: support/operator knows what to do during webhook, AI, auth, DB, or deploy incidents.

Implementation:

1. Create incident severity levels SEV1-SEV4.
2. Write runbooks for webhook outage, AI provider outage, DB outage, auth outage, failed migration.
3. Add customer communication template.
4. Add postmortem template.
5. Add ownership table.

Acceptance:

- each major failure mode has first 15-minute response steps
- rollback path is explicit
- customer comms are prewritten

Verification:

- tabletop review

### T15.Ownership.001 Code Ownership And Decision Log

Executive owner: CHRO, CTO

Goal: no package is owned only by one person or one AI agent.

Implementation:

1. Add ownership table by package.
2. Add required reviewer role per risk area.
3. Add ADR requirement for new cross-cutting architecture.
4. Add checklist for updating docs after behavior/security changes.

Acceptance:

- every package has owner and backup owner placeholder
- high-risk changes require explicit review path

Verification:

- docs review

## Phase 16: Enterprise Privacy And Compliance

Goal: satisfy enterprise buyers and reduce legal exposure.

### T16.Privacy.001 Data Inventory And PII Map

Executive owner: CISO, CEO, CFO

Goal: know what personal and commercial data exists, where it is stored, and who can access it.

Implementation:

1. Create data inventory table for every model.
2. Classify PII, commercial confidential, audit-critical, operational metadata.
3. Define access roles per data class.
4. Define retention class per data class.
5. Link to deletion/export tasks.

Acceptance:

- every Prisma model has data classification
- every PII field has purpose and retention basis
- webhook metadata classification is explicit

Verification:

- docs review

### T16.Privacy.002 Tenant Data Export And Delete Workflow

Executive owner: CISO, CEO, CCO

Goal: support GDPR-like access/export/delete requirements without corrupting audit trails.

Implementation:

1. Add export service for tenant data bundle.
2. Add PII deletion/anonymization plan that preserves audit integrity.
3. Add approval-gated tenant deletion request.
4. Add legal hold concept to block deletion when required.
5. Document what cannot be deleted due to audit/legal obligation.

Acceptance:

- tenant admin can request export
- deletion requires owner/admin approval
- audit log remains integrity-preserving
- deleted PII is no longer visible in UI/API

Verification:

- `pnpm build`
- staging export/delete smoke test

### T16.Compliance.001 SOC2 Readiness Evidence Checklist

Executive owner: CISO, CFO, CEO

Goal: prepare for enterprise procurement and future audit.

Implementation:

1. Document access control evidence.
2. Document change management evidence.
3. Document incident management evidence.
4. Document backup/restore evidence.
5. Document vendor/subprocessor list.
6. Document security review cadence.

Acceptance:

- enterprise buyer can receive security packet draft
- missing controls are tracked as tasks

Verification:

- docs review

## Phase 17: Monetization And Network Value

Goal: convert operational value into durable revenue without violating privacy.

### T17.Billing.001 Tenant Plan And Billing Meter

Executive owner: CFO, CCO, CEO

Goal: support tiered pricing and usage-based expansion.

Implementation:

1. Add plan model or config: Free/Pilot/Team/Association/Enterprise.
2. Meter seats, inbound messages, AI usage, integrations, report snapshots.
3. Add plan limit checks with graceful upgrade messages.
4. Keep billing provider choice explicit in build-vs-buy analysis.

Acceptance:

- tenant usage is measurable by billing dimension
- plan limit does not silently break workflows
- finance can export usage report

Verification:

- `pnpm db:generate` if schema changes
- `pnpm build`

### T17.Introduction.001 Approval-Gated Partner Introduction Workflow

Executive owner: CEO, CCO, CISO

Goal: create first safe network-effect feature without becoming uncontrolled marketplace.

Implementation:

1. Add `IntroductionRequest` model.
2. Allow association operator to propose buyer/seller introduction between opted-in tenants.
3. Require both sides or authorized operator approval before contact sharing.
4. Log every step in audit.
5. Add dispute/report issue field.

Acceptance:

- no contact details shared before approval
- opt-out tenant cannot be introduced
- introduction status is auditable
- operator can report value generated

Verification:

- `pnpm db:generate`
- `pnpm build`

## Recommended Execution Order

The following order is mandatory unless a production incident changes priority:

1. `T10.Security.001 Route Auth Error Boundary`
2. `T10.Approval.001 Atomic Approval Execution`
3. `T10.Audit.001 Transactional Action And Audit Contract`
4. `T10.Security.002 Tenant-Scoped Webhook Integration Registry`
5. `T14.AI.001 Safe Unknown And Prompt-Injection Fallback`
6. `T14.AI.002 Registered Action Risk Is Source Of Truth`
7. `T11.Queue.001 Worker App And Job Model`
8. `T11.Webhook.001 Persist-And-Ack Webhook Flow`
9. `T11.Observability.001 SLO Dashboard And Incident Metrics`
10. `T12.Cost.001 LLM Usage Metering And Budget Caps`
11. `T13.Report.001 Stored Weekly Report Snapshots`
12. `T16.Privacy.001 Data Inventory And PII Map`
13. `T15.Onboarding.001 Developer Onboarding Manual`
14. `T13.Funnel.001 Trade Revenue Funnel Instrumentation`
15. `T17.Billing.001 Tenant Plan And Billing Meter`

## Definition Of 10/10

TradeOS reaches 10/10 only when all six executive roles can answer yes:

| Executive | 10/10 Question                                                                         |
| --------- | -------------------------------------------------------------------------------------- |
| CEO       | Can this system survive public enterprise deployment without existential product risk? |
| CFO       | Can we measure and cap every major unit cost per tenant?                               |
| CTO       | Can usage grow 100x without rewriting the core architecture?                           |
| CHRO      | Can a new engineer safely contribute in week one?                                      |
| CISO      | Can we prove tenant isolation, auditability, and privacy controls under scrutiny?      |
| CCO/CMO   | Can customers see measurable revenue value within the first week?                      |
