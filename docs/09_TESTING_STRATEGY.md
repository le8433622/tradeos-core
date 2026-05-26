# Testing Strategy — Production 10/10

## Required Checks by Change Type

| Change Type           | Required Checks                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------ |
| Docs only             | `pnpm docs:check`, review diff                                                             |
| TypeScript code       | `pnpm typecheck`, `pnpm build`, `pnpm test`                                                |
| Package contracts     | `pnpm typecheck`, `pnpm build`, package tests, `pnpm docs:check`                           |
| Prisma schema         | `pnpm db:generate`, `pnpm build`                                                           |
| Auth/security         | `pnpm typecheck`, `pnpm build`, auth tests                                                 |
| Webhook behavior      | `pnpm typecheck`, `pnpm build`, webhook-core tests, manual webhook smoke test              |
| AI-core change        | `pnpm typecheck`, `pnpm build`, ai-core tests, ai-core eval (optional)                     |
| New registered action | `pnpm typecheck`, `pnpm build`, package tests, `pnpm docs:check`, manual action smoke test |
| Production ops        | Command-specific verification, rollback notes, checkpoint update                           |

## Tenant Invariant Test Requirement

Every registered action that accepts `organizationId` must have tests proving:

- **Missing org → `ORGANIZATION_ACCESS_DENIED`** — action called without org context must fail
- **Wrong tenant org → `ORGANIZATION_ACCESS_DENIED`** — cross-tenant access must be blocked
- **Correct tenant org → success** — scoped to the right org must pass

Applies to all existing and new actions. Retroactively required for:

| Action Name                       | Package       | Status |
| --------------------------------- | ------------- | ------ |
| `sourcing.createPurchaseBaseline` | sourcing-core | TODO   |
| `sourcing.addSupplierAlternative` | sourcing-core | TODO   |
| `sourcing.generateSwitchDecision` | sourcing-core | TODO   |
| `sourcing.submitBuyerDecision`    | sourcing-core | TODO   |

A CI gate (`tenant-invariant-check`) will be added in a future iteration. For now, tenant invariant tests are enforced by code review and by the pre-merge checklist.

## Test Priority Order

1. **Tenant isolation** — every query scoped by `organizationId`, cross-org access blocked
2. **Policy/action authorization** — role gates, permission checks, AI approval gates
3. **MFA enforcement** — always-MFA actions, org-policy MFA, correct mfaLevel forwarding
4. **Approval lifecycle** — status transitions, atomicity, audit logging
5. **AI safety** — HIGH-risk blocked without approval, injection detection, budget enforcement
6. **Webhook idempotency** — duplicate detection, retry, failure recording
7. **Auth resolution** — bearer token, cookie, chunked cookies, demo auth, mfaLevel extraction
8. **Mutation audit** — every registered action writes audit log, handler uses `db(context)`
9. **Input validation** — Zod `.parse()` in all handlers, edge cases for all field types

## Unit Test Targets

### policy-core (29 tests)

- Permission assertion (assertPermission, hasPermission, can)
- Role checking and enforcement
- MFA requirement (isActionMfaRequired for always-MFA and non-MFA actions)
- Action execution (allowed → passes, denied → blocked + audit)
- Cross-tenant input rejection (executeAction rejects mismatched orgId)
- Audit field redaction (sensitive keys, emails, phones)
- Approval creation normalization (derived risk, org validation)

### auth (23 tests)

- requireSessionFromRequest: valid JWT, no cookie, malformed, expired, unknown user
- resolveSessionFromEmail: single org, multi-org, legacy fallback, email not found
- assertSameOrganization: match, mismatch, null/undefined
- assertRole: correct role, wrong role, membership-based role
- getSessionAal: aal1, aal2, malformed token
- Cookie parsing: single cookie, chunked cookies, base64, raw JWT

### webhook-core (33 tests)

- receiveWebhookEvent: idempotency, new vs duplicate, org+channel+eventKey uniqueness
- requireWebhookTenant: production env valid, demo fallback, missing env
- resolveWebhookTenantFromIntegration: matching, no match, DISABLED
- buildWebhookEventKey: deterministic, different input→different key, text truncation
- checkWebhookRateLimit: under limit, over limit, no prior events
- verifyZaloSignature: valid HMAC, invalid HMAC, missing header
- verifyEmailSignature: Mailgun valid, Mailgun invalid, shared secret fallback
- Signature comparison: length-safe timingSafeEqual
- Pipeline: full flow, agent failure handling (NOT marked PROCESSED on failure)

### approval-core (21 tests)

- approveRequest: PENDING→APPROVED, invalid transitions, org mismatch, audit written
- rejectRequest: PENDING→REJECTED, invalid transitions, org mismatch, audit written
- executeApprovedRequest: atomic claim (APPROVED→EXECUTING), concurrent-claim rejection
- failApprovalRequest: EXECUTING→FAILED, valid/invalid transitions
- Audit logs written for all state changes

### ai-core (58 tests)

- detectTradeIntent: Vietnamese/EN quotation, partner, follow-up, lead, vague, injection
- planTradeAgent: LOW execution, HIGH→approval, injection→BLOCKED, budget→BUDGET_EXCEEDED
- LLM fallback: provider failure falls back to keyword detection
- Field extraction: quantity, incoterm, originCountry, destinationCountry
- Missing fields: detected for incomplete trade messages
- No blocked action execution: HIGH-risk steps never execute directly
- AI eval: precision/recall by intent, FPM=0%, injection detection 100%

### analytics-core (27 tests)

- getDashboardMetrics: stale leads, response speed, product count
- getFunnelMetrics: lead→quotation→sent→converted counts
- generateWeeklyReport: inbound volume, response speed, quotation volume, stale leads
- anonymizeTenantPii: user anonymization, legal hold block, multi-org user preservation
- getBillingMetrics: usage tracking, budget comparison
- getPlanLimits: per-plan limits
- Snapshot actions: create/approve with audit

### trade-core (16 tests)

- draftQuotation: creates quotation + line items, calculates total, tenant-isolated
- sendQuotation: status change, approval gated, tenant-isolated
- suggestPartner: returns matching partners
- createProduct/updateProduct: standard CRUD, tenant isolation
- proposeIntroduction: creates request, validates participant orgs
- approveIntroduction/rejectIntroduction: state change, audit, org validation
- disputeIntroduction/reportIntroductionValue: participant-only access, cross-tenant

### crm-core (21 tests)

- createLead, createFollowUpTask, createCompany, createContact: standard CRUD
- updateCompany, updateContact, updateLeadStatus: update with tenant validation
- user.invite: email normalization, role validation, audit
- user.roleUpdate: role validation, MFA requirement, audit
- notification.draft, notification.sendBulk: permission gated, audit
- settings actions: security, budget, profile, introductions, plan — all with correct gates
- privacy.anonymizePii, privacy.legalHold: HIGH risk, MFA, audit, data coverage

### inbox-core (7 tests)

- ingestInboundMessage: create message + conversation, duplicate handling
- findOrCreateConversation: new vs existing, same lead
- Error handling: malformed input, missing fields
- Multiple messages to same conversation: correct ordering

### job-core (21 tests)

- enqueueJob: creates PENDING job with correct data
- claimNextJob: atomic updateMany, concurrent-claim prevention
- completeJob, failJob: status transition, retry backoff math
- recoverStaleRunningJobs: timeout-based recovery
- calculateBackoff: exponential backoff with max cap
- cancelJob: cancellation flow

## Integration Tests

Guarded DB-backed integration tests live in `packages/integration-tests`. They are skipped by default and run only when `RUN_INTEGRATION_TESTS=true` and `DATABASE_URL` points to a real local/staging database.

Current covered cases:

- Registered action execution writes an audit log
- Cross-org action handler access is blocked
- MFA block writes structured `result.blockReason`
- `Deal.organizationId` is present and non-nullable after migrations

Minimum additional smoke tests before production:

1. Webhook full flow: receive → process → inbox create → agent plan → audit log
2. Migration smoke against existing data, not only an empty database
3. Approval lifecycle against a real database
4. Invitation acceptance and role assignment against a real database
5. Settings PATCH updates plan/profile/budget through registered actions
6. Quotation POST persists line items and computes total from items

Issue #1 adds two required verification documents:

- `docs/20_STAGING_SMOKE_TESTS.md` - staging/Vercel preview smoke checklist and evidence template
- `docs/21_PRODUCTION_READINESS_GATE.md` - production gate checklist, required commands, and stop rule

## E2E Tests

Browser-based E2E tests live in `apps/web/e2e/` using **Playwright** (`@playwright/test`).

### Setup

```bash
# Install Playwright browsers (first time only)
pnpm --filter @tradeos/web exec playwright install chromium
```

### Running

```bash
# Starts Next.js dev server automatically, runs tests
E2E_RUN_ENABLED=true pnpm --filter @tradeos/web test:e2e

# Or with custom URL (no dev server needed)
E2E_RUN_ENABLED=true E2E_BASE_URL=https://staging.example.com pnpm --filter @tradeos/web test:e2e
```

### Env Gates

| Env Var           | Required | Default                 | Purpose                                      |
| ----------------- | -------- | ----------------------- | -------------------------------------------- |
| `E2E_RUN_ENABLED` | No       | `false`                 | Safety gate — all tests skip when not `true` |
| `E2E_BASE_URL`    | No       | `http://localhost:3000` | Target app URL                               |
| `E2E_USER_EMAIL`  | No       | `owner@tradeos.local`   | Email for demo auth context                  |
| `E2E_ORG_ID`      | No       | `demo-org`              | Tenant context for multi-org tests           |

### Auth Approach

E2E tests rely on **demo auth** (built-in local auth bypass). When no Supabase session exists, `requirePageSession()` falls through to `getDemoSession()` which returns a hardcoded OWNER session. No real login steps are needed.

When demo auth is removed for production, E2E tests will need real test credentials and an auth bootstrap fixture.

### Test Files

| File                      | Tests | Purpose                                                     |
| ------------------------- | ----- | ----------------------------------------------------------- |
| `e2e/smoke.spec.ts`       | 4     | Protected page loads (dashboard, sourcing, leads, settings) |
| `e2e/procurement.spec.ts` | 3     | Sourcing run list, detail, create page skeleton             |
| `e2e/permissions.spec.ts` | 3     | Permission check, unauthorized redirect, approvals gate     |

### CI Integration

E2E smoke tests run as a conditional CI job (`e2e-test`) on every PR. The job always starts and reports its result, but tests skip when `E2E_RUN_ENABLED` is not `true`. To enable E2E in CI, set `E2E_RUN_ENABLED=true` in the GitHub Actions environment and ensure a test database is available.

```yaml
# .github/workflows/ci.yml — e2e-test job
e2e-test:
  name: E2E Smoke Tests
  needs: install
  runs-on: ubuntu-latest
  if: github.event_name == 'pull_request'
  steps:
    - run: pnpm install --frozen-lockfile
    - run: pnpm db:generate
    - run: pnpm --filter @tradeos/web exec playwright install chromium
    - run: pnpm --filter @tradeos/web test:e2e
```

Current status: **skipped by default** — no E2E database in CI. When a test database is provisioned, set `E2E_RUN_ENABLED=true` as a GitHub Actions secret or environment variable.

### Important

- Missing E2E env vars → tests skip with clear message (not fail silently)
- Screenshots captured on failure → `e2e-screenshots/` directory
- Traces enabled for debugging → view with `npx playwright show-trace`
- No production database writes
- No fake proof when env vars are missing

## Manual Smoke Tests

Before declaring production-ready, test these manually:

1. `ALLOW_DEMO_AUTH=false` — demo auth returns error
2. `/api/health` returns 200
3. `/api/health/deep` returns component status (with HEALTHCHECK_SECRET)
4. Login with valid credentials succeeds
5. Tenant dashboard loads with correct org data
6. Lead creation succeeds → audit log written
7. High-risk action (e.g., billing plan update) → MFA blocked if aal1 → approval required
8. Webhook unsigned request → 401 rejected
9. Webhook signed valid request → 200 processed, inbox created
10. Duplicate webhook → 200 idempotent, no duplicate inbox
11. No secrets in `git diff`
12. Pre-commit hook passes

## CI Pipeline Tests

The CI pipeline (`.github/workflows/ci.yml`) MUST include:

1. `pnpm install` (cached)
2. `pnpm typecheck` (13/13 packages)
3. `pnpm build` (with db:generate)
4. `pnpm test` (all 10 test suites)
5. `pnpm lint` (no new warnings)
6. `pnpm docs:check` (action name, risk, role, and AI-approval metadata parity)
7. `pnpm license:check` (no blocked licenses)
8. `git diff --check` (no whitespace errors)
9. `pnpm routes:check`
10. `pnpm --filter @tradeos/ai-core eval` (only when ai-core changes)
11. `E2E smoke` (only on PR; skipped when `E2E_RUN_ENABLED` is not `true`)
12. `Schema change gate` (only on PR when `schema.prisma` changes; verifies migration exists, no `db push`)

## Pre-commit Gates

`.husky/pre-commit` MUST run and fail on:

1. `pnpm docs:check` — fail on action name or metadata mismatch
2. `npx lint-staged` — fail on formatting errors (no `|| true` fallback)
3. `pnpm typecheck` — fail on type errors

## Regression Testing

When fixing a bug, add a regression test that would have FAILED before the fix:

| Bug type              | Regression test                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------- |
| Boolean parsing       | Test `.parse()` with `'false'` string → returns false                                        |
| Cross-tenant access   | Test action with different `organizationId` → `ORGANIZATION_ACCESS_DENIED`                   |
| MFA bypass            | Test ALWAYS_REQUIRE_MFA action with `aal1` → `MFA_REQUIRED`                                  |
| Cookie parsing        | Test with real Supabase chunked cookie shape → session resolved                              |
| Null input            | Test action with `null` or undefined optional field → handled                                |
| Edge case enum        | Test with invalid enum value → `INVALID_REQUEST_BODY` through current `safeParse()` wrappers |
| Webhook agent failure | Test `runAgent` throw → webhook status `FAILED`, not `PROCESSED`                             |
| Role ownership        | Test custom role from another org rejected for role updates and invitations                  |

## Verification Command Quick Reference

| Command                                                                    | Purpose                   | Expected                                                                       |
| -------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------ |
| `pnpm typecheck`                                                           | TypeScript strict check   | 13/13, 0 errors                                                                |
| `pnpm build`                                                               | Compile all packages      | 53/53 pages                                                                    |
| `pnpm test`                                                                | Run all tests             | 256+ tests pass                                                                |
| `pnpm lint`                                                                | Lint all packages         | No new warnings                                                                |
| `pnpm docs:check`                                                          | Action registry parity    | All actions in source <-> doc, including metadata                              |
| `pnpm routes:check`                                                        | API route action parity   | Every literal `executeAction("...")` in API routes maps to a registered action |
| `pnpm license:check`                                                       | License compliance        | No blocked licenses                                                            |
| `pnpm db:generate`                                                         | Prisma client generation  | Client regenerated                                                             |
| `git diff --check`                                                         | Whitespace check          | No errors                                                                      |
| `RUN_INTEGRATION_TESTS=true pnpm --filter @tradeos/integration-tests test` | Real DB integration suite | Must pass against staging/local DB before production                           |
| `E2E_RUN_ENABLED=true pnpm --filter @tradeos/web test:e2e`                 | Browser E2E tests         | 10 tests in 3 files; all skip when env vars missing                            |

## Known Local Caveat

- Local shell may use Node `v26.0.0`; repo and Vercel target Node `20.x`
- Builds may emit engine warnings while still completing
- `pnpm lint` still uses `next lint` under Next 15; migrate to ESLint CLI before Next 16
- Integration tests require Docker (skipped in CI if unavailable)
- AI eval requires `OPENAI_API_KEY` or `OPENROUTER_API_KEY` env var
- Integration package exists but is skipped unless explicitly enabled with `RUN_INTEGRATION_TESTS=true` and a real `DATABASE_URL`.
