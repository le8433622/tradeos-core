# Supplier Switch Execution Protocol

**Date**: 2026-05-26
**Status**: Active execution protocol for issues `#40`–`#45`
**Purpose**: force TradeOS into the smallest complete buyer-led economic case loop before any marketplace, generic CRM/ERP, or external social/API integration work.

## 0. Reality Lock Priority

This protocol does not authorize new feature work while production survival gates are open. The active order is declared in `docs/CURRENT_TRUTH.md` and currently prioritizes:

```txt
#65 -> #69 -> #70 -> #53 -> #66 -> #60/status-confirmation
```

Supplier Switch remains the product direction, but production safety and behavior QA gates must be green before any further expansion, plugin/toolcall implementation, new package creation, or schema-heavy feature work.

**Kill switch policy** (`docs/34_KILL_SWITCH_POLICY.md`) is active: no automation path in this chain may be enabled in production without its OFF switch first being present and tested.

If a requested task violates the active order or attempts expansion outside the current gate, stop and report:

```txt
BLOCKED_SCOPE_EXPANSION
```

## 1. Non-Negotiable Product Chain

Every implementation must preserve this exact order:

```txt
Current Spend
→ PurchaseBaseline
→ Alternative Proof
→ SwitchDecisionReport
→ Buyer Approval
→ Checkpoint Billing
→ OutcomeLearning
```

Do not skip a stage. Do not start later stages until the prior stage is merged, tested, and documented.

## 2. Absolute Scope Locks

### Forbidden Until `#40`–`#45` Are Complete

1. Marketplace mechanics: public supplier listings, bidding, matching, public profiles, cross-tenant supplier discovery.
2. Generic CRM/ERP: broad contact management, inventory, purchasing, accounting, order management, generalized workflows.
3. Social/API integrations: Zernio, Zalo, Facebook, Instagram, TikTok, LinkedIn, Reddit, Telegram, Alibaba, AliExpress, 1688, Shopee, Lazada, payment gateways.
4. Automated scraping, quote harvesting, or external supplier crawling.
5. AI auto-purchase, AI auto-switch, AI auto-negotiation, or any external commitment without buyer approval.
6. New package creation before Supplier Switch paid pilot proof.
7. Package-boundary refactor before end-to-end behavior is proven by E2E or pilot evidence.
8. Schema-changing expansion while production safety gates `#53` and `#66` are unfinished.

### Allowed Now

1. Manual Current Spend capture — UI exists.
2. Manual PurchaseBaseline creation — action + API + UI exist.
3. Manual Alternative Proof and QuoteProof capture — action + API exist.
4. Deterministic SwitchDecisionReport generation — generator exists.
5. Buyer approval or request-more-proof state — portal exists.
6. Existing WorkCheckpoint/Payment mapping where sufficient — checkpoints exist.
7. OutcomeLearning skeleton tied to the originating case — skeleton exists.
8. Paid pilot preparation — define scope, select tenant, execute pilot.
9. Survival lane documentation and CI enforcement (#65→#66).

## 3. Issue Sequence Gates

| Gate | Issue | Output                           | Hard Dependency | Status                                                |
| ---- | ----- | -------------------------------- | --------------- | ----------------------------------------------------- |
| 1    | `#40` | PurchaseBaseline MVP             | None            | **MERGED** — PR #47. Schema, action, API, UI in main. |
| 2    | `#41` | SupplierAlternative + QuoteProof | `#40`           | **MERGED** — PR #50.                                  |
| 3    | `#42` | SwitchDecisionReport             | `#40`, `#41`    | **MERGED** — PR #52.                                  |
| 4    | `#43` | Buyer Approval portal/action     | `#42`           | **MERGED** — PR #54.                                  |
| 5    | `#44` | Checkpoint Billing mapping       | `#43`           | **MERGED** — PR #55 (combined with #45).              |
| 6    | `#45` | OutcomeLearning skeleton         | `#43`, `#44`    | **MERGED** — PR #55 (combined with #44).              |

Blocked until survival lane (#65→#66) merged + schema migration applied + health gate green.

## 4. Gate 1 — `#40` PurchaseBaseline (MERGED — PR #47)

### What Was Built (2026-05-26)

1. **Prisma schema**: `PurchaseBaseline` model with tenant isolation, linked to `SourcingRun`, supporting fields for supplier, product, pricing, terms, risk flags.
2. **New `EvidenceType` values**: `CURRENT_SUPPLIER_INVOICE`, `CURRENT_SUPPLIER_PRICE_LIST`, `ALTERNATIVE_QUOTE`, `ALTERNATIVE_PROFILE`, `MARKET_BENCHMARK`, `SWITCH_DECISION_REPORT`, `OUTCOME_EVIDENCE`, `NEGOTIATION_LOG`.
3. **Registered action**: `sourcing.createPurchaseBaseline` (LOW risk, OWNER/ADMIN roles, no AI approval needed, Zod validated, org-scoped via `validateRecordBelongsToOrg`).
4. **API route**: `POST /api/sourcing-runs/[id]/purchase-baseline` with Zod validation, permission check (`sourcing.manage`), session injection.
5. **UI**: Inline form on sourcing run detail page — manual entry for supplier name, product, quantity, unit price, currency, frequency, payment/delivery/lead time terms. Display section shows existing baselines.
6. **Typecheck**: Both `sourcing-core` and `web` pass clean.

### Not Built (Deferred for Phase B)

- EconomicCase model (wrap SourcingRun).
- AI/parser for invoice/quote extraction.
- Market benchmark or leakage scoring.
- Automated alternative discovery.

### Required Design

1. Manual input first.
2. Existing `EvidenceItem` references first.
3. Tenant-scoped by `organizationId` on every query.
4. Mutations through registered action only.
5. Zod parse at action handler entry.
6. Audit log through `executeAction`.
7. Tests for create, validation, evidence ownership, and cross-tenant rejection.

### Stop Conditions

1. If implementation requires external supplier data, stop.
2. If implementation requires social/API integration, stop.
3. If evidence cannot be tenant-validated, stop.
4. If the data model would become generic ERP purchasing, narrow it back to current spend baseline.

## 5. Gate 2 — `#41` Alternative Proof

### Build Only This

```txt
Alternative supplier
Comparable product/spec
Normalized unit price
Total estimated cost
Currency
MOQ
Lead time
Payment term
Warranty/return policy
Shipping/landed-cost notes
Evidence IDs
Risk flags
```

### Required Design

1. Manual operator input first.
2. Map to existing `SupplierCandidate`, `SupplierQuote`, and `EvidenceItem` if sufficient.
3. QuoteProof means evidence-backed quote record, not an external parser.
4. No Alibaba/Shopee/AliExpress/API integration.
5. Tests must prove alternatives cannot attach to another tenant baseline/case.

## 6. Gate 3 — `#42` SwitchDecisionReport

### Build Only This

Report output must answer:

```txt
Should the buyer switch, negotiate, or wait?
```

### Deterministic MVP Scoring

Use explicit factors only:

1. Monthly savings.
2. Annual savings.
3. Evidence strength.
4. Payment risk.
5. Lead time risk.
6. Supplier dependency risk.
7. Missing proof.

### Recommendation Rules

```txt
SWITCH     = strong savings + sufficient evidence + manageable risk
NEGOTIATE  = current supplier overpriced but alternative proof/risk is incomplete
WAIT       = missing proof, weak evidence, or savings not compelling
```

No advanced ML. No hallucinated supplier claims. No AI-generated unsupported facts.

## 7. Gate 4 — `#43` Buyer Approval

Buyer approval is the boundary between internal analysis and business action.

### Allowed Buyer Decisions

1. Approve recommendation.
2. Request more proof.
3. Reject/wait.

### Required Rules

1. Access must be authenticated or tokenized and tenant-safe.
2. Buyer decision must become evidence or an approval record.
3. No public report URLs without token protection.
4. No payment checkout in this gate.

## 8. Gate 5 — `#44` Checkpoint Billing

Checkpoint billing can start only after buyer approval semantics exist.

### Supplier Switch Checkpoints

1. Baseline Scan delivered.
2. Alternative Supplier Shortlist delivered.
3. Quote Proof / Quote Comparison delivered.
4. Switch Decision Report delivered.
5. Negotiation Pack delivered.
6. Outcome Follow-up delivered.

### Mandatory Billing Rule

```txt
No evidence → no billing approval.
No buyer approval/acceptance condition → no billing approval.
```

Use existing `WorkCheckpoint` and `Payment` primitives first. Do not add payment provider integration in this gate.

## 9. Gate 6 — `#45` OutcomeLearning

OutcomeLearning closes the loop.

### Required Outcome Fields

```txt
buyer action taken: switch / negotiate / wait / reject
actual supplier chosen
actual unit price
actual delivery time
quality result
dispute occurred
reorder occurred
buyer satisfaction/status note
score correction / learning note
```

### Required Linkage

Outcome must link back to the originating baseline/report/case. If that link is unavailable, implementation must stop and add the missing model relation first.

## 10. Required Verification Per Gate

For every implementation PR in `#40`–`#45`:

```txt
pnpm typecheck
pnpm test
pnpm docs:check
pnpm routes:check   # if route/action mapping changes
pnpm build          # if app/source behavior changes
```

If any command is skipped, the PR must state the exact reason and verification gap.

## 11. Required PR Body

Every PR must include:

```markdown
## Issue

## Chain Gate

## What This Builds

## What This Explicitly Does Not Build

## Tenant Isolation Proof

## Evidence Proof

## Approval/Billing Boundary

## Tests Run

## Skipped Checks

## Residual Risks
```

## 12. Completion Definition

The chain is complete only when all six are true:

1. Current spend baseline exists and is evidence-backed.
2. Alternatives are normalized and evidence-backed.
3. Switch decision is deterministic and explainable.
4. Buyer approval/request-more-proof/reject path is persisted.
5. Checkpoint billing requires evidence and buyer acceptance semantics.
6. OutcomeLearning records whether the recommendation was correct.

Until then, TradeOS must not open marketplace, generic CRM/ERP, or social/API integration work.
