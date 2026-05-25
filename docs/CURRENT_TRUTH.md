# CURRENT TRUTH — TradeOS

**Date**: 2026-05-26
**Purpose**: single source of truth for AI/code agents before doing any more work.

## Current GitHub State

- Open PRs: **none**.
- Latest `main` commit: `4875f65` (`docs: add Plugin Intake Layer spec`).
- Latest local verification: pre-commit hooks passed on recent doc/spec PRs; latest CI must be checked live before merge-sensitive work.
- Recently merged PRs (newest first):
  - `#39` — docs: add Plugin Intake Layer spec.
  - `#38` — docs: add Supplier Switch Intelligence spec.
  - `#37` — feat: add Playwright E2E harness with env-gated tests.
  - `#36` — docs: sync truth after production fix.
  - `#35` — fix: remove `DIRECT_URL` from production env validation (false positive crash).
  - `#34` — fix: delete middleware entirely (Vercel Edge Runtime platform crash).
  - `#24` — incident recovery: restore middleware pattern, add anti-loop protocol, update runbook.
  - `#23` — docs: add `CURRENT_TRUTH`, checkpoint rewrite, `SUPER_AGENT_RULER`.
  - `#22` — AI procurement safety and blocked-action sync.
  - `#21` — MoneyOS evidence/billing/API errors/billing UI micro-task round.
- Open issues:
  - `#40` — P1: Implement PurchaseBaseline MVP for Supplier Switch Intelligence.
  - `#41` — P1: Implement SupplierAlternative and QuoteProof normalization MVP.
  - `#42` — P1: Implement SwitchDecisionReport generator MVP.
  - `#43` — P2: Add buyer-facing Switch Report portal MVP.
  - `#44` — P2: Map Supplier Switch checkpoints to billing and paid proof.
  - `#45` — P2: Add OutcomeLearning skeleton for Supplier Switch cases.
- Closed/completed issues (newest first):
  - `#29` — ✅ **DONE**: Plugin Intake Layer spec at `docs/31_PLUGIN_INTAKE_LAYER.md`.
  - `#28` — ✅ **DONE**: Supplier Switch Intelligence spec at `docs/30_SUPPLIER_SWITCH_INTELLIGENCE.md`.
  - `#27` — ✅ **DONE**: Playwright E2E harness with 10 env-gated tests.
  - `#26` — ✅ **PASSED**: production smoke test verified 2026-05-25. `/api/health` returns 200.
  - `#25` — ✅ **DONE**: docs synced to live GitHub state.
  - `#10` — closed as not planned; replaced by `#26`.
  - `#12` — closed as not planned; replaced by `#27`.
  - `#4`, `#5`, `#6`, `#7`, `#11`, `#13`, `#14`, `#15`, `#16`, `#17`, `#18`, `#19`.

## Current Mode

The repo is in **Supplier Switch execution mode**. The only permitted product path is the buyer-led economic case chain:

```txt
Current Spend
→ PurchaseBaseline
→ Alternative Proof
→ SwitchDecisionReport
→ Buyer Approval
→ Checkpoint Billing
→ OutcomeLearning
```

This chain is sequential. Do not skip ahead.

Allowed now:

1. Start with `#40` only: Current Spend/PurchaseBaseline from manual input and existing evidence.
2. Proceed to `#41` only after `#40` is merged, tested, and documented.
3. Run authenticated E2E locally when needed (`E2E_RUN_ENABLED=true pnpm --filter @tradeos/web test:e2e`).
4. Use registered actions, tenant isolation, evidence records, approval boundaries, and checkpoint docs for every step.

Not allowed now:

1. Claim production 10/10 readiness (no authenticated session smoke in CI, no edge auth).
2. Open marketplace, supplier bidding, public listings, public supplier profiles, or cross-tenant matching.
3. Build generic CRM/ERP functionality unrelated to the Supplier Switch chain.
4. Integrate social/API/source plugins before the core chain `#40`→`#45` is complete.
5. Implement Plugin Intake Layer integrations before the buyer-led proof chain exists.

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
6. Product expansion is frozen outside `#40`–`#45`.

## Work Classification

### `#25` — ✅ CLOSED (2026-05-25)

Docs synced to live GitHub state after incident recovery.

### `#26` — ✅ CLOSED (2026-05-25)

Production unauthenticated smoke verified. `/api/health` returns 200. Home returns 307 (expected). See production availability evidence above.

Remaining authenticated smoke deferred to `#27` (E2E harness).

### `#27` — ✅ CLOSED (2026-05-25)

Playwright E2E harness created with env-gated skip behavior.

### `#28` — ✅ CLOSED (2026-05-25)

Spec completed at `docs/30_SUPPLIER_SWITCH_INTELLIGENCE.md`. No source-code changes.

### `#29` — ✅ CLOSED (2026-05-26)

Spec completed at `docs/31_PLUGIN_INTAKE_LAYER.md`. No source-code integrations.

### `#40` — FIRST ACTIVE IMPLEMENTATION GATE

Build Current Spend/PurchaseBaseline only. Manual input first. Existing `EvidenceItem` links only. No marketplace, no social/API integration, no quote scraping.

### `#41` — SECOND GATE

Build Alternative Proof only after `#40` is complete. Use or map to existing `SupplierCandidate`, `SupplierQuote`, and `EvidenceItem`. Manual input first.

### `#42` — THIRD GATE

Build deterministic `SwitchDecisionReport` only after baseline and alternatives exist. Report must output `SWITCH`, `NEGOTIATE`, or `WAIT` with evidence and missing-proof logic.

### `#43` — FOURTH GATE

Build buyer approval/review only after report generation exists. Access must be tokenized or permission-safe and must not expose cross-tenant data.

### `#44` — FIFTH GATE

Map delivered proof to checkpoint billing only after buyer approval/report delivery path exists. Evidence-before-billing is mandatory.

### `#45` — SIXTH GATE

Add OutcomeLearning only after buyer approval and checkpoint billing semantics exist. Outcome must link back to baseline/report/case.

## Definition Of Done For Current Loop

The current loop is done when:

1. GitHub state has been checked live.
2. `docs/CURRENT_TRUTH.md`, `docs/13_CHECKPOINTS.md`, and `docs/SUPER_AGENT_RULER.md` match that state.
3. Open issues `#40`–`#45` are listed with correct sequence and stop conditions.
4. Docs explicitly block marketplace, generic CRM/ERP, and social/API integrations before the proof chain is complete.
5. `docs/32_SUPPLIER_SWITCH_EXECUTION_PROTOCOL.md` is the execution protocol for the next implementation loop.
