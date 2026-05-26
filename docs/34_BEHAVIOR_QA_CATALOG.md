# Behavior QA Catalog — Supplier Switch

**Date**: 2026-05-26
**Status**: Active
**Issue**: #81
**Purpose**: realistic human behavior scenarios for code-stage validation, before real buyer pilot.

## 1. Scenario Library

Each scenario has: buyer type, evidence quality, decision outcome, and survival question.

### Happy Path — Qualified Buyer

```txt
Buyer:          Importer, has decision authority, shared invoice and quote
Evidence:       CURRENT_SUPPLIER_INVOICE (high), ALTERNATIVE_QUOTE (high)
Report outcome: SWITCH — strong savings + sufficient evidence + manageable risk
Survival:       Does the chain complete without missing fields?
```

### Non-Decision-Maker

```txt
Buyer:          Employee, cannot approve, says "I need to ask my boss"
Evidence:       CURRENT_SUPPLIER_PRICE_LIST (medium)
Report outcome: WAIT — buyer cannot commit; report should flag decision authority gap
Survival:       Does the UI explain why WAIT and what to do next?
```

### Free-Advice Seeker

```txt
Buyer:          Asks for comparison, has no current supplier invoice, no quote
Evidence:       MARKET_BENCHMARK only (low)
Report outcome: WAIT — insufficient evidence for any recommendation
Survival:       Does the system accept partial data gracefully without error?
```

### Missing Invoice

```txt
Buyer:          Shared supplier name verbally but no invoice or price list
Evidence:       None attached (missing)
Report outcome: WAIT — cannot establish baseline without evidence
Survival:       Does the UI clearly show "missing proof" and what is required?
```

### Weak Screenshot Evidence

```txt
Buyer:          Sent a blurry screenshot of a chat message with a price
Evidence:       QUOTE_SCREENSHOT (low) — not verifiable
Report outcome: WAIT — weak evidence, risk score elevated
Survival:       Does the scoring system downgrade low-quality evidence?
```

### Strong Quote Evidence

```txt
Buyer:          Shared formal quotation PDF with all terms
Evidence:       ALTERNATIVE_QUOTE (high)
Report outcome: Depends on savings — if savings > 10%, SWITCH
Survival:       Does the system correctly use quote fields for scoring?
```

### Non-Comparable Product

```txt
Buyer:          Comparing HRC steel coil with galvanized sheet (different specs)
Evidence:       Both quotes valid but products are not equivalent
Report outcome: NEGOTIATE or WAIT — mismatch flagged in report
Survival:       Does the system or operator detect non-equivalent products?
```

### Cheap but Risky Supplier

```txt
Buyer:          Found supplier at 30% below market, but no quality cert, new company
Evidence:       ALTERNATIVE_QUOTE (high for price, low for quality proof)
Report outcome: NEGOTIATE — savings high but dependency risk elevated
Survival:       Are risk flags visible in the report?
```

### High Savings, Weak Proof

```txt
Buyer:          Claims 20% savings, but alternative quote is verbal only
Evidence:       Verbal claim (very low)
Report outcome: NEGOTIATE — cannot recommend switch without written quote
Survival:       Does the report show why savings are not actionable?
```

### Low Savings, High Trust

```txt
Buyer:          Current supplier is reliable but expensive; alternative is unknown
Evidence:       Strong current invoice, weak alternative quote
Report outcome: WAIT — savings insufficient to justify switching risk
Survival:       Is the recommendation explainable to a non-expert buyer?
```

### Buyer Requests More Proof

```txt
Buyer:          Saw the report, clicked "Request more proof" for quality cert
Decision:       REQUEST_MORE_PROOF
Survival:       Does requesting more proof correctly update the report state?
```

### Buyer Rejects Report

```txt
Buyer:          Not convinced, chooses to stay with current supplier
Decision:       REJECTED
Survival:       Does REJECTED prevent downstream billing/checkpoint actions?
```

### Buyer Disappears After Decision

```txt
Buyer:          Approved switch but never responded to follow-up for outcome record
Decision:       APPROVED (stale — no outcome recorded after 14 days)
Survival:       Does the system handle stale APPROVED state? Can an operator follow up?
```

### Buyer Selects Cheapest Without Reading Risk

```txt
Buyer:          Approved the cheapest alternative without reviewing risk flags
Decision:       APPROVED (ignored warnings)
Survival:       Are risks clearly displayed before approval? Is there a confirmation step?
```

### Duplicate Sourcing Run

```txt
Buyer:          Created two sourcing runs for the same product with different suppliers
Decision:       Runs should be mergeable or one should be cancelled
Survival:       Does the system detect duplicate runs or allow cancellation?
```

## 2. Fixture/Seed Scenarios

Each scenario maps to a seed-able JSON config that feeds into the seed generator.

| Scenario                | Evidence Quality | Expected Outcome | Risk Profile |
| ----------------------- | ---------------- | ---------------- | ------------ |
| qualified-buyer         | high             | SWITCH           | low          |
| non-decision-maker      | medium           | WAIT             | medium       |
| free-advice-seeker      | low              | WAIT             | low          |
| missing-invoice         | none             | WAIT             | high         |
| weak-screenshot         | low              | WAIT             | medium       |
| strong-quote            | high             | SWITCH           | low          |
| non-comparable-product  | medium           | NEGOTIATE        | high         |
| cheap-risky-supplier    | high/low         | NEGOTIATE        | high         |
| high-savings-weak-proof | low              | NEGOTIATE        | high         |
| low-savings-high-trust  | high/low         | WAIT             | low          |

## 3. Behavior E2E Cases

When real auth login flow exists, E2E should verify:

```txt
qualified buyer → SWITCH report visible, checkpoints created
weak evidence → WAIT report, missing proof listed
report rejection → REJECTED state, no billing checkpoint
```

## 4. Product Review Guide

For human review:

1. Open the pilot case on staging (SourcingRun: Steel Coil Procurement)
2. Read the SwitchDecisionReport — is the NEGOTIATE recommendation clear?
3. Check risk flags — are they visible?
4. Check missing proof — is it listed?
5. What would you do next as a buyer?
6. What would you do next as an operator?

## 5. Adding New Scenarios

After real pilot feedback, add new scenarios by:

1. Create a new entry in Section 1 with buyer behavior pattern
2. Add evidence quality and expected outcome
3. Add a seed configuration in the fixture generator
4. Add a survival question
5. Update this catalog
