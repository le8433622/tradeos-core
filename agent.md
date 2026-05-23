# TradeOS Agent Operating Manual — Production 10/10 Edition

This is the detailed execution contract for product agents and coding agents working on TradeOS. `AGENTS.md` contains the short repository charter. `RULES.md` is the hard-rule file. This file defines the operating workflow.

---

## 0. Core Principles

### 0.1 Mission

Build TradeOS as a production-grade AI operating system for international trade teams. The product must make trade relationships measurable, auditable, and executable before it becomes a marketplace.

### 0.2 Quality Objective

The agent's job is NOT to make code compile once. The agent's job is to deliver the SMALLEST CORRECT production-safe change with NO known HIGH or CRITICAL defects left in the touched area.

**The expected standard is first-pass quality:**

1. Understand the root cause before editing.
2. Change the owning boundary, not the easiest file.
3. Preserve tenant isolation, permission gates, MFA/approval behavior, and auditability.
4. Add or document regression verification that would have caught the bug.
5. Be honest about residual risk.

If an agent cannot meet this standard in the current turn, it MUST say exactly what is missing and why.

### 0.3 Doc Integrity Principle

**Code and docs must match exactly.** Every behavioral change requires a corresponding doc update in the same turn. The `pnpm docs:check` CI gate MUST pass before merge. If the gate would fail due to this change, fix the gate or update the doc.

### 0.4 No Overclaim Contract

Never claim "production-ready" while known HIGH or CRITICAL issues remain. Never claim "tests pass" without running them. Never claim "verified" without running the exact verification command. Every final response must separate: what changed, what was verified (exact commands), what was not verified (and why), and residual risks.

---

## 1. Work Modes

### 1.1 Analysis Mode

Use when understanding the codebase, debugging, investigating, or reviewing. Do NOT change application behavior.

Rules:

- Read files, run grep/search, examine logs
- Read RULES.md, agent.md, checkpoints before forming conclusions
- Output structured analysis: what was found, severity, owning boundary, suggested fix
- Do NOT edit code in Analysis Mode unless explicitly instructed

### 1.2 Documentation Mode

Use when creating plans, contracts, roadmaps, ADRs, runbooks, or updating checkpoints. Do NOT change application behavior.

Rules:

- Read the actual source code and verify doc claims against reality
- `pnpm docs:check` must pass after changes
- Do NOT overclaim — match docs to code, not code to docs
- Verify with: `pnpm docs:check && review diff`

### 1.3 Implementation Mode

Use when changing code. This is the default mode for bug fixes and features. MUST use the Anti-Rework Execution Loop (Section 2).

Rules:

1. Read the owning package first (entire files)
2. Search for existing registered actions, API routes, schema models
3. Search for sibling bugs before editing
4. Make the SMALLEST correct change
5. Run ALL required verification commands
6. Update docs if behavior/security/posture changed
7. Update checkpoint if status changed
8. Run final self-review against RULES.md Section 15

### 1.4 Review Mode

Use when reviewing another agent's changes, PRs, or code. Do NOT edit.

Rules:

- Check every file in diff against RULES.md rules
- Check for HIGH/CRITICAL violations
- Check doc-code parity
- Check verification commands were real (not claimed)
- Output: pass with caveats, or fail with specific violations

### 1.5 Production Ops Mode

Use ONLY when the task explicitly says to operate GitHub, Supabase, Vercel, or Cloudflare.

Rules:

- Require command-by-command intent from user
- For each command: state exact command, expected effect, rollback path, verification
- Run verification after each command
- Record results in checkpoint
- Never perform production ops without explicit user approval per operation

---

## 2. Anti-Rework Execution Loop

Every implementation task MUST follow this loop. Do NOT skip steps because the bug looks obvious.

### Step 1: Prepare Context

Before ANY code change:

1. Read `RULES.md` — complete file, every time
2. Read `AGENTS.md`
3. Read `agent.md`
4. Read `docs/13_CHECKPOINTS.md` — current status, known blockers
5. Identify the task from the task plan
6. Read the task acceptance criteria

If the task is part of the production-readiness plan, also read:

- `docs/28_PRODUCTION_10_10_TASK_PLAN.md`

If the task is security/auth/tenant-related, also read:

- `docs/06_SECURITY_AND_TENANCY.md`

If the task touches action registrations, also read:

- `docs/04_ACTION_REGISTRY.md`

If the task is a deployment or CI change, also read:

- `docs/10_DEPLOYMENT_RUNBOOK.md`

### Step 2: Define The Failure

Write down internally (or output if asked):

1. **What is broken?** — exact error message, unexpected behavior, or missing functionality
2. **What is the expected behavior?** — specific, testable, not vague
3. **Which boundary owns it?** — UI, API route, package action, policy-core, auth, database, worker, webhook, docs
4. **Which previous rule or review finding does this relate to?** — search RULES.md for related rules
5. **What verification would prove it's fixed?** — specific test assertion or curl command

### Step 3: Search For Sibling Bugs

Before editing, search for the SAME anti-pattern in nearby code:

| If you find                                    | Also search                                      |
| ---------------------------------------------- | ------------------------------------------------ |
| Missing `mfaLevel` in one `executeAction` call | ALL `executeAction` calls                        |
| Bad tenant check in one update action          | ALL sibling update actions in that package       |
| Bad boolean parsing in one API route           | ALL PATCH routes                                 |
| Unregistered action error                      | ALL action imports and registration side effects |
| Missing Zod `.parse()` in one handler          | ALL registered action handlers                   |
| Swallowed promise in one component             | ALL useEffect/async patterns in that package     |

**Search first, fix second.** Finding 5 sibling bugs before fixing 1 saves 4 future rework passes.

### Step 4: Choose The Smallest Correct Boundary

Fix the bug where it BELONGS:

| Issue                    | Fix at                                                                         |
| ------------------------ | ------------------------------------------------------------------------------ |
| Missing input validation | API route handler (Zod `.parse()`)                                             |
| Missing permission gate  | `policy-core` -> `executeAction` or route's `withApiPermission`                |
| Wrong tenant isolation   | Package action handler (check `organizationId` on records)                     |
| Wrong MFA enforcement    | `policy-core` MFA check or action's risk level or `ALWAYS_REQUIRE_MFA_ACTIONS` |
| Missing audit log        | `executeAction` wrapper or explicit `auditLog.create`                          |
| Auth resolution bug      | `packages/auth` session resolvers                                              |
| UI showing wrong data    | Component fetch logic (not server-side security)                               |

**Do NOT fix a policy gap in the UI. Do NOT fix a tenant gap in the middleware. Fix at the owning boundary.**

### Step 5: Implement With Production Constraints

The implementation MUST preserve ALL of:

1. **Tenant isolation** — every query scoped by `organizationId`, every cross-relation validated
2. **Permission or role gating** — `withApiPermission` or `withApiSession` on routes, `allowedRoles` on actions
3. **Audit logging** — through `executeAction` or explicit `auditLog.create`
4. **MFA or approval gates** — for HIGH/CRITICAL risks, `mfaLevel` forwarded, `ALWAYS_REQUIRE_MFA_ACTIONS` honored
5. **Safe input parsing** — Zod `.parse()` for action input AND API route body
6. **Predictable error codes** — registered in `ERROR_MESSAGES`, classified in `classifyApiError`
7. **Rollback or disable path** — env flags, policy gates, or documented rollback steps for risky behavior

### Step 6: Verify The Exact Failure

Verification MUST match the change type:

| Change type              | Minimum verification                                                               |
| ------------------------ | ---------------------------------------------------------------------------------- |
| Auth parsing change      | Test representative token/cookie shapes (valid, invalid, expired, malformed)       |
| Permission change        | Test allowed actor (passes) AND denied actor (blocked with correct error)          |
| Tenant isolation fix     | Test same-org (passes) AND different-org (blocked with ORGANIZATION_ACCESS_DENIED) |
| Settings parsing change  | Test `false`, `'false'`, `0`, invalid enum, empty string, missing field            |
| Registered action change | Test audit log written, role gates enforced, cross-tenant rejected                 |
| API route change         | Test valid input (200), invalid input (400/ZodError), unauthorized (401/403)       |
| Webhook change           | Test unsigned (rejected), signed valid (processed), duplicate (idempotent)         |
| MFA change               | Test `aal1` (blocked with MFA_REQUIRED) and `aal2` (passes)                        |

**Build alone is NOT verification.** Running `pnpm typecheck && pnpm build && pnpm test` is the minimum. For behavioral changes, manual smoke test or curl commands are required unless unit tests cover the scenario.

### Step 7: Run ALL Required Checks

Every task MUST run:

```bash
pnpm typecheck
pnpm build
pnpm test
pnpm docs:check
pnpm lint
pnpm license:check
git diff --check
```

If a check fails, fix it before proceeding. If a check is skipped, document EXACTLY why ("Docker not available" is valid; "trust me it works" is not).

### Step 8: Update Docs

If the change affects:

- Actions → update `docs/04_ACTION_REGISTRY.md`
- Security/tenant/auth → update `docs/06_SECURITY_AND_TENANCY.md`
- Testing → update `docs/09_TESTING_STRATEGY.md`
- Deployment/env → update `docs/10_DEPLOYMENT_RUNBOOK.md`
- Task plan / status → update `docs/13_CHECKPOINTS.md` and relevant task plan doc

### Step 9: Final Self-Review

Before responding, inspect the changed path against RULES.md Section 15 (Build & Verification Checklist). If any answer is "no", fix it or explicitly mark the task incomplete.

### Step 10: Final Response

Structure for non-trivial work:

1. **What changed** — list of files and summary of each change
2. **What was verified** — exact commands run, their results
3. **What was NOT verified** — skipped checks and reasons
4. **Residual risks** — any remaining HIGH/CRITICAL issues, or "none"

Forbidden final response patterns:

- Saying "all fixed" when tests were not run
- Saying "production-ready" while known HIGH or CRITICAL issues remain
- Hiding skipped checks
- Summarizing only success while ignoring discovered risks
- Using passive voice to hide who made the error

---

## 3. Before Coding Checklist

Before every implementation task, the agent MUST verify these 10 items:

```
[ ] Read RULES.md (complete, not skimming)
[ ] Read agent.md
[ ] Read docs/13_CHECKPOINTS.md
[ ] Read the owning package or route (entire file)
[ ] Read existing tests for the owning package
[ ] Searched for existing registered action, API route, schema model, UI page
[ ] Searched for sibling bugs (same anti-pattern in nearby code)
[ ] Identified the owning boundary (not the easiest file)
[ ] Identified files allowed to edit
[ ] Identified required verification commands
```

If ANY item is unchecked, the agent MUST do it before editing. Silent skipping is a rule violation.

---

## 4. During Coding Rules

1. Keep the change SMALL and DIRECT — one task = ~1–5 files changed
2. Keep domain logic in PACKAGES, not pages
3. Keep API routes THIN: session → validation → action call → response
4. Keep UI pages tenant-scoped and role-aware
5. Prefer REGISTERED ACTIONS for mutations
6. NEVER let AI call Prisma directly (CRITICAL)
7. NEVER hardcode `demo-org` outside local/demo-only code (CRITICAL)
8. Preserve unrelated worktree changes (check `git status`)
9. Add comments ONLY when they explain non-obvious behavior
10. Every `executeAction` call MUST pass `mfaLevel`, `organizationId`, `role`, `source`

---

## 5. Verification Command Reference

### TypeScript & Build

| Command          | When              | Expected                             |
| ---------------- | ----------------- | ------------------------------------ |
| `pnpm typecheck` | Every change      | 13/13 packages, 0 errors, 0 warnings |
| `pnpm build`     | Every code change | 53/53 pages, 0 errors                |
| `pnpm lint`      | Every code change | 0 new warnings                       |

### Database

| Command            | When                       | Expected           |
| ------------------ | -------------------------- | ------------------ |
| `pnpm db:generate` | After Prisma schema change | Client regenerated |
| `pnpm db:migrate`  | After migration creation   | Migrations applied |

### Tests

| Command                                      | Expected              | Packages           |
| -------------------------------------------- | --------------------- | ------------------ |
| `pnpm test`                                  | ALL pass (256+ tests) | All 10 packages    |
| `pnpm --filter @tradeos/policy-core test`    | 29+ pass              | Policy engine      |
| `pnpm --filter @tradeos/auth test`           | 23+ pass              | Auth resolvers     |
| `pnpm --filter @tradeos/webhook-core test`   | 33+ pass              | Webhook pipeline   |
| `pnpm --filter @tradeos/approval-core test`  | 21+ pass              | Approval lifecycle |
| `pnpm --filter @tradeos/ai-core test`        | 58+ pass              | AI agent pipeline  |
| `pnpm --filter @tradeos/analytics-core test` | 27+ pass              | Analytics metrics  |
| `pnpm --filter @tradeos/trade-core test`     | 16+ pass              | Trade actions      |
| `pnpm --filter @tradeos/crm-core test`       | 21+ pass              | CRM actions        |
| `pnpm --filter @tradeos/inbox-core test`     | 7+ pass               | Inbox ingestion    |
| `pnpm --filter @tradeos/job-core test`       | 21+ pass              | Job queue          |

### CI/Docs

| Command                               | When            | Expected                        |
| ------------------------------------- | --------------- | ------------------------------- |
| `pnpm docs:check`                     | Every change    | Action names match source ↔ doc |
| `pnpm license:check`                  | Every change    | No blocked licenses             |
| `git diff --check`                    | Every change    | No whitespace errors            |
| `pnpm --filter @tradeos/ai-core eval` | ai-core changes | Accuracy ≥70%, FPM ≤10%         |

---

## 6. Required Reading Order By Change Type

| Change type         | Read before editing                                                                  |
| ------------------- | ------------------------------------------------------------------------------------ |
| Any change          | `RULES.md`, `agent.md`, `AGENTS.md`, `docs/13_CHECKPOINTS.md`                        |
| Action registration | + `docs/04_ACTION_REGISTRY.md`, owning package, `packages/policy-core/src/index.ts`  |
| API route           | + owning route file, `apps/web/lib/validate.ts`, `apps/web/lib/api-errors.ts`        |
| Auth/Security       | + `docs/06_SECURITY_AND_TENANCY.md`, `packages/auth/src/*`                           |
| Database schema     | + `docs/03_DATABASE_CONTRACT.md`, `prisma/schema.prisma`, existing migrations        |
| Webhook             | + `docs/06_SECURITY_AND_TENANCY.md` (webhook section), `packages/webhook-core/src/*` |
| UI page             | + owning page component, `apps/web/lib/page-session.ts`                              |
| Deployment/CI       | + `docs/10_DEPLOYMENT_RUNBOOK.md`, `package.json` scripts                            |
| AI/Agent            | + `docs/05_AI_AGENT_CONTRACT.md`, `packages/ai-core/src/*`                           |

---

## 7. Production Definition Of Done

A task is DONE only when ALL applicable items are true:

1. Root cause is fixed, not merely hidden or patched
2. Sibling anti-patterns were searched and either fixed or documented
3. Every tenant-scoped query is scoped by `organizationId` or explicit cross-tenant authorization
4. Every mutation uses a registered action unless it is a documented infrastructure boundary
5. Every mutation has an audit path
6. Every risky mutation has MFA or approval behavior
7. Permission checks happen before mutation (preflight for multi-field)
8. Multi-field mutations preflight ALL inputs and permissions before the first write
9. Inputs are parsed explicitly via Zod `.parse()` — no blind `Boolean(value)` or truthy numeric
10. Error codes are stable, user-safe, and registered in `ERROR_MESSAGES` with EN + VI
11. `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm docs:check` all pass
12. Docs/checkpoints were updated when behavior, security posture, deployment, or operations changed
13. The pre-commit hook would pass
14. The CI pipeline would pass (if `.github/workflows/ci.yml` exists)
15. Residual risks are honestly stated — no HIGH/CRITICAL issues are hidden

If ANY applicable item is false, the task is NOT done.

---

## 8. Stop And Ask Triggers

Ask ONE clear question instead of guessing when the decision affects:

- **Database shape with production data** — nullable columns, backfills, migration order
- **Authentication or tenant isolation** — session resolution, org membership, cross-org access
- **AI permissions or approval gates** — whether AI can execute a new action
- **Billing or monetization** — plan changes, usage tracking, limits
- **Marketplace scope** — opt-in model, cross-tenant data sharing
- **Public webhook security** — signature verification, idempotency, rate limiting
- **Production migration or deployment** — sequencing, rollback, verification
- **Destructive data changes** — deletes, anonymization, bulk operations
- **Secret or env var changes** — values, which environments, rotation

---

## 9. Final Response Contract

Every non-trivial final response MUST follow this exact structure:

```
## Summary
- Files changed: <list>
- Behavior changed: <one-line summary>
- Docs updated: <list>

## Verification
- pnpm typecheck: pass (13/13 packages)
- pnpm build: pass (53/53 pages)
- pnpm test: pass (XXX tests, all suites)
- pnpm docs:check: pass
- pnpm lint: pass (0 new warnings)
- pnpm license:check: pass
- Manual verification: <command or curl> → <observed result>

## Not Verified
- <command 1>: <reason> — <verification gap>
- <command 2>: <reason> — <verification gap>

## Residual Risks
- <list any HIGH/CRITICAL issues or "none">
```

---

## 10. Agent Plan Contract

```typescript
type AgentPlan = {
  intent: string;
  confidence: number;
  summary: string;
  extractedFields: Record<string, unknown>;
  missingFields: string[];
  steps: {
    action: string;
    input: Record<string, unknown>;
    reason: string;
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  }[];
  requiresHumanReview: boolean;
};
```

### Safe AI Actions

Direct execution allowed:

- `crm.createLead`
- `crm.createFollowUpTask`
- `crm.createCompany`
- `crm.createContact`
- `trade.draftQuotation`
- `trade.suggestPartner`
- `trade.createProduct`
- `trade.updateProduct`
- `inbox.ingestMessage`
- `notification.draft`

### Human Approval Required For AI

- `trade.sendQuotation`
- `trade.proposeIntroduction`
- `trade.approveIntroduction`
- `notification.sendBulk`
- `user.invite`
- `user.roleUpdate`
- `privacy.anonymizePii`
- `privacy.legalHold`
- `privacy.export`
- `billing.planUpdate`
- `billing.export`
- `settings.security`
- `organization.settings.introductions`
- `report.snapshotCreate`
- `report.snapshotApprove`

### AI Reasoning Required Checkpoints

1. Must never create work outside `organizationId`
2. Must preserve original message in conversation history
3. Must write audit through registered action execution
4. Must convert HIGH/CRITICAL-risk steps into approval requests (not execute them directly)
5. Must not import `@prisma/client` or `@tradeos/database` (CRITICAL)
6. Must not call `executeAction` with source `'manual'` for AI-triggered actions (must use `'ai'`)
