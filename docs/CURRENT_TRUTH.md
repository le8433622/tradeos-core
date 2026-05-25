# CURRENT TRUTH — TradeOS

**Date**: 2026-05-25
**Purpose**: single source of truth for AI/code agents before doing any more work.

## Current GitHub State

- Open PRs: **none**.
- Latest `main` commit: `d246b68` (`fix: remove DIRECT_URL from requiredServerVars`).
- Latest `main` CI: pass — pre-commit & typecheck for both PR #34 and #35.
- Recently merged PRs (newest first):
  - `#35` — fix: remove `DIRECT_URL` from production env validation (false positive crash).
  - `#34` — fix: delete middleware entirely (Vercel Edge Runtime platform crash).
  - `#24` — incident recovery: restore middleware pattern, add anti-loop protocol, update runbook.
  - `#23` — docs: add `CURRENT_TRUTH`, checkpoint rewrite, `SUPER_AGENT_RULER`.
  - `#22` — AI procurement safety and blocked-action sync.
  - `#21` — MoneyOS evidence/billing/API errors/billing UI micro-task round.
- Open issues:
  - `#29` — P2: design plugin intake layer for social pain, supplier sources, quote parsing, and evidence.
- Closed/completed issues (newest first):
  - `#28` — ✅ **DONE**: Supplier Switch Intelligence spec at `docs/30_SUPPLIER_SWITCH_INTELLIGENCE.md`.
  - `#27` — ✅ **DONE**: Playwright E2E harness with 10 env-gated tests.
  - `#26` — ✅ **PASSED**: production smoke test verified 2026-05-25. `/api/health` returns 200.
  - `#10` — closed as not planned; replaced by `#26`.
  - `#12` — closed as not planned; replaced by `#27`.
  - `#4`, `#5`, `#6`, `#7`, `#11`, `#13`, `#14`, `#15`, `#16`, `#17`, `#18`, `#19`.

## Current Mode

The repo is in **spec-forward mode**. All P0 incident recovery issues are closed. Remaining open issue: `#29` (plugin intake spec).

Allowed now:

1. Write product/spec docs for `#29` without source-code implementation.
2. Authenticated E2E can be run locally (`E2E_RUN_ENABLED=true pnpm test:e2e`).
3. Unit/integration testing for registered actions.

Not allowed now:

1. Claim production 10/10 readiness (no authenticated session smoke in CI, no edge auth).
2. Add marketplace/CRM/ERP/social/product features outside the open issue `#29`.
3. Implement Supplier Switch Intelligence code before production gates clear.

## Production Availability Truth

Production health is **proven healthy at unauthenticated level**.

Observed evidence:

```txt
$ curl https://tradeos-core.vercel.app/api/health
{"ok":true,"service":"tradeos-core-web"}
HTTP 200

$ curl https://tradeos-core.vercel.app/
HTTP 307 (unauthenticated redirect — expected)
```

**Fixes applied:**

1. PR #34 — Deleted `middleware.ts` (Vercel Edge Runtime crashed on ANY middleware, even `NextResponse.next()` only).
2. PR #35 — Removed `DIRECT_URL` from env validation (optional Prisma var; absence was throwing at server init).

**Residual risks:**

- No middleware = no edge-level auth enforcement. Session refresh handled at page/API route level.
- Vercel Edge Runtime platform issue not reported to Vercel.
- No authenticated session smoke yet.

## Non-Negotiable Agent Rules

1. Live GitHub issue/PR state wins over stale docs.
2. Do **not** reopen or rework closed issues unless a failing test or fresh GitHub issue proves regression.
3. Do **not** treat missing or invalid env/auth/deployment access as a product-code bug.
4. Do **not** fake authenticated staging/production proof.
5. If Vercel/Supabase/env access is unavailable, record the blocker and stop.
6. Product expansion is frozen until production proof is either restored or intentionally separated into spec-only docs.

## Remaining Work Classification

### `#25` — Documentation synchronization task

This issue is complete only when:

1. `docs/CURRENT_TRUTH.md` reflects live GitHub state.
2. `docs/13_CHECKPOINTS.md` no longer contradicts live issue/PR state.
3. `docs/SUPER_AGENT_RULER.md` no longer says `#10/#12` are the only open issues.
4. No product/source files are changed.

### `#26` — ✅ CLOSED (2026-05-25)

Production unauthenticated smoke verified. `/api/health` returns 200. Home returns 307 (expected). See production availability evidence above.

Remaining authenticated smoke deferred to `#27` (E2E harness).

### `#27` — E2E harness/proof task

This may require Playwright/test infrastructure plus test auth credentials. Missing env must produce clear skip/fail behavior, not fake proof.

### `#28` — ✅ CLOSED (2026-05-25)

Spec completed at `docs/30_SUPPLIER_SWITCH_INTELLIGENCE.md`. No source-code changes.

### `#29` — Product/spec task

Spec-only plugin intake architecture. No source-code integrations.

## Definition Of Done For Current Loop

The current loop is done when:

1. GitHub state has been checked live.
2. `docs/CURRENT_TRUTH.md`, `docs/13_CHECKPOINTS.md`, and `docs/SUPER_AGENT_RULER.md` match that state.
3. Production availability is honestly marked with unauthenticated proof (verified) and residual risks (no edge auth, no E2E).
4. No unrelated source-code changes are introduced.
5. `pnpm docs:check` passes.
