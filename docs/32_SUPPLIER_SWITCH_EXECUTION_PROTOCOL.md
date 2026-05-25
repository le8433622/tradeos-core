# Supplier Switch Execution Protocol

**Date**: 2026-05-26
**Status**: Active execution protocol for issues `#40`–`#45`
**Purpose**: force TradeOS into the smallest complete buyer-led economic case loop before any marketplace, generic CRM/ERP, or external social/API integration work.

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

### Allowed Now

1. Manual Current Spend capture.
2. Manual PurchaseBaseline creation.
3. Manual Alternative Proof and QuoteProof capture.
4. Deterministic SwitchDecisionReport generation.
5. Buyer approval or request-more-proof state.
6. Existing WorkCheckpoint/Payment mapping where sufficient.
7. OutcomeLearning skeleton tied to the originating case.

## 3. Issue Sequence Gates

| Gate | Issue | Output                           | Hard Dependency | Must Prove                                                                     |
| ---- | ----- | -------------------------------- | --------------- | ------------------------------------------------------------------------------ |
| 1    | `#40` | PurchaseBaseline MVP             | None            | Current spend exists, evidence linked, tenant isolation tested                 |
| 2    | `#41` | SupplierAlternative + QuoteProof | `#40`           | Alternatives are comparable, evidence linked, cross-tenant blocked             |
| 3    | `#42` | SwitchDecisionReport             | `#40`, `#41`    | Deterministic `SWITCH` / `NEGOTIATE` / `WAIT`, missing proof lowers confidence |
| 4    | `#43` | Buyer Approval portal/action     | `#42`           | Buyer can approve, reject/wait, or request more proof safely                   |
| 5    | `#44` | Checkpoint Billing mapping       | `#43`           | Evidence-before-billing, buyer approval condition, refund/failure semantics    |
| 6    | `#45` | OutcomeLearning skeleton         | `#43`, `#44`    | Outcome links to baseline/report/case and records actual decision quality      |

## 4. Gate 1 — `#40` PurchaseBaseline

### Build Only This

```txt
Current supplier
Current product/service
Current unit price
Currency
Recurring quantity
Reorder frequency
Monthly spend
Payment term
Lead time
Warranty/return notes
Evidence IDs
Leakage hypothesis fields
```

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
