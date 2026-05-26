# SUPER AGENT RULER — TradeOS

**Purpose**: prevent AI/code agents from entering infinite loops, reworking closed issues, faking proof, or adding unrelated product code when the real blocker is state/proof/environment.

This file is mandatory reading before any AI/code agent edits this repository.

## 0. Prime Directive

TradeOS is not a generic SaaS, CRM, ERP, marketplace, chatbot, or dashboard app.

TradeOS is an AI case execution operating system for economic and supply-chain decisions:

```txt
Human pain
→ Economic Case
→ Tool/action execution
→ Evidence
→ Risk-adjusted decision
→ Human approval
→ Checkpoint billing
→ Outcome learning
```

The active implementation chain is stricter:

```txt
Current Spend
→ PurchaseBaseline
→ Alternative Proof
→ SwitchDecisionReport
→ Buyer Approval
→ Checkpoint Billing
→ OutcomeLearning
```

Any code/task that does not strengthen this chain in order is lower priority or noise.

## 1. Source-of-Truth Hierarchy

Agents must resolve truth in this order:

1. Live GitHub issue/PR state.
2. `docs/CURRENT_TRUTH.md`.
3. `docs/13_CHECKPOINTS.md`.
4. Task-specific issue body.
5. Older planning docs.

If older docs conflict with live GitHub state, live GitHub state wins.

## 1.1 Reality Lock Active-Work Limit

Agents must not create their own execution order. The active order is declared in `docs/CURRENT_TRUTH.md` and must be followed unless a human explicitly changes it.

Current survival sequence:

```txt
#65 -> #69 -> #70 -> #53 -> #66 -> #60/status-confirmation
```

Hard limits:

1. Only 1 active P0 implementation PR at a time unless explicitly approved.
2. Only 1 schema-changing PR may be open at a time.
3. No product feature issue creation while `#53` is open.
4. No plugin/toolcall product implementation before `#70`, `#53`, and `#66` are complete and pilot proof exists.
5. No new package creation until Supplier Switch paid pilot proof exists.
6. No package-boundary refactor until Supplier Switch end-to-end behavior is proven by E2E or pilot evidence.
7. No schema migration apply until the production health and migration runbook gate in `#66` is satisfied.

If a requested task violates these limits, stop and report:

```txt
BLOCKED_SCOPE_EXPANSION
```

## 2. Pre-Flight Checklist

Before editing files, the agent must answer:

```txt
A. What issue/PR am I solving?
B. Is the issue currently open?
C. Is this a code task, proof task, ops task, documentation task, or environment-blocked task?
D. What is the exact acceptance criterion?
E. What is the stop condition?
F. Which files are allowed to change?
G. Which files must not change?
H. What is the declared active issue order?
I. Does this PR create schema, package, plugin/toolcall, or product-feature expansion?
J. What is my change class? (DOCS_ONLY / TEST_ONLY / SCHEMA_CHANGE / RUNTIME_CHANGE / WORKER_CHANGE / AUTH_POLICY_CHANGE / APPROVAL_BILLING_CHANGE / AI_TOOLCALL_CHANGE / PRODUCTION_OPERATION)

If the agent cannot identify the change class, it must stop and classify before editing.
```

If the agent cannot answer these (including the change class), it must stop and ask for the missing state instead of coding.

## 3. Task Classification

### Code task

A code task changes product/test/source files and has runnable acceptance checks.

Examples:

```txt
Add Playwright E2E skeleton.
Add validation test.
Fix route error classification.
```

### Proof task

A proof task records evidence that something works.

Examples:

```txt
Authenticated Vercel staging smoke.
Migration status proof.
CI final gate proof.
```

Proof tasks may require no source-code change.

### Ops task

An ops task requires credentials, deployed environment, staging database, auth user, or external service access.

Examples:

```txt
Login to Vercel staging.
Run Supabase authenticated smoke.
Verify production env ALLOW_DEMO_AUTH=false.
```

### Documentation synchronization task

A doc sync task updates stale docs to match live truth. It must not change product code.

### Environment-blocked task

A task is environment-blocked when the code is not the blocker and required secrets/access are missing.

In that case, the correct output is a blocker record, not more code.

## 4. Absolute Stop Conditions

The agent must stop immediately when any condition is true:

1. The issue is already closed and no new failing test proves regression.
2. The task requires staging/auth/payment credentials that are unavailable.
3. The task requires authenticated proof but no auth session/test user exists.
4. The agent is about to modify unrelated product code for a proof/ops task.
5. The same test/command has failed twice for the same reason.
6. The agent is trying to satisfy stale documentation instead of live GitHub state.
7. The proposed change does not connect to Current Spend → PurchaseBaseline → Alternative Proof → SwitchDecisionReport → Buyer Approval → Checkpoint Billing → OutcomeLearning.
8. The proposed change starts marketplace, generic CRM/ERP, or social/API integration work before `#40`–`#45` are complete.
9. The agent is about to run `prisma db push`, `prisma migrate dev`, `prisma migrate reset`, or `prisma db seed` against a shared Supabase database.
10. The agent is about to run E2E tests with online writes without an isolated DB or `E2E_RUN_ID + organizationId` scope.
11. The agent is about to delete or update records without `organizationId` scope.
12. The agent is about to run deploy commands manually without a documented rollback path.
13. The agent is about to open a second active P0 implementation PR.
14. The agent is about to open a second active schema-changing PR.
15. The agent is about to create a new package before Supplier Switch paid pilot proof.
16. The agent is about to implement plugin/toolcall product behavior before the survival gates and pilot proof.
17. The agent is about to enable an automation path that has no kill switch documented.
18. The agent is about to enable a kill switch in production without documented manual flow verification.
19. The agent is about to implement AI-driven action execution without runtime schema validation of AI output.
20. The agent is about to create economic side effects (billing, approval, commitment) without human approval and evidence.
21. Kill switch policy (`docs/34_KILL_SWITCH_POLICY.md`) has not been read before enabling automation.

When stopped, write a blocker note:

```markdown
## Blocked

Task:
Reason:
Missing input/access:
What was verified:
What was not verified:
Next human/operator action:
```

## 5. Anti-Loop Rules

1. Never re-open completed work because an old doc says it is open.
2. Never keep coding when the remaining blocker is credentials or staging access.
3. Never replace real proof with a simulated proof unless the issue explicitly asks for a simulation.
4. Never solve an ops proof task by adding unrelated UI/backend features.
5. Never expand scope from closed issues or Supplier Switch work into marketplace, generic CRM/ERP, or social/API integrations.
6. Never treat missing environment variables as product defects unless the issue is specifically env validation.
7. Never change more than the minimal required files for the classified task.
8. Never enable automation before the corresponding manual flow is proven — if manual flow does not work, auto flow is invalid.
9. Never enable a kill switch in production without reading `docs/34_KILL_SWITCH_POLICY.md` and confirming the pre-enable verification checklist.

## 6. Remaining Current Work

As of 2026-05-26, the active lane is **production survival before more product expansion**:

```txt
#65 — P0: Reality Lock active-work limit
#69 — P0: production change-class gate and PR template enforcement
#70 — P0: AI/toolcall kill switch and manual-first enforcement
#53 — P0: conditional E2E + schema-change + tenant invariant CI gates
#66 — P0: production health gate + migration apply runbook
#60 — Closed; status-confirmation only unless a regression issue exists
```

Therefore:

- Product feature expansion is frozen while `#65`, `#69`, `#70`, `#53`, and `#66` are open.
- `#60` is not to be reworked while closed unless a new failing test or issue proves regression.
- No marketplace, generic CRM/ERP, plugin/toolcall product implementation, social/API integrations, or new packages before survival gates and paid pilot proof.
- `docs/32_SUPPLIER_SWITCH_EXECUTION_PROTOCOL.md` remains the Supplier Switch product-chain protocol, but production safety gates take priority until this lane is green.
- `docs/33_CLOUD_DB_SAFETY_PROTOCOL.md` remains mandatory reading for any schema/data change.
- `docs/34_KILL_SWITCH_POLICY.md` is mandatory reading before enabling any automation kill switch.

## 7. Rule For `#26` — ✅ CLOSED

`#26` has been completed. Production health verified at unauthenticated level:

```txt
$ curl https://tradeos-core.vercel.app/api/health
{"ok":true,"service":"tradeos-core-web"}
HTTP 200
```

Authenticated smoke evidence is now part of `#27` (E2E harness). Do not reopen `#26` or redo production smoke unless a new issue documents a regression.

## 8. Rule For `#27` — ✅ Skeleton Done (2026-05-25)

`#27` E2E harness skeleton is complete. See `docs/09_TESTING_STRATEGY.md#e2e-tests`.

What was built:

```txt
apps/web/playwright.config.ts — Playwright config (chromium, webServer, CI retries)
apps/web/e2e/env.ts — env validation (E2E_RUN_ENABLED, E2E_BASE_URL, etc.)
apps/web/e2e/smoke.spec.ts — 4 protected-page smoke tests
apps/web/e2e/procurement.spec.ts — 3 procurement skeleton tests
apps/web/e2e/permissions.spec.ts — 3 permission skeleton tests
apps/web/e2e/global-setup.ts — setup logging
scripts/test:e2e in package.json
```

All tests skip clearly when `E2E_RUN_ENABLED !== true`. No production database writes. No fake proof.

Remaining for full closure:

```txt
- Add CI job for E2E (optional, after production gates clear)
```

## 8.1 Rule For `#28` — ✅ Spec Done (2026-05-25)

Supplier Switch Intelligence spec completed at `docs/30_SUPPLIER_SWITCH_INTELLIGENCE.md`. No source-code changes. No schema migration. No product implementation.

## 8.2 Rule For `#29` — ✅ Spec Done (2026-05-26)

Plugin Intake Layer spec completed at `docs/31_PLUGIN_INTAKE_LAYER.md`. No source-code integrations. No scraping automation. No marketplace pivot.

## 8.3 Rule For `#40`–`#45` — Active Chain

The chain is sequential and mandatory:

```txt
#40 Current Spend/PurchaseBaseline
→ #41 Alternative Proof/QuoteProof
→ #42 SwitchDecisionReport
→ #43 Buyer Approval
→ #44 Checkpoint Billing
→ #45 OutcomeLearning
```

Rules:

1. `#40` is the only valid first implementation task.
2. `#41` cannot start until `#40` is merged with tests and docs.
3. `#42` cannot start until `#40/#41` provide stored baseline, alternatives, quote proof, and evidence.
4. `#43` cannot start until `#42` produces deterministic recommendations.
5. `#44` cannot start until `#43` has buyer approval/request-more-proof semantics.
6. `#45` cannot start until the case/report/billing relation exists.
7. No social/API/source plugin integrations until the full chain is complete.

## 9. File Change Boundaries

### For doc sync tasks

Allowed:

```txt
docs/CURRENT_TRUTH.md
docs/13_CHECKPOINTS.md
docs/SUPER_AGENT_RULER.md
docs/32_SUPPLIER_SWITCH_EXECUTION_PROTOCOL.md
docs/33_CLOUD_DB_SAFETY_PROTOCOL.md
docs/34_KILL_SWITCH_POLICY.md
agent.md if it conflicts with the ruler
```

Disallowed:

```txt
apps/**
packages/**
prisma/**
```

### For `#27` E2E harness

Allowed if necessary:

```txt
playwright.config.*
tests/e2e/**
apps/web/e2e/**
package.json / pnpm-lock.yaml only if adding Playwright script/dependency is required
```

Disallowed unless explicitly justified:

```txt
business logic packages
production DB schema
unrelated UI
```

## 10. Verification Rules

Every PR must declare and satisfy its change-class gates from `.github/pull_request_template.md`:

| Class                     | Required gates                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `DOCS_ONLY`               | `pnpm docs:check` only                                                                   |
| `SCHEMA_CHANGE`           | `db:generate`, `typecheck`, `test`, `build`, migration review, no `db push`, health gate |
| `AUTH_POLICY_CHANGE`      | tenant invariant tests, cross-tenant deny tests, `routes:check`, no unscoped query       |
| `WORKER_CHANGE`           | timeout/retry/DLQ config proof, queue class impact doc, no unbounded loop                |
| `APPROVAL_BILLING_CHANGE` | idempotency, stale recovery, audit event, evidence-before-billing                        |
| `AI_TOOLCALL_CHANGE`      | kill switch, budget cap, max retry/toolcall limit, human takeover boundary               |
| `PRODUCTION_OPERATION`    | rollback path, pre/post verification steps                                               |

Every PR body must state:

```txt
Changed files
Task classification
Change class
Active issue order
Commands run per class gate
Commands skipped and why
Issue status checked
Stop condition not triggered or recorded
```

If no verification can run because access is missing, say so directly.

PRs without a declared change class are invalid and must not be merged.

Any PR that introduces or changes an automation path must also reference the kill switch policy (`docs/34_KILL_SWITCH_POLICY.md`) and confirm the corresponding kill switch exists.

## 11. Product Ruler

Every future feature must pass all 10 gates:

1. Solves a real human/economic pain.
2. Has a clear payer or value recipient.
3. Creates or strengthens an Economic Case.
4. Uses real tool/action execution.
5. Produces evidence.
6. Produces a clearer decision.
7. Preserves human approval at risk/money boundaries.
8. Connects to checkpoint billing or value proof.
9. Feeds outcome learning.
10. Makes the user/buyer lead the game, not the platform.

Failing features are deferred.

## 12. Correct Agent Output Format

For every task, the agent should output:

```markdown
## Task Classification

## Change Class

## Live State Checked

## Plan

## Changes Made

## Verification

## Blockers / Stop Conditions

## Next Action
```

This prevents vague “done” claims and exposes environment blockers early.
