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

Any code/task that does not strengthen this chain is lower priority or noise.

## 1. Source-of-Truth Hierarchy

Agents must resolve truth in this order:

1. Live GitHub issue/PR state.
2. `docs/CURRENT_TRUTH.md`.
3. `docs/13_CHECKPOINTS.md`.
4. Task-specific issue body.
5. Older planning docs.

If older docs conflict with live GitHub state, live GitHub state wins.

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
```

If the agent cannot answer these, it must stop and ask for the missing state instead of coding.

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
7. The proposed change does not connect to case → evidence → decision → approval → billing → outcome learning.

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
5. Never expand scope from closed issues (`#10`, `#12`, `#26`) into new marketplace, CRM, ERP, or social features.
6. Never treat missing environment variables as product defects unless the issue is specifically env validation.
7. Never change more than the minimal required files for the classified task.

## 6. Remaining Current Work

As of 2026-05-25 after PR `#34` (delete middleware) and PR `#35` (env validation fix), the open issues are:

```txt
#25 — Rebuild current truth after incident recovery
#27 — Add authenticated E2E harness with environment-blocked stop behavior
#28 — Define Supplier Switch Intelligence product spec without coding features
#29 — Design plugin intake layer for social pain, supplier sources, quote parsing, and evidence
```

`#26` is closed (production unauthenticated smoke verified — `/api/health` returns 200).

Therefore:

- Product feature expansion is frozen.
- Closed issues must not be reworked.
- `#25` must synchronize docs/truth only.
- `#27` may add E2E harness only with explicit env-blocked behavior.
- `#28/#29` are spec-only. They must not add source-code implementation.
- `#26` is done. Do not reopen it. Authenticated smoke deferred to `#27`.

## 7. Rule For `#26` — ✅ CLOSED

`#26` has been completed. Production health verified at unauthenticated level:

```txt
$ curl https://tradeos-core.vercel.app/api/health
{"ok":true,"service":"tradeos-core-web"}
HTTP 200
```

Authenticated smoke evidence is now part of `#27` (E2E harness). Do not reopen `#26` or redo production smoke unless a new issue documents a regression.

## 8. Rule For `#27`

`#27` is an authenticated E2E proof/harness task.

Allowed work:

```txt
- Playwright config
- auth storage-state fixture
- env validation for E2E
- clearly skipped tests when env missing
- procurement/billing happy path test skeleton
- permission denied test skeleton
```

Disallowed work:

```txt
- large product refactor
- fake auth bypass unless explicitly named test-only and gated
- production database writes
- tests that silently pass without proving anything
```

Stop if:

```txt
E2E env vars, test user, test database, or auth bootstrap are unavailable.
```

## 8.1 Rule For `#28/#29`

`#28` and `#29` are product/spec tasks only.

Allowed work:

```txt
- docs/30_SUPPLIER_SWITCH_INTELLIGENCE.md
- docs/31_PLUGIN_INTAKE_LAYER.md
- checkpoint/current-truth updates that classify the docs correctly
```

Disallowed work:

```txt
- production source-code implementation
- schema migrations
- integration code
- marketplace/social automation features
```

Stop if:

```txt
The work starts adding product/source code before production proof gates are resolved or intentionally separated.
```

## 9. File Change Boundaries

### For doc sync tasks

Allowed:

```txt
docs/CURRENT_TRUTH.md
docs/13_CHECKPOINTS.md
docs/SUPER_AGENT_RULER.md
agent.md if it conflicts with the ruler
```

Disallowed:

```txt
apps/**
packages/**
prisma/**
```

### For `#12` E2E harness

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

Every PR must state:

```txt
Changed files
Task classification
Commands run
Commands skipped and why
Issue status checked
Stop condition not triggered or recorded
```

If no verification can run because access is missing, say so directly.

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

## Live State Checked

## Plan

## Changes Made

## Verification

## Blockers / Stop Conditions

## Next Action
```

This prevents vague “done” claims and exposes environment blockers early.
