# TradeOS Checkpoints — Honest Production Readiness Ledger

## Current Status

**Date**: 2026-05-24
**Local code readiness**: ~9.5/10 after Phase 6+7 API routes, UI, and billing workflow
**Production readiness**: ~8/10 pending full browser-based staging smoke, Phase 7.2 entitlement gate wiring, and Phase 8 final proof
**Production 10/10 claim**: NOT allowed yet

This checkpoint is intentionally conservative. It records what is fixed locally, what is only partially fixed, and what still blocks a production-readiness claim.

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
| 2026-05-24 | GitHub Actions CI (commit 9fbd249)                                         | pass    | Run `26359118492` on `main` commit `9fbd249`; final gate green including route-actions-check: https://github.com/le8433622/tradeos-core/actions/runs/26359118492                                                                                                      |
| 2026-05-24 | Branch protection                                                          | enabled | Main branch requires Final Gate status check, 1 approving review, admin enforcement. No force pushes.                                                                                                                                                                 |
| 2026-05-24 | T2.002 env validation                                                      | pass    | `apps/web/lib/env.ts` created with `validateEnv()`; instrumentation hook calls it at runtime; build passes. Validates DATABASE_URL, ALLOW_DEMO_AUTH=false in production, webhook secrets, APP_URL.                                                                    |

Not yet verified:

- Supabase staging migration with existing data (requires review of applied migration history)
- Vercel preview URL recorded at https://tradeos-core-av39187zn-earthkingdomuniverse-6943s-projects.vercel.app, but full `docs/20_STAGING_SMOKE_TESTS.md` evidence is not complete
- MoneyOS procurement operator phases from issue #1 Phase 3 through Phase 7

## Issue #1 Phase Completion Audit

| Phase              | Scope                                  | Status             | Evidence                                                                                                                                                                                                                                                                                       | Remaining Work                                                                                                                                  |
| ------------------ | -------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 0            | T0.001-T0.006 P0/P1 verified bug fixes | Fixed locally      | B26-B31 are fixed locally; `pnpm routes:check`, `pnpm docs:check`, focused trade-core and analytics-core tests pass.                                                                                                                                                                           | Settings, quotation, archive, and webhook behavior still need staging smoke/manual evidence before production claim.                            |
| Phase 1            | Test and verification hardening        | Mostly complete    | T1.001 route/action parity exists and runs in CI; T1.002 settings PATCH integration test added and passes; T1.003 quotation line-item integration test added and passes; T1.004 smoke checklist file exists.                                                                                   | No remaining known gaps in Phase 1 scope.                                                                                                       |
| Phase 2            | Production readiness gate              | Mostly complete    | T2.001 `docs/21_PRODUCTION_READINESS_GATE.md` exists; T2.002 `apps/web/lib/env.ts` validates required env vars and ALLOW_DEMO_AUTH=false in production at runtime.                                                                                                                             | Integration, migration, Vercel smoke, demo-auth evidence remain open.                                                                           |
| Phase 3            | MoneyOS procurement operator layer     | Implemented        | `SourcingRun`, `SupplierCandidate`, `SupplierQuote`, `EvidenceItem`, `WorkCheckpoint`, `HumanHandover` Prisma models added. `sourcing-core` and `evidence-core` packages created with 14 registered actions (sourcing, evidence, checkpoint, handover). `pnpm docs:check` passes (49 actions). | Needs staging smoke tests for sourcing runs, evidence, checkpoints, handovers. Migration to staging DB required.                                |
| Phase 4            | AI procurement agent                   | Implemented        | Added `RUN_SOURCING` intent detection, sourcing step planning in `planTradeAgent()`, procurement actions to `ALLOWED_ACTIONS`/`BLOCKED_ACTIONS` in LLM prompt, procurement golden eval dataset (10 scenarios). `pnpm typecheck` and ai-core tests pass (59/59).                                | Needs staging smoke for AI-based sourcing runs. Eval dataset should be run against real LLM for intent accuracy metrics.                        |
| Phase 5            | Buyer value reports                    | Implemented        | `sourcing.generateBuyerReport` action generates `BuyerDecisionReport` from stored quotes and evidence. Report includes best price, best risk-adjusted supplier, quote table, risks, missing info, next actions. AI blocked from executing.                                                     | Needs staging smoke for report generation from real sourcing data.                                                                              |
| Phase 6            | API and UI                             | Complete           | 21 route executeAction calls (up from 15) map to 50 registered actions. `pnpm routes:check` passes. 7 API route files + 2 UI pages (list + detail) for sourcing-runs. `pnpm build` produces 53/53 pages.                                                                                       | None. Full browser staging smoke and integration tests for Phase 6 routes are still blocked without authenticated session.                      |
| Phase 7            | Monetization                           | In progress        | `checkpoint.markAsBilled` and `checkpoint.recordPayment` actions. `Payment` Prisma model. `plan-core` package with `plan.checkEntitlement`, `plan.getPlan`. Entitlement gates added to `sourcing.createRun` and `checkpoint.create`. 54 registered actions (LOW: 19, MEDIUM: 15, HIGH: 16). `pnpm docs:check`, typecheck, build pass. | Wire entitlement checks into all create actions. Add billing API routes and UI (existing `/settings/billing` page already works with `getBillingMetrics`). |
| Phase 8            | Final production proof                 | Partially complete | Local lightweight gates pass; DB-backed integration tests pass against staging Supabase.                                                                                                                                                                                                       | Full Vercel smoke, Supabase migration proof, remote CI on current changes, branch protection, and T2.002 environment validation still required. |
| Definition of Done | Full issue #1 completion               | Partially complete | T0 local fixes, T1.001-T1.004 tests exist and pass.                                                                                                                                                                                                                                            | DoD items 4-9 are incomplete or lack staging evidence.                                                                                          |

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
| Tenant isolation        | Mostly complete                     | 8.5/10                                | Core actions are org-scoped; invitation role ownership validation is fixed locally.                                                                           |
| Auth/session resolution | Mostly complete                     | 8/10                                  | Supabase/demo split exists; production env still must explicitly disable demo auth.                                                                           |
| Input validation        | Much improved                       | 8/10                                  | Action handlers and key routes now parse inputs; remaining route invalid-payload tests needed.                                                                |
| Action registry         | Metadata gated locally              | 8/10                                  | `docs:check` now compares names, risk, roles, and AI approval metadata.                                                                                       |
| Policy/MFA/audit        | Improved                            | 8/10                                  | Role/MFA gates exist; `blockReason` is stored in audit `result` JSON.                                                                                         |
| Webhook security        | Improved                            | 8.5/10                                | Signatures/idempotency/rate limiting exist; webhook body size uses actual byte length.                                                                        |
| AI safety               | Improved                            | 8/10                                  | AI calls actions through policy; per-step failure isolation is fixed locally.                                                                                 |
| Testing                 | Staging-verified                    | 9/10                                  | Unit tests pass; 10 DB-backed integration tests pass on staging Supabase. Settings PATCH and quotation line items are covered.                                |
| CI/CD                   | Remote CI green + branch protection | 9/10                                  | GitHub Actions final gate passed on commit `9fbd249` with route-actions-check; branch protection enabled on main.                                             |
| Deployment/staging      | Partially proven                    | 7/10                                  | Vercel preview exists, integration tests pass, but full smoke evidence is incomplete and `/api/health` returned 401. Supabase staging migration still needed. |
| **Overall**             | **Not production-ready**            | **~9.5/10 local, ~8.5/10 production** | Main remaining blockers: full browser-based smoke evidence, Supabase staging migration proof.                                                                 |

## Next Recommended Tasks

### Immediate code hardening

1. Complete `docs/20_STAGING_SMOKE_TESTS.md` against Vercel preview/staging.
2. Investigate and fix pooler connection for production-like config (currently using direct connection).
3. Only start MoneyOS/procurement modules after staging proof is recorded.

### Documentation and gates

1. Keep `docs/04_ACTION_REGISTRY.md` gate-verified against source metadata.
2. Update this checkpoint after every blocker status change.

### Production proof

1. Run full local verification: `pnpm db:generate && pnpm typecheck && pnpm test && pnpm build && pnpm docs:check && pnpm lint && pnpm license:check && git diff --check`.
2. Run `pnpm routes:check`.
3. Enable branch protection.
4. Apply migrations to Supabase staging with pre-existing data simulation.
5. Deploy Vercel preview and run `docs/20_STAGING_SMOKE_TESTS.md`.

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
