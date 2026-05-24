# TradeOS Perfection Task Plan — Post PR #3

## Current Truth

**Date**: 2026-05-25

PR #3 is merged and issue #1 is closed. TradeOS now has a real procurement operator foundation: sourcing runs, supplier candidates, quotes, evidence, checkpoints, handovers, payments, plan limits, route/action parity, and CI gates.

This does **not** mean the project is production-perfect. The next standard is stricter: every money-moving or buyer-facing workflow must be proven in staging, tested end-to-end, observable, permission-safe, and documented with rollback paths.

## Definition Of Perfect

TradeOS can be called production-perfect only when all of the following are true:

1. Tenant isolation is regression-tested for every workflow that references another record.
2. Permission checks are seed-backed, route-backed, action-backed, and tested for allowed and denied users.
3. Every meaningful mutation uses a registered action or explicitly documented infrastructure boundary.
4. Every risky action has approval/MFA behavior and audit evidence.
5. Every MoneyOS billing step has evidence before billing and idempotent payment handling.
6. Buyer-facing report delivery creates durable `BUYER_DECISION` evidence.
7. All Prisma migrations are verified on staging with rollback or forward-fix notes.
8. Vercel staging has authenticated smoke proof, not only local or unauthenticated checks.
9. Core CRM, sourcing, billing, settings, webhook, and AI flows have automated E2E or integration proof.
10. Operators can diagnose failures through logs, request IDs, audit logs, and documented runbooks.
11. Data governance covers evidence immutability, export, anonymization, legal hold, and retention.
12. Documentation matches source behavior and `pnpm docs:check` remains green.

## Open Issue Map

| Issue | Priority | Workstream | Goal |
| --- | --- | --- | --- |
| #4 | P1 | Evidence billing | Count real evidence before billing approval instead of trusting stale `evidenceCount`. |
| #5 | P1 | Buyer report delivery | Parse JSON body, deliver report, create `BUYER_DECISION` evidence, return evidence ID. |
| #6 | P1 | API errors | Map entitlement, tenant, and billing errors to stable public status codes. |
| #7 | P1 | Integration tests | Prove sourcing permissions, tenant isolation, evidence billing, and duplicate payment behavior on real DB. |
| #9 | P2 | Plan limits | Decide hardcoded vs DB-driven `PlanLimit` strategy and document it. |
| #10 | P0 | Staging smoke | Run authenticated Vercel staging smoke and record production proof. |
| #11 | P0 | Migration proof | Apply and verify latest Prisma migrations on staging, including payment idempotency index. |
| #12 | P1 | E2E tests | Add authenticated E2E suite for CRM, procurement, billing, and settings. |
| #13 | P1 | Monetization UX/API | Complete billing UI/API for plans, checkpoints, payments, and entitlement errors. |
| #14 | P1 | RBAC v2 | Implement permission-first authorization across routes and actions. |
| #15 | P1 | Observability | Add production observability, audit analytics, and SLO gate. |
| #16 | P1 | Procurement UX | Harden sourcing UI with forms, validation, evidence ledger, mobile states. |
| #17 | P1 | AI safety | Prove real LLM procurement evals, approval paths, and policy tests. |
| #18 | P1 | Data governance | Strengthen immutable evidence, retention, export, anonymization proof. |
| #19 | P1 | Webhooks | Complete signed webhook smoke, retry, archive, and idempotency proof. |

## Execution Order

### Gate 0 — No More Production Claims Until Proof

1. Complete #11 migration proof for latest schema.
2. Complete #10 authenticated staging smoke.
3. Update `docs/13_CHECKPOINTS.md` with exact evidence.

Exit criteria:

- Latest `main` CI is green.
- Staging database is at latest migration.
- Vercel smoke checklist has authenticated evidence.
- Any failed smoke item has a linked issue.

### Gate 1 — MoneyOS Correctness

1. Complete #4 evidence-before-billing correctness.
2. Complete #5 buyer report delivery evidence ledger.
3. Complete #6 public API error taxonomy.
4. Complete #7 real DB integration tests for the same flows.
5. Complete #13 monetization UI/API.

Exit criteria:

- No checkpoint can be approved for billing without real evidence.
- Report delivery stores buyer decision evidence.
- Duplicate external payments cannot create duplicate payment rows.
- OWNER-only billing mutations are enforced in tests.
- User-facing errors are stable and localized where required.

### Gate 2 — Tenant, Permission, And E2E Confidence

1. Complete #12 authenticated E2E suite.
2. Complete #14 permission-first RBAC v2.
3. Complete #16 procurement UX hardening.

Exit criteria:

- A real operator can complete core flows without manual DB edits.
- VIEWER/OPERATOR/SALES/ADMIN/OWNER permissions are tested.
- Multi-org membership behavior is explicit and safe.
- UI failures do not hide server-side security failures.

### Gate 3 — AI And Automation Safety

1. Complete #17 real LLM procurement eval and approval-path proof.
2. Complete #19 webhook production readiness.

Exit criteria:

- AI cannot execute blocked money/security/delivery actions directly.
- Ambiguous procurement requests create handovers or approval paths.
- Signed webhook success, duplicate, rejection, failure, retry, and archive flows are documented.

### Gate 4 — Operating Company Readiness

1. Complete #15 observability and SLO gate.
2. Complete #18 data governance proof.
3. Complete #9 PlanLimit strategy.

Exit criteria:

- Operators can trace failures by request ID, tenant, action, and risk level.
- Evidence/data governance has immutable or append-only rules where required.
- Retention, legal hold, export, and anonymization behavior are documented and tested.
- Plan limits have one documented source of truth.

## Mandatory Verification Matrix

| Change Type | Required Verification |
| --- | --- |
| Prisma schema/migration | `pnpm db:generate`, migration status on staging, rollback/forward-fix notes |
| Action handler | unit tests for success, role denial, tenant denial, invalid input, audit path |
| API route | route/action parity, input validation, 401/403/400/500 classification tests |
| MoneyOS workflow | evidence present, approval path, audit log, idempotency proof |
| UI workflow | E2E happy path, denied role path, mobile/empty/error states |
| AI workflow | blocked action tests, approval path tests, eval run with model/config/date |
| Webhook workflow | signed success, invalid signature, duplicate, failure, retry, archive |
| Production proof | authenticated Vercel smoke, latest CI URL, checkpoint update |

## Agent Rules For This Plan

1. Do not open broad implementation PRs that mix unrelated gates.
2. Every issue should close with code, tests, docs, and checkpoint evidence.
3. If a task touches an action, read `docs/04_ACTION_REGISTRY.md` and run `pnpm docs:check`.
4. If a task touches tenant/security/auth, read `docs/06_SECURITY_AND_TENANCY.md`.
5. If a task touches deployment or CI, read `docs/10_DEPLOYMENT_RUNBOOK.md`.
6. If staging/production services are touched, use Production Ops Mode from `agent.md`.
7. Never claim production-ready while any P0 is open.
8. Never claim MoneyOS-ready while #4, #5, #6, #7, or #13 remains open.

## Recommended Next PRs

1. **PR A**: #6 API error classification + tests.
2. **PR B**: #4 evidence-before-billing real evidence count + tests.
3. **PR C**: #5 deliver-report JSON body + `BUYER_DECISION` evidence.
4. **PR D**: #11 staging migration proof docs.
5. **PR E**: #10 authenticated Vercel smoke docs.
6. **PR F**: #7 integration test expansion.
7. **PR G**: #13 monetization UI/API.

## Stop Conditions

Stop and ask before proceeding if any of these appear:

- A production/staging command would mutate real data without rollback notes.
- A migration has already been applied in a shared database and needs history editing.
- A tenant isolation defect allows cross-org read/write.
- A payment/billing action can execute without evidence or approval.
- A GitHub branch protection change is needed.
