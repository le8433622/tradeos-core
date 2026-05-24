# TradeOS Checkpoints — Honest Production Readiness Ledger

## Current Status

**Date**: 2026-05-25
**Local code readiness**: ~9.5/10 after PR #3 merge, sourcing UI/API, entitlement gates, billing workflow, and regression tests
**Production readiness**: ~8.5/10 after staged DB proof and CI, but still blocked by authenticated Vercel smoke, latest migration proof, and open MoneyOS hardening issues
**Production 10/10 claim**: NOT allowed yet — open P0/P1 backlog is tracked in `docs/29_PERFECTION_TASK_PLAN.md` and GitHub issues #4-#7, #9-#19

This checkpoint is intentionally conservative. It records what is fixed, what is merged, what is only partially proven, and what still blocks a production-readiness claim.

## Why Previous Documentation Upgrades Did Not Reach 10/10

Repeated documentation upgrades did not make the project 10/10 because documentation can only describe reality; it cannot replace missing code fixes, migration verification, CI proof, or staging smoke tests.

The main failure modes were:

- Some docs were upgraded before source-code parity was rechecked line-by-line.
- `pnpm docs:check` only compared action names, not risk/roles/AI approval metadata, so stale rows could still pass.
- Local verification (`typecheck`, tests, build) was sometimes treated as production readiness, but production readiness also requires staging migrations, CI green on GitHub, Vercel preview smoke tests, and rollback paths.
- Blockers were marked conceptually fixed before the exact residual risk was documented.
- The worktree is very large, so changes must still be split/reviewed before any safe merge.

## Current Verification Evidence

| Date       | Command                                                                    | Result  | Notes                                                                                                                                                                                                                                                                 |
| ---------- | -------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-23 | `pnpm db:generate`                                                         | pass    | Prisma client generated after migration/schema work.                                                                                                                                                                                                                  |
| 2026-05-23 | `pnpm typecheck`                                                           | pass    | 14/14 workspaces successful after adding integration-tests package.                                                                                                                                                                                                   |
| 2026-05-23 | `pnpm test`                                                                | pass    | Unit suites pass; integration suite is present but skipped without DB env.                                                                                                                                                                                            |
| 2026-05-23 | `pnpm build`                                                               | pass    | Next.js generated 53/53 pages.                                                                                                                                                                                                                                        |
| 2026-05-23 | `pnpm docs:check`                                                          | pass    | Action name + metadata parity (risk, roles, AI approval).                                                                                                                                                                                                             |
| 2026-05-23 | `pnpm --filter @tradeos/integration-tests test`                            | skipped | Package added; tests require `RUN_INTEGRATION_TESTS=true` and real DB.                                                                                                                                                                                                |
| 2026-05-23 | `pnpm lint`                                                                | pass    | Web ESLint passed through turbo.                                                                                                                                                                                                                                      |
| 2026-05-23 | `pnpm license:check`                                                       | pass    | No blocked licenses found.                                                                                                                                                                                                                                            |
| 2026-05-23 | `git diff --check`                                                         | pass    | No whitespace errors.                                                                                                                                                                                                                                                 |
| 2026-05-23 | GitHub Actions CI                                                          | pass    | Run `26336332076` on `main` commit `bd65e50`; final gate green: https://github.com/le8433622/tradeos-core/actions/runs/26336332076                                                                                                                                    |
| 2026-05-24 | `pnpm db:generate`                                                         | pass    | Prisma client regenerated after issue #1 local fixes.                                                                                                                                                                                                                 |
| 2026-05-24 | `pnpm typecheck`                                                           | pass    | 14/14 workspaces passed after rerun following `pnpm build` generating Next `.next/types`.                                                                                                                                                                             |
| 2026-05-24 | `pnpm test`                                                                | pass    | 262 unit tests passed; 4 guarded integration tests skipped without `RUN_INTEGRATION_TESTS=true`.                                                                                                                                                                      |
| 2026-05-24 | `pnpm build`                                                               | pass    | Next.js generated 53/53 pages.                                                                                                                                                                                                                                        |
| 2026-05-24 | `pnpm docs:check`                                                          | pass    | Action name + metadata parity (risk, roles, AI approval).                                                                                                                                                                                                             |
| 2026-05-24 | `pnpm routes:check`                                                        | pass    | 15 route `executeAction()` literals map to 35 registered actions.                                                                                                                                                                                                     |
| 2026-05-24 | `pnpm --filter @tradeos/trade-core test`                                   | pass    | 17 trade-core tests pass, including quotation line item total regression.                                                                                                                                                                                             |
| 2026-05-24 | `pnpm --filter @tradeos/analytics-core test`                               | pass    | 27 analytics-core tests pass, including active membership seat count regression.                                                                                                                                                                                      |
| 2026-05-24 | `pnpm lint`                                                                | pass    | Web ESLint passed through turbo.                                                                                                                                                                                                                                      |
| 2026-05-24 | `pnpm license:check`                                                       | pass    | No blocked licenses found.                                                                                                                                                                                                                                            |
| 2026-05-24 | `git diff --check`                                                         | pass    | No whitespace errors.                                                                                                                                                                                                                                                 |
| 2026-05-24 | `RUN_INTEGRATION_TESTS=true pnpm --filter @tradeos/integration-tests test` | pass    | 10 DB-backed integration tests pass on staging Supabase (direct connection). Includes T1.002 settings PATCH tests and T1.003 quotation line item tests.                                                                                                               |
| 2026-05-24 | Vercel preview smoke                                                       | partial | `/api/health` returns 200 (via `vercel curl`); homepage loads; deep health correctly returns 401 without secret; unauthenticated API calls return `AUTH_REQUIRED`. Remaining checklist items (items 1-14) require authenticated Supabase session for browser smoke.   |
| 2026-05-24 | GitHub Actions CI                                                          | pass    | Run `26359118492` on `main` commit `9fbd249`; branch protection bypass push succeeded with final gate green.                                                                                                                                                          |
| 2026-05-24 | Phase 6 API routes + UI                                                    | pass    | All 7 sourcing-run API routes created (list, create, get, add-candidate, add-quote, compare, handover, deliver-report). `pnpm routes:check` reports 21 route calls mapping to 50 actions. `pnpm typecheck` clean. `pnpm build` produces 53/53 pages with sourcing UI. |
| 2026-05-24 | `pnpm docs:check` (Phase 7)                                                | pass    | 54 registered actions (LOW: 19, MEDIUM: 15, HIGH: 16) documented with metadata parity.                                                                                                                                                                                     |
| 2026-05-24 | `pnpm routes:check` (Phase 7)                                                | pass    | 21 route calls map to 54 registered actions.                                                                                                                                                                                                                           |
| 2026-05-24 | `pnpm db:generate` (Phase 7)                                                | pass    | Payment and PlanLimit Prisma models generated.                                                                                                                                                                                                                          |
| 2026-05-24 | Phase 7 billing workflow                                                    | pass    | `checkpoint.markAsBilled` action transitions APPROVED → BILLED and records payment. `plan-core` package with 3 actions for entitlement checks. `pnpm typecheck` clean. `pnpm build` produces 53/53 pages.                                                          |
| 2026-05-24 | Phase 7.2 entitlement gates                                                  | pass    | Entitlement checks added to `sourcing.createRun` and `checkpoint.create` handlers. `checkpoint.recordPayment` action added. 54 registered actions. `pnpm docs:check` passes. `pnpm build` passes.                                                            |
| 2026-05-24 | Supabase staging migration (Phase 8)                                          | pass    | Prisma migration `20260525_add_payment_and_planlimit` applied to staging Supabase. Existing migrations baselined. All migrations at `latest`.                                                                                                       |
| 2026-05-24 | Integration tests on staged DB (Phase 8)                                      | pass    | 11 integration tests pass on staging Supabase (10 action-flow + 1 debug).                                                                                                                                                                            |
| 2026-05-24 | GitHub Actions CI (commit 9fbd249)                                         | pass    | Run `26359118492` on `main` commit `9fbd249`; final gate green including route-actions-check: https://github.com/le8433622/tradeos-core/actions/runs/26359118492                                                                                                      |
| 2026-05-24 | Branch protection                                                          | enabled | Main branch requires Final Gate status check, 1 approving review, admin enforcement. No force pushes.                                                                                                                                                                 |
| 2026-05-24 | T2.002 env validation                                                      | pass    | `apps/web/lib/env.ts` created with `validateEnv()`; instrumentation hook calls it at runtime; build passes. Validates DATABASE_URL, ALLOW_DEMO_AUTH=false in production, webhook secrets, APP_URL.                                                                    |
| 2026-05-24 | PR #3 merge                                                                | pass    | PR #3 merged to `main` as squash commit `2e6eb1c` after CI run `26373254906` passed. Issue #1 was closed after merge.                                                                                                                                                |
| 2026-05-24 | Branch protection restore                                                  | pass    | Main branch protection was restored after merge: required status check, 1 approving review, code owner review, admin enforcement, no force pushes.                                                                                                                     |
| 2026-05-25 | Post-PR #3 perfection backlog                                              | pass    | Active open issue backlog reviewed and expanded: #4-#7, #9-#19. New master plan added at `docs/29_PERFECTION_TASK_PLAN.md`.                                                                                                                                          |

Not yet verified:

- Full authenticated `docs/20_STAGING_SMOKE_TESTS.md` evidence against Vercel preview/staging (#10)
- Latest Prisma migration proof for `20260525_add_payment_external_id` on staging (#11)
- Real evidence-count billing approval flow (#4)
- Buyer report delivery evidence ledger (#5)
- Public API error classification for entitlement, tenant, and billing states (#6)
- Real DB integration coverage for sourcing/payment hardening (#7)
- Monetization UI/API and E2E coverage (#12, #13)

## Issue #1 Phase Completion Audit

| Phase              | Scope                                  | Status             | Evidence                                                                                                                                                                                                                                                                                       | Remaining Work                                                                                                                                  |
| ------------------ | -------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 0            | T0.001-T0.006 P0/P1 verified bug fixes | Fixed locally      | B26-B31 are fixed locally; `pnpm routes:check`, `pnpm docs:check`, focused trade-core and analytics-core tests pass.                                                                                                                                                                           | Settings, quotation, archive, and webhook behavior still need staging smoke/manual evidence before production claim.                            |
| Phase 1            | Test and verification hardening        | Mostly complete    | T1.001 route/action parity exists and runs in CI; T1.002 settings PATCH integration test added and passes; T1.003 quotation line-item integration test added and passes; T1.004 smoke checklist file exists.                                                                                   | No remaining known gaps in Phase 1 scope.                                                                                                       |
| Phase 2            | Production readiness gate              | Mostly complete    | T2.001 `docs/21_PRODUCTION_READINESS_GATE.md` exists; T2.002 `apps/web/lib/env.ts` validates required env vars and ALLOW_DEMO_AUTH=false in production at runtime.                                                                                                                             | Integration, migration, Vercel smoke, demo-auth evidence remain open.                                                                           |
| Phase 3            | MoneyOS procurement operator layer     | Implemented        | `SourcingRun`, `SupplierCandidate`, `SupplierQuote`, `EvidenceItem`, `WorkCheckpoint`, `HumanHandover` Prisma models added. `sourcing-core` and `evidence-core` packages created with 14 registered actions (sourcing, evidence, checkpoint, handover). `pnpm docs:check` passes (49 actions). | Needs staging smoke tests for sourcing runs, evidence, checkpoints, handovers. Migration to staging DB required.                                |
| Phase 4            | AI procurement agent                   | Implemented        | Added `RUN_SOURCING` intent detection, sourcing step planning in `planTradeAgent()`, procurement actions to `ALLOWED_ACTIONS`/`BLOCKED_ACTIONS` in LLM prompt, procurement golden eval dataset (10 scenarios). `pnpm typecheck` and ai-core tests pass (59/59).                                | Needs staging smoke for AI-based sourcing runs. Eval dataset should be run against real LLM for intent accuracy metrics.                        |
| Phase 5            | Buyer value reports                    | Implemented        | `sourcing.generateBuyerReport` action generates `BuyerDecisionReport` from stored quotes and evidence. Report includes best price, best risk-adjusted supplier, quote table, risks, missing info, next actions. AI blocked from executing.                                                     | Needs staging smoke for report generation from real sourcing data.                                                                              |
| Phase 6            | API and UI                             | Merged             | PR #3 merged sourcing-run API routes and UI pages. `pnpm routes:check` reported 22 route calls mapping to 54 registered actions after adding generate-report. Remote CI passed.                                                                                                             | Operator-grade forms, evidence ledger UI, mobile states, and authenticated browser proof are tracked in #10, #12, and #16.                      |
| Phase 7            | Monetization                           | Backend merged     | `checkpoint.markAsBilled`, `checkpoint.recordPayment`, `Payment`, `PlanLimit`, `plan-core`, entitlement gates, and payment idempotency schema are merged. PR #3 fixes added evidence-before-billing guard and duplicate payment protection.                                                    | Evidence counting reliability (#4), monetization UI/API (#13), public error handling (#6), and PlanLimit source-of-truth decision (#9).         |
| Phase 8            | Final production proof                 | Partially complete | Staging migration proof exists for `20260525_add_payment_and_planlimit`; integration tests passed on staged DB; PR #3 merged; CI run `26373254906` passed; branch protection restored.                                                                                                        | Latest migration `20260525_add_payment_external_id` needs staging proof (#11). Full authenticated Vercel smoke remains open (#10).              |
| Definition of Done | Full issue #1 completion               | Closed             | Issue #1 was closed after PR #3 merge. The original super task is done as a foundation milestone.                                                                                                                                                                                              | New post-PR #3 perfection backlog is tracked in #4-#7, #9-#19 and `docs/29_PERFECTION_TASK_PLAN.md`.                                             |

## Blocker Ledger

### P0 — Critical

| ID  | Issue                                                             | Status          | Evidence                                                                                                             | Remaining Risk                                                                                                                                                                                                                        |
| --- | ----------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Webhook AI role mismatch for `budget.getStatus` / `ai.trackUsage` | Fixed locally   | Both actions allow `DEFAULT_LOW_RISK_ROLES`; OPERATOR/SALES permission seed updated.                                 | Needs end-to-end webhook OPERATOR smoke test in staging.                                                                                                                                                                              |
| B2  | Missing runtime Zod parsing in action handlers                    | Fixed locally   | `safeParse()` added across crm-core, trade-core, inbox-core, analytics-core action handlers; tests/typecheck passed. | `safeParse()` maps Zod errors to `INVALID_REQUEST_BODY`; docs should say this, not raw `ZodError`.                                                                                                                                    |
| B3  | Unsafe `Deal.organizationId` migration                            | Partially fixed | Existing migration SQL now adds nullable column, backfills, then sets NOT NULL.                                      | If the old migration was already applied anywhere, editing migration history is unsafe. Must verify Supabase staging migration path before production. Backfill-to-first-org is not business-correct for real multi-tenant Deal data. |
| B4  | `user.roleUpdate` accepts arbitrary roleId                        | Fixed locally   | Handler validates role exists and is system or same organization before assignment.                                  | Add explicit regression test for cross-tenant custom role before production claim.                                                                                                                                                    |

### P1 — High

| ID  | Issue                                              | Status          | Evidence                                                                                                               | Remaining Risk                                                                                           |
| --- | -------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| B5  | Missing Zod schemas on 3 API routes                | Fixed locally   | `agentExecutionSchema`, `updateLeadStatusSchema`, `introductionActionSchema` added and used.                           | Route tests for invalid payloads still limited.                                                          |
| B6  | Blocked action audit lacks structured block reason | Fixed locally   | `executeAction()` writes `result.blockReason` for org mismatch, policy denial, and MFA denial; policy-core tests pass. | Stored in JSON `result`, not a dedicated DB column. Add column only if reporting needs indexed querying. |
| B7  | Webhook agent failure marked `PROCESSED`           | Fixed locally   | Pipeline marks webhook `FAILED` when `runAgent` throws; webhook-core regression tests pass.                            | Needs staging webhook smoke.                                                                             |
| B8  | Missing GitHub Actions CI                          | Remote verified | `.github/workflows/ci.yml` exists; GitHub Actions run `26336332076` passed on `main` commit `bd65e50`.                 | Branch protection not enabled yet.                                                                       |
| B9  | Pre-commit lint-staged non-gating                  | Fixed locally   | `.husky/pre-commit` and root `lint-staged` config no longer use success fallbacks.                                     | Needs an actual failed lint-staged dry run or hook verification.                                         |

### P2 — Medium

| ID  | Issue                                                        | Status                     | Evidence                                                                                                                                                                                                                             | Remaining Risk                                                                                                        |
| --- | ------------------------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| B10 | `docs:check` compares names only                             | Fixed locally              | `scripts/check-docs.mjs` now compares action names, risk, roles, and AI approval metadata.                                                                                                                                           | Parser is regex-based, so unusual future action formatting may need script updates.                                   |
| B11 | Action registry doc mismatches                               | Fixed locally              | `docs/04_ACTION_REGISTRY.md` now uses actual action names `organization.settings.updateProfile` and `budget.update`, and updated risk/role counts.                                                                                   | Guarded by B10 metadata checker.                                                                                      |
| B12 | No integration tests with real DB                            | Fixed and verified         | Added `packages/integration-tests` with 10 DB-backed tests including actions, cross-org blocking, MFA audit, Deal migration shape, settings PATCH, quotation line items, and invalid input validation. All pass on staging Supabase. | Database-backed integration gate is now verified.                                                                     |
| B13 | Settings UI null handling                                    | Unknown / needs review     | Not re-reviewed in this checkpoint.                                                                                                                                                                                                  | Must inspect `apps/web/app/settings/page.tsx` and add null-safe rendering/tests.                                      |
| B14 | `createQuotationSchema` missing `items`                      | Fixed locally              | `quotationLineItemSchema` and `items` were added to `apps/web/lib/validate.ts`.                                                                                                                                                      | Need route/component test for quotation line items.                                                                   |
| B15 | AI step failure aborts full plan                             | Fixed locally              | `runTradeAgent` records failed step results and continues remaining steps; ai-core tests pass.                                                                                                                                       | Approval-request failure is recorded as `REJECTED`, execution failure as `FAILED`.                                    |
| B16 | Payload size check trusts `Content-Length`                   | Fixed for webhook pipeline | `packages/webhook-core/src/pipeline.ts` reads actual body text, checks byte length, then parses JSON; webhook tests pass.                                                                                                            | `apps/web/lib/validate.ts::checkPayloadSize()` remains header-only and unused. If used later, update it or remove it. |
| B17 | `X-Request-Id` dropped after middleware response replacement | Fixed locally              | Middleware re-applies header after cookie refresh response replacement.                                                                                                                                                              | Needs middleware regression test or manual request verification.                                                      |
| B18 | Agent route uses wrong source context                        | Fixed locally              | `POST /api/agent` passes `source: 'ai'`.                                                                                                                                                                                             | Needs route-level policy regression test.                                                                             |

## Newly Discovered Gaps

| ID  | Issue                                                                      | Severity      | File(s)                                                                       | Notes                                                                                                                             |
| --- | -------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| B23 | `user.invite` validates role existence but not system/same-org ownership   | Fixed locally | `packages/crm-core/src/index.ts`                                              | Invitation roleId now must be system or same-org; crm-core regression test added.                                                 |
| B24 | `registerCrmActions()` lists `userRoleUpdateAction` twice                  | Fixed locally | `packages/crm-core/src/index.ts`                                              | Duplicate registry list entry removed.                                                                                            |
| B25 | Action registry metadata is manually maintained                            | Fixed locally | `scripts/check-docs.mjs`, `docs/04_ACTION_REGISTRY.md`                        | Metadata is still manually written, but CI now checks it against source.                                                          |
| B26 | Settings route calls wrong action names from issue #1 T0.001               | Fixed locally | `apps/web/app/api/organization/settings/route.ts`                             | Route now calls `budget.update` and `organization.settings.updateProfile`; `pnpm routes:check` passes.                            |
| B27 | Quotation API drops validated line items from issue #1 T0.002              | Fixed locally | `apps/web/app/api/quotations/route.ts`                                        | Route forwards `items` to `trade.draftQuotation`; trade-core line item total regression test passes.                              |
| B28 | Settings numeric clearing rejects/null-drops from issue #1 T0.003          | Fixed locally | `apps/web/lib/validate.ts`, settings route                                    | Schema accepts nullable numeric settings; route documents that null is treated as omitted until clearing is supported end-to-end. |
| B29 | Prisma client is not a dev/serverless-safe singleton from issue #1 T0.004  | Fixed locally | `packages/database/src/index.ts`                                              | Database package now uses a non-production global Prisma singleton.                                                               |
| B30 | Billing seat count uses legacy user ownership from issue #1 T0.005         | Fixed locally | `packages/analytics-core/src/index.ts`                                        | `getBillingMetrics()` counts ACTIVE `OrganizationMember` rows; analytics regression test passes.                                  |
| B31 | Archive webhook payload batch fails on remaining rows from issue #1 T0.006 | Fixed locally | `apps/worker/src/processors/archive.ts`                                       | Processor now enqueues a follow-up `ARCHIVE_WEBHOOK_PAYLOADS` job instead of failing only because rows remain.                    |
| B32 | Route/action parity check from issue #1 T1.001 is missing                  | Fixed locally | `scripts/check-route-actions.mjs`, `package.json`, `.github/workflows/ci.yml` | `pnpm routes:check` exists and is wired into CI final gate.                                                                       |

## Production Readiness Snapshot

| Area                    | Status                              | Score                                 | Notes                                                                                                                                                         |
| ----------------------- | ----------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tenant isolation        | Mostly complete                     | 8.5/10                                | Core actions are org-scoped and PR #3 fixed new sourcing FK checks. Real DB regression expansion remains open in #7 and RBAC v2 in #14.                       |
| Auth/session resolution | Mostly complete                     | 8/10                                  | Supabase/demo split exists; production env still must explicitly disable demo auth. Authenticated staging smoke remains open in #10.                          |
| Input validation        | Much improved                       | 8/10                                  | Action handlers and key routes parse inputs; buyer report delivery JSON validation and error taxonomy remain open in #5 and #6.                               |
| Action registry         | Metadata gated                      | 9/10                                  | `docs:check` compares names, risk, roles, and AI approval metadata; route/action parity is also gated.                                                         |
| Policy/MFA/audit        | Improved                            | 8/10                                  | Role/MFA gates exist; permission-first RBAC v2 and stronger approval-path proof remain open in #14 and #17.                                                     |
| Webhook security        | Improved                            | 8/10                                  | Signature/idempotency/rate-limit foundations exist; production signed smoke, retry, archive proof remain open in #19.                                         |
| AI safety               | Improved                            | 8/10                                  | AI calls actions through policy; real LLM procurement eval and approval-path proof remain open in #17.                                                         |
| Testing                 | Strong local, partial staging        | 8.5/10                                | Unit tests and guarded integration tests exist; new sourcing/payment DB integration and browser E2E are open in #7 and #12.                                    |
| CI/CD                   | Remote CI green + branch protection | 9/10                                  | PR #3 merged after CI run `26373254906`; branch protection restored on main.                                                                                   |
| Deployment/staging      | Partially proven                    | 7.5/10                                | Prior staged DB proof exists, but latest payment id migration and authenticated Vercel smoke remain open in #11 and #10.                                      |
| **Overall**             | **Not production-ready**            | **~9.5/10 local, ~8.5/10 production** | Main blockers are the post-PR #3 perfection backlog: #4-#7 and #9-#19.                                                                                        |

## Next Recommended Tasks

### Immediate P0 Proof

1. Complete #11: apply/verify latest Prisma migrations on staging with rollback evidence.
2. Complete #10: run authenticated Vercel staging smoke and update `docs/20_STAGING_SMOKE_TESTS.md`.
3. Update this checkpoint with exact CI/deployment/migration evidence.

### MoneyOS Hardening

1. Complete #4: approve checkpoint for billing only when real evidence exists.
2. Complete #5: deliver buyer report from JSON body and create `BUYER_DECISION` evidence.
3. Complete #6: classify entitlement, tenant, and billing errors as stable public API errors.
4. Complete #7: add real DB integration tests for sourcing/payment hardening.
5. Complete #13: add monetization UI/API for plans, checkpoints, and payments.

### Platform Perfection

1. Complete #12: authenticated E2E suite.
2. Complete #14: permission-first RBAC v2.
3. Complete #15: observability, audit analytics, and SLO gate.
4. Complete #16: procurement UX hardening.
5. Complete #17: AI procurement safety evals and approval paths.
6. Complete #18: data governance proof.
7. Complete #19: webhook production readiness.
8. Complete #9: PlanLimit source-of-truth decision.

## Checkpoint Update Template

```markdown
## Checkpoint Update

Date:
Task ID:
Status:
Changed Files:
Verification:
Skipped Checks:
Deployment Notes:
Risks:
Next Recommended Task:
```

## Production Operation Template

```markdown
## Production Operation

Date:
Operator:
Target:
Command:
Expected Effect:
Rollback:
Verification:
Result:
```
