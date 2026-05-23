# TradeOS Checkpoints — Honest Production Readiness Ledger

## Current Status

**Date**: 2026-05-23
**Local code readiness**: ~7.5/10
**Production readiness**: ~6.5-7/10
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

| Date       | Command                                         | Result  | Notes                                                                                                                              |
| ---------- | ----------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-23 | `pnpm db:generate`                              | pass    | Prisma client generated after migration/schema work.                                                                               |
| 2026-05-23 | `pnpm typecheck`                                | pass    | 14/14 workspaces successful after adding integration-tests package.                                                                |
| 2026-05-23 | `pnpm test`                                     | pass    | Unit suites pass; integration suite is present but skipped without DB env.                                                         |
| 2026-05-23 | `pnpm build`                                    | pass    | Next.js generated 53/53 pages.                                                                                                     |
| 2026-05-23 | `pnpm docs:check`                               | pass    | Action name + metadata parity (risk, roles, AI approval).                                                                          |
| 2026-05-23 | `pnpm --filter @tradeos/integration-tests test` | skipped | Package added; tests require `RUN_INTEGRATION_TESTS=true` and real DB.                                                             |
| 2026-05-23 | `pnpm lint`                                     | pass    | Web ESLint passed through turbo.                                                                                                   |
| 2026-05-23 | `pnpm license:check`                            | pass    | No blocked licenses found.                                                                                                         |
| 2026-05-23 | `git diff --check`                              | pass    | No whitespace errors.                                                                                                              |
| 2026-05-23 | GitHub Actions CI                               | pass    | Run `26336332076` on `main` commit `bd65e50`; final gate green: https://github.com/le8433622/tradeos-core/actions/runs/26336332076 |

Not yet verified:

- Supabase staging migration with existing data
- Vercel preview deploy smoke tests

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

| ID  | Issue                                                        | Status                     | Evidence                                                                                                                                           | Remaining Risk                                                                                                                 |
| --- | ------------------------------------------------------------ | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| B10 | `docs:check` compares names only                             | Fixed locally              | `scripts/check-docs.mjs` now compares action names, risk, roles, and AI approval metadata.                                                         | Parser is regex-based, so unusual future action formatting may need script updates.                                            |
| B11 | Action registry doc mismatches                               | Fixed locally              | `docs/04_ACTION_REGISTRY.md` now uses actual action names `organization.settings.updateProfile` and `budget.update`, and updated risk/role counts. | Guarded by B10 metadata checker.                                                                                               |
| B12 | No integration tests with real DB                            | Partially fixed            | Added `packages/integration-tests` with guarded DB-backed tests for action/audit, cross-org blocking, MFA audit, and Deal migration shape.         | Tests are skipped unless `RUN_INTEGRATION_TESTS=true` and `DATABASE_URL` point to a real DB. Staging execution still required. |
| B13 | Settings UI null handling                                    | Unknown / needs review     | Not re-reviewed in this checkpoint.                                                                                                                | Must inspect `apps/web/app/settings/page.tsx` and add null-safe rendering/tests.                                               |
| B14 | `createQuotationSchema` missing `items`                      | Fixed locally              | `quotationLineItemSchema` and `items` were added to `apps/web/lib/validate.ts`.                                                                    | Need route/component test for quotation line items.                                                                            |
| B15 | AI step failure aborts full plan                             | Fixed locally              | `runTradeAgent` records failed step results and continues remaining steps; ai-core tests pass.                                                     | Approval-request failure is recorded as `REJECTED`, execution failure as `FAILED`.                                             |
| B16 | Payload size check trusts `Content-Length`                   | Fixed for webhook pipeline | `packages/webhook-core/src/pipeline.ts` reads actual body text, checks byte length, then parses JSON; webhook tests pass.                          | `apps/web/lib/validate.ts::checkPayloadSize()` remains header-only and unused. If used later, update it or remove it.          |
| B17 | `X-Request-Id` dropped after middleware response replacement | Fixed locally              | Middleware re-applies header after cookie refresh response replacement.                                                                            | Needs middleware regression test or manual request verification.                                                               |
| B18 | Agent route uses wrong source context                        | Fixed locally              | `POST /api/agent` passes `source: 'ai'`.                                                                                                           | Needs route-level policy regression test.                                                                                      |

## Newly Discovered Gaps

| ID  | Issue                                                                    | Severity      | File(s)                                                | Notes                                                                             |
| --- | ------------------------------------------------------------------------ | ------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| B23 | `user.invite` validates role existence but not system/same-org ownership | Fixed locally | `packages/crm-core/src/index.ts`                       | Invitation roleId now must be system or same-org; crm-core regression test added. |
| B24 | `registerCrmActions()` lists `userRoleUpdateAction` twice                | Fixed locally | `packages/crm-core/src/index.ts`                       | Duplicate registry list entry removed.                                            |
| B25 | Action registry metadata is manually maintained                          | Fixed locally | `scripts/check-docs.mjs`, `docs/04_ACTION_REGISTRY.md` | Metadata is still manually written, but CI now checks it against source.          |

## Production Readiness Snapshot

| Area                    | Status                      | Score                              | Notes                                                                                                                                                |
| ----------------------- | --------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tenant isolation        | Mostly complete             | 8.5/10                             | Core actions are org-scoped; invitation role ownership validation is fixed locally.                                                                  |
| Auth/session resolution | Mostly complete             | 8/10                               | Supabase/demo split exists; production env still must explicitly disable demo auth.                                                                  |
| Input validation        | Much improved               | 8/10                               | Action handlers and key routes now parse inputs; remaining route invalid-payload tests needed.                                                       |
| Action registry         | Metadata gated locally      | 8/10                               | `docs:check` now compares names, risk, roles, and AI approval metadata.                                                                              |
| Policy/MFA/audit        | Improved                    | 8/10                               | Role/MFA gates exist; `blockReason` is stored in audit `result` JSON.                                                                                |
| Webhook security        | Improved                    | 8.5/10                             | Signatures/idempotency/rate limiting exist; webhook body size uses actual byte length.                                                               |
| AI safety               | Improved                    | 8/10                               | AI calls actions through policy; per-step failure isolation is fixed locally.                                                                        |
| Testing                 | Better but staging unproven | 8/10                               | Unit tests pass; guarded DB integration package added but not run against staging.                                                                   |
| CI/CD                   | Remote CI green             | 7/10                               | GitHub Actions final gate passed on `main`; branch protection still unverified.                                                                      |
| Deployment/staging      | Not production-proven       | 5/10                               | No recorded Supabase staging migration or Vercel preview smoke in this checkpoint.                                                                   |
| **Overall**             | **Not production-ready**    | **7.5/10 local, ~7/10 production** | Main blockers are B12 staging execution, B13, B24, full verification, GitHub CI/branch protection, Supabase migration proof, and Vercel smoke tests. |

## Next Recommended Tasks

### Immediate code hardening

1. Review/fix B13: settings UI null handling.
2. Run guarded integration tests against a real staging/local DB.

### Documentation and gates

1. Keep `docs/04_ACTION_REGISTRY.md` gate-verified against source metadata.
2. Update this checkpoint after every blocker status change.

### Production proof

1. Run full local verification: `pnpm typecheck && pnpm test && pnpm build && pnpm docs:check && pnpm lint && pnpm license:check && git diff --check`.
2. Enable branch protection.
3. Apply migrations to Supabase staging with pre-existing data simulation.
4. Deploy Vercel preview and run smoke tests.

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
