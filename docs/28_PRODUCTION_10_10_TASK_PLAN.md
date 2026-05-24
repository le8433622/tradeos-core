# Production 10/10 Task Plan — Zero Rework Edition

## Status Note — 2026-05-25

PR #3 has been merged and issue #1 has been closed. For all post-PR #3 work, use `docs/29_PERFECTION_TASK_PLAN.md` as the active master plan. This document remains useful for historical blocker context and dependency rationale, but its early status bullets are intentionally superseded by `docs/13_CHECKPOINTS.md` and `docs/29_PERFECTION_TASK_PLAN.md`.

## Current Truth — 2026-05-23

This plan is the execution map, not proof of production readiness. The project is **not 10/10 yet**.

Current state:

- Local code readiness: ~8/10 after issue #1 P0/P1 local fixes.
- Production readiness: ~7/10 until staging migration proof, remote CI with route/action parity, branch protection, and smoke evidence are recorded.
- P0 critical blockers are fixed locally or partially mitigated, but B3 still needs staging migration proof.
- P1 high blockers are fixed locally; B6 uses `result.blockReason` in audit JSON rather than a dedicated DB column.
- P2 still has open/partial items: B12 staging execution, T1.002 settings PATCH integration coverage, T1.003 quotation route integration coverage, and route-level web regression coverage. B10, B15, B16, B23-B32 are fixed locally.
- Issue #1 Phase 3 through Phase 7 (MoneyOS procurement operator, evidence, checkpoints, handover, procurement AI, buyer reports, API/UI, monetization) have not started.
- A 10/10 claim is blocked until full local verification, GitHub CI, branch protection, Supabase staging migration, and Vercel preview smoke tests are recorded.

Why repeated documentation upgrades did not reach 10/10:

- Docs were improved faster than source parity was verified.
- `pnpm docs:check` only checked action names, so metadata drift survived.
- Passing local tests/build was treated too optimistically; production readiness also requires staging and CI proof.
- Some blockers were marked resolved without recording the residual risk.

## The Problem

Earlier readiness was ~7/10. The project had 22 known blockers (4 critical, 5 high, 9 medium, 4 low). Previous phases (0–4) fixed foundation issues but did NOT address:

- Action handler Zod `.parse()` gap (CRITICAL)
- Role mismatches in webhook AI context (CRITICAL)
- Unsafe database migration (CRITICAL)
- Missing CI pipeline (HIGH)
- Webhook agent failure handling (HIGH)
- Docs-to-code mismatches (MEDIUM)

This plan is still valid as a dependency map, but status must be read from `docs/13_CHECKPOINTS.md`. Do not mark a phase complete here unless verification is recorded there.

## Phase Dependency Map

```
P0: Blocker Fix — Critical ──────────────────────────────┐
  B1 Role mismatch (webhook AI → budget.getStatus)       │
  B2 Zod .parse() in all 35 action handlers              │
  B3 Unsafe Deal migration                               │  Everything below
  B4 user.roleUpdate role validation                     │  depends on P0
                                                         │
P1: Blocker Fix — High ──────────────────────────────────┤
  B5 Missing route Zod schemas (3 routes)                │
  B6 MFA audit structured reason                        │
  B7 Webhook agent failure handling                     │  Security fixes
  B8 CI pipeline (.github/workflows/ci.yml)             │  depend on P0
  B9 Fix pre-commit gate (remove || true)               │
                                                         │
P2: Blocker Fix — Medium ───────────────────────────────┤
  B10 Upgrade docs:check to compare full metadata        │
  B11 Fix action registry doc mismatches (7 actions)     │  Doc parity
  B12 Integration tests (T2.10)                         │  Tests
  B13 Settings UI null handling                          │
  B14 Quotation schema items field                       │  Code quality
  B15 Step execution isolation in ai-core                │
  B16 checkPayloadSize body read                         │
  B17 X-Request-Id middleware fix                        │
  B18 Agent route source context fix                     │
                                                         │
P3: Docs & Verification ────────────────────────────────┤
  Update all contract docs to match fixed code           │  Final sync
  Run full verification suite                            │
  Update checkpoints with final status                   │
                                                         │
P4: Production Staging ──────────────────────────────────┘
  GitHub CI green + branch protection
  Supabase staging migration verified
  Vercel preview deploy + smoke tests
```

## Status Tracker

| ID      | Status                             | Production Notes                                                                                                                                                                                                                         |
| ------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1      | Fixed locally                      | Needs webhook OPERATOR smoke test.                                                                                                                                                                                                       |
| B2      | Fixed locally                      | Handler parsing exists; invalid-input route/action tests should be expanded.                                                                                                                                                             |
| B3      | Partially fixed                    | Migration SQL is safer locally, but staging migration with existing data is not verified.                                                                                                                                                |
| B4      | Fixed locally                      | Add explicit cross-tenant custom role regression test.                                                                                                                                                                                   |
| B5      | Fixed locally                      | Route schemas added; invalid payload tests should be added.                                                                                                                                                                              |
| B6      | Fixed locally                      | Audit result JSON includes structured `blockReason`; no dedicated DB column.                                                                                                                                                             |
| B7      | Fixed locally                      | Add regression test for agent error -> webhook FAILED.                                                                                                                                                                                   |
| B8      | Fixed locally                      | GitHub CI must be pushed and observed green.                                                                                                                                                                                             |
| B9      | Fixed locally                      | Hook behavior should be verified with a failing lint-staged case.                                                                                                                                                                        |
| B10     | Fixed locally                      | `docs:check` compares names, risk, roles, and AI approval metadata.                                                                                                                                                                      |
| B11     | Fixed locally                      | Guarded by B10 metadata checker.                                                                                                                                                                                                         |
| B12     | Partially fixed                    | Guarded DB integration package exists; staging execution still required.                                                                                                                                                                 |
| B13     | Unknown                            | Needs settings UI review.                                                                                                                                                                                                                |
| B14     | Fixed locally                      | Line-item route/component tests still needed.                                                                                                                                                                                            |
| B15     | Fixed locally                      | `runTradeAgent` records step failures and continues.                                                                                                                                                                                     |
| B16     | Fixed for webhook pipeline         | Pipeline reads actual body text and checks byte length before JSON parse.                                                                                                                                                                |
| B17     | Fixed locally                      | Needs middleware regression/manual verification.                                                                                                                                                                                         |
| B18     | Fixed locally                      | `POST /api/agent` uses `source: 'ai'`.                                                                                                                                                                                                   |
| B26-B32 | Fixed locally from issue #1 intake | Settings route action names, quotation line-item forwarding, numeric null handling, Prisma singleton, billing seat count, archive batching, and route/action parity check have local code fixes. Remote CI/staging proof still required. |

Additional blockers discovered after this plan was written are tracked in `docs/13_CHECKPOINTS.md`. B23-B25 are fixed locally. B26-B32 were issue #1 implementation gaps and are now fixed locally, but not production-verified.

## P0 — Critical Blocker Fix

### P0.B1 — Fix webhook AI role mismatch with budget.getStatus / ai.trackUsage

**Severity**: CRITICAL — blocks ALL webhook processing

**Root cause**: Webhook AI pipeline calls `budget.getStatus` and `ai.trackUsage` with context.role = `OPERATOR`. Both actions only allow `[OWNER, ADMIN]`.

**Fix options**:

- Option A: Change `allowedRoles` of `budget.getStatus` and `ai.trackUsage` to include `OPERATOR` (and SALES) — these are read-only and low-risk operations
- Option B: Create separate webhook-safe budget/usage wrappers
- Option C: Change webhook AI context role to `ADMIN` (BAD — security issue)

**Recommendation**: Option A (safest, minimal change)

**Files to edit**:

- `packages/crm-core/src/index.ts` — change `allowedRoles` of `budget.getStatus` to `DEFAULT_LOW_RISK_ROLES`, `ai.trackUsage` to `DEFAULT_LOW_RISK_ROLES`
- `docs/04_ACTION_REGISTRY.md` — update table rows for both actions
- `packages/database/prisma/seed.ts` — ensure permission keys assigned to OPERATOR/SALES roles

**Verification**:

- `pnpm typecheck && pnpm build && pnpm test`
- `pnpm docs:check`
- Webhook AI pipeline test with OPERATOR context → budget check passes

---

### P0.B2 — Add Zod `.parse()` to ALL 35 action handlers

**Severity**: CRITICAL — no input validation at handler level

**Root cause**: All 35 registered action handlers accept raw `input` without Zod `.parse()`. The exported Zod schemas are only used by API route callers.

**Fix pattern** (for EVERY action handler):

```typescript
// Before
handler: async (input: CreateLeadInput, context) => {
  const db = getDb(context);
  return db.lead.create({ data: { ...input, organizationId: context.organizationId! } });
},

// After
handler: async (input: CreateLeadInput, context) => {
  const parsed = createLeadInputSchema.parse(input);
  const db = getDb(context);
  return db.lead.create({ data: { ...parsed, organizationId: context.organizationId! } });
},
```

**Files to edit**:

- `packages/crm-core/src/index.ts` — 18 action handlers
- `packages/trade-core/src/index.ts` — 9 action handlers
- `packages/inbox-core/src/index.ts` — 1 action handler
- `packages/analytics-core/src/index.ts` — 4 action handlers

**Verification**:

- `pnpm typecheck && pnpm build && pnpm test`
- Each action's test passes with valid input
- Invalid input → stable validation failure (`INVALID_REQUEST_BODY` in current `safeParse()` wrappers)

---

### P0.B3 — Fix unsafe Deal migration (nullable → backfill → NOT NULL)

**Severity**: CRITICAL — breaks on existing production data

**Root cause**: Migration `20260522_deal_orgid` adds `Deal.organizationId` as `NOT NULL` without DEFAULT on an existing table.

**Fix**:

1. Create NEW migration that:
   a. ALTER `Deal.organizationId` to nullable (if it was NOT NULL)
   b. Backfill existing rows: set `organizationId` to first org ID or a placeholder
   c. Set NOT NULL constraint

OR document that `Deal` table is guaranteed empty (seed-only, no production data) and add inline comment.

**Recommended**: Create safe migration with backfill.

**Current implementation note**: The local migration file was edited to add nullable → backfill → NOT NULL. This is safe for unapplied local history, but unsafe if the old migration was already applied to any shared/staging/production database. Before production, verify the actual migration history in Supabase staging and create a forward-only corrective migration if needed.

```sql
-- Step 1: Make nullable
ALTER TABLE "Deal" ALTER COLUMN "organizationId" DROP NOT NULL;

-- Step 2: Backfill existing rows (replace 'default-org' with actual logic)
UPDATE "Deal" SET "organizationId" = (SELECT id FROM "Organization" LIMIT 1) WHERE "organizationId" IS NULL;

-- Step 3: Set NOT NULL
ALTER TABLE "Deal" ALTER COLUMN "organizationId" SET NOT NULL;
```

**Files to edit**:

- New migration SQL file
- `pnpm db:generate` to regenerate client

**Verification**:

- `pnpm db:generate && pnpm build`
- Migration applies to clean DB and existing data without error

---

### P0.B4 — Validate roleId in user.roleUpdate

**Severity**: CRITICAL — cross-tenant role escalation

**Root cause**: `user.roleUpdate` accepts any `roleId` without validation. A role from another org could be assigned.

**Fix**:

```typescript
handler: async (input, context) => {
  const parsed = userRoleUpdateSchema.parse(input);
  const db = getDb(context);

  // Validate role exists and is system role
  const role = await db.role.findUnique({ where: { id: parsed.roleId } });
  if (!role) throw new Error('ROLE_NOT_FOUND');
  if (!role.isSystem && role.organizationId !== context.organizationId) {
    throw new Error('INVALID_ROLE');
  }

  // Update user role
  const membership = await db.organizationMember.findFirst({
    where: { userId: parsed.userId, organizationId: context.organizationId },
  });
  if (!membership) throw new Error('USER_NOT_IN_ORGANIZATION');

  await db.organizationMember.update({
    where: { id: membership.id },
    data: { roleId: parsed.roleId },
  });

  return { success: true };
},
```

**Files to edit**:

- `packages/crm-core/src/index.ts` — `user.roleUpdate` handler
- `apps/web/lib/validate.ts` — `userRoleUpdateSchema` Zod schema

**Verification**:

- `pnpm typecheck && pnpm build && pnpm test`
- Test: valid system role → passes
- Test: cross-tenant role → `INVALID_ROLE`
- Test: non-existent role → `ROLE_NOT_FOUND`
- Test: user not in org → `USER_NOT_IN_ORGANIZATION`

---

## P1 — High Blocker Fix

### P1.B5 — Add missing Zod schemas to 3 API routes

**Severity**: HIGH — input validation gap

**Routes to fix**:

1. `POST /api/agent` — create agent execution schema
2. `PATCH /api/leads` — create lead update schema
3. `PATCH /api/introductions/[id]` — create introduction action schema

**Pattern**:

```typescript
import { z } from 'zod';

export const agentRequestSchema = z.object({
  message: z.string().min(1).max(10000),
  organizationId: z.string().optional(), // will be stripped by stripSessionManagedFields
}).strict();

export const updateLeadSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', ...]).optional(),
  name: z.string().max(256).optional(),
  // ... other updatable fields
}).strict();
```

**Files to edit**:

- `apps/web/lib/validate.ts` — add schemas
- `apps/web/app/api/agent/route.ts` — use schema
- `apps/web/app/api/leads/route.ts` — use schema
- `apps/web/app/api/introductions/[id]/route.ts` — use schema

---

### P1.B6 — Add structured blockReason to audit log for blocked actions

**Severity**: HIGH — MFA/role/org audit analysis

**Current implementation note**: Blocked action audit entries already write structured JSON in `result.reason`, but no dedicated `blockReason` field exists. Treat this as partial until either the schema adds a first-class field or the JSON shape is tested and documented as canonical.

**Fix**: In `packages/policy-core/src/index.ts`, modify `executeAction` to pass a structured `blockReason` when writing audit logs for blocked actions:

```typescript
// After org mismatch check:
await writeAuditLog(prisma, {
  actionName: action.name,
  riskLevel: action.riskLevel,
  context,
  input,
  result: { blocked: true, reason: 'ORGANIZATION_ACCESS_DENIED' },
  approved: false,
  blockReason: 'input_organization_mismatch',  // NEW structured field
});

// After role/AI check:
  result: { blocked: true, reason: decision.reason },
  approved: false,
  blockReason: decision.reason === 'ROLE_NOT_ALLOWED' ? 'role_denied' : 'ai_not_approved',
```

---

### P1.B7 — Fix webhook agent failure marking PROCESSED instead of FAILED

**Severity**: HIGH — silent failure

**Fix**: In `packages/webhook-core/src/pipeline.ts`, around lines 180-202:

```typescript
// When agent fails, mark as FAILED with error message
try {
  const agentResult = await runTradeAgent(context, input);
  await markWebhookProcessed(eventId, agentResult);
} catch (agentError) {
  await markWebhookFailed(eventId, {
    errorMessage:
      agentError instanceof Error
        ? agentError.message
        : "Agent execution failed",
    errorCode: "AGENT_EXECUTION_FAILED",
  });
  throw agentError; // or handle gracefully
}
```

---

### P1.B8 — Create CI pipeline (completed — `.github/workflows/ci.yml` exists)

**Severity**: HIGH — no automated PR checks

**Status**: DONE — file created. Verify by pushing to GitHub.

---

### P1.B9 — Fix pre-commit lint-staged gate

**Severity**: HIGH — formatting non-gating

**Fix**: In `.husky/pre-commit`, change:

```bash
npx lint-staged || echo "  (prettier check skipped)"
```

To:

```bash
npx lint-staged || exit 1
```

---

## P2 — Medium Blocker Fix

### P2.B10 — Upgrade docs:check to compare full metadata (risk/roles/approval)

**Severity**: MEDIUM

**Fix**: `scripts/check-docs.mjs` currently only checks action names. Upgrade to parse `riskLevel`, `allowedRoles`, and `requiresApprovalForAI` from both source code and doc table, then compare.

**Implementation sketch**:

```typescript
// Parse source: extract action metadata from registerAction() calls
const sourceActions = parseRegisterActionCalls(sourceFiles);
// Parse doc table: extract action metadata from markdown table
const docActions = parseActionTable(docContent);
// Compare each field:
for (const action of allActionNames) {
  assert(sourceActions[action].riskLevel === docActions[action].riskLevel);
  assert(
    sorted(sourceActions[action].allowedRoles) ===
      sorted(docActions[action].allowedRoles),
  );
  assert(
    sourceActions[action].requiresApprovalForAI ===
      docActions[action].requiresApprovalForAI,
  );
}
```

---

### P2.B11 — Fix action registry doc mismatches (7 actions)

**Severity**: MEDIUM

**Mismatches to fix** (all in `docs/04_ACTION_REGISTRY.md`):

| Action                   | Field                 | Current (doc)       | Should be (code)              |
| ------------------------ | --------------------- | ------------------- | ----------------------------- |
| `crm.updateCompany`      | allowedRoles          | OWNER, ADMIN, SALES | OWNER, ADMIN, SALES, OPERATOR |
| `crm.updateContact`      | allowedRoles          | OWNER, ADMIN, SALES | OWNER, ADMIN, SALES, OPERATOR |
| `crm.updateLeadStatus`   | allowedRoles          | OWNER, ADMIN, SALES | OWNER, ADMIN, SALES, OPERATOR |
| `user.invite`            | requiresApprovalForAI | No                  | Yes                           |
| `report.snapshotCreate`  | requiresApprovalForAI | No                  | Yes                           |
| `report.snapshotApprove` | requiresApprovalForAI | No                  | Yes                           |

---

### P2.B12 — Integration tests (T2.10)

**Severity**: MEDIUM

Create `packages/integration-tests/` with Docker testcontainers. Minimum 5 tests:

1. Create org + user → execute action → verify audit log
2. Cross-org access → blocked
3. MFA required action with aal1 → blocked, aal2 → passes
4. Migration smoke: deploy → verify schema
5. Webhook full flow: receive → process → verify inbox created

---

### P2.B13 — Settings UI null handling

**Severity**: MEDIUM

Fix `apps/web/app/settings/page.tsx` to handle null values for `avgDealValue`, `conversionRate`, `aiMonthlyBudget` gracefully.

---

### P2.B14 — Add `items` field to createQuotationSchema

**Severity**: MEDIUM

Add line items validation to `createQuotationSchema` in `apps/web/lib/validate.ts`.

---

### P2.B15 — Isolate step execution failure in ai-core

**Severity**: MEDIUM

In `runTradeAgent`, wrap each step in try/catch so one failure doesn't abort the entire plan:

```typescript
const results = [];
for (const step of plan.steps) {
  try {
    const result = await executeStep(step);
    results.push({ step, status: "EXECUTED", result });
  } catch (error) {
    results.push({ step, status: "FAILED", error: error.message });
  }
}
```

---

### P2.B16 — Read actual body bytes in checkPayloadSize

**Severity**: MEDIUM

Fix `checkPayloadSize` to read the actual request body instead of relying only on `Content-Length` header.

---

### P2.B17 — Preserve X-Request-Id in middleware

**Severity**: MEDIUM

Fix `apps/web/middleware.ts` to preserve `X-Request-Id` header when `NextResponse.redirect()` or `NextResponse.rewrite()` replaces response headers.

---

### P2.B18 — Fix agent route source context

**Severity**: MEDIUM

Fix `POST /api/agent` to pass `source: 'ai'` instead of `source: 'manual'` in the execution context for AI-triggered actions.

---

## P3 — Docs & Verification

After all P0-P2 blockers are fixed:

1. Update `docs/04_ACTION_REGISTRY.md` to match exact code state
2. Update `docs/06_SECURITY_AND_TENANCY.md` to reflect all fixes
3. Update `docs/09_TESTING_STRATEGY.md` with integration tests
4. Update `docs/10_DEPLOYMENT_RUNBOOK.md` with verified env/migration
5. Update `docs/13_CHECKPOINTS.md` — clear resolved blockers, update score
6. Run full verification suite:
   ```bash
   pnpm db:generate && pnpm typecheck && pnpm build && pnpm test && pnpm docs:check && pnpm lint && pnpm license:check && git diff --check
   ```
   Also run `pnpm routes:check`.

## P4 — Production Staging

After all blockers are fixed AND docs are verified:

1. Push to GitHub → verify CI pipeline is green
2. Enable branch protection on main branch:
   - Require all CI status checks to pass
   - Require PR review (1 approver minimum)
   - Do NOT allow bypassing
3. Verify staging Supabase:
   - All migrations applied
   - Seed data loaded
   - Auth users mapped
   - Webhook integrations configured
4. Deploy Vercel preview → full smoke tests
5. **Production requires explicit production-ops task approval**
