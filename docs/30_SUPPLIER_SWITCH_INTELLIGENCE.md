# Supplier Switch Intelligence — Product Spec

**Date**: 2026-05-25
**Status**: Spec-only — no source-code implementation
**Issue**: #28

## 1. Strategic Premise

TradeOS is an AI case execution OS for economic/supply-chain decisions. Supplier Switch Intelligence is the first wedge: a focused product that helps buyers answer one question:

> Am I buying from the right supplier, or should I switch, negotiate, or wait?

This is not a marketplace, not a generic CRM, not an ERP module. It is a **decision-support case engine** that makes supplier relationships measurable, auditable, and switchable.

### Core chain

```txt
Buyer pain (overpaying, locked in, no alternatives)
→ Purchase Baseline (what you buy, at what price, from whom)
→ Leakage/risk detection
→ Alternative discovery
→ Quote normalization
→ Switch decision report
→ Human approval or negotiation
→ Checkpoint billing
→ Outcome learning
```

## 2. Target User

| Attribute         | Description                                                    |
| ----------------- | -------------------------------------------------------------- |
| Primary user      | Buyer, SME operator, procurement generalist                    |
| Organization size | 5–500 employees, no dedicated procurement team                 |
| Buying pattern    | Recurring supplies (raw materials, packaging, components, MRO) |
| Current tools     | Email, spreadsheets, WeChat/Zalo, paper invoices               |
| Pain level        | High — cannot compare, cannot switch, cannot prove overpayment |
| Channel           | Trade association, B2B network, direct                         |

### Persona: Linh

Linh runs a packaging company in Ho Chi Minh City. She buys kraft paper from three suppliers. She suspects she is overpaying but cannot prove it. She has no time to manually collect and compare quotes. She wants a tool that:

1. Ingests her current supplier invoices/price lists
2. Finds alternative suppliers
3. Normalizes quotes for apples-to-apples comparison
4. Recommends: switch, negotiate, or wait
5. Tracks savings over time

## 3. Case Flow

### Phase 0: Onboarding / Purchase Baseline

```txt
User action: Upload current supplier info (invoice, price list, screenshot, link)
System: Creates PurchaseBaseline from extracted data
System: Links baseline to a SourcingRun (existing object)
Checkpoint: PAID_SOURCING_REQUEST (billable)
```

### Phase 1: Leakage & Risk Detection

```txt
System: Computes current effective price per unit
System: Benchmarks against market / historical data
System: Flags risks (single-supplier dependency, price volatility, quality issues)
System: Generates leakage report
Checkpoint: SUPPLIER_SHORTLIST (billable)
```

### Phase 2: Alternative Discovery

```txt
System: Searches known supplier database, trade directories, public sources
User action: Add discovered suppliers manually
System: Enriches supplier profiles (reliability score, risk flags)
Each supplier: Stored as SupplierCandidate with source metadata
Checkpoint: QUOTE_COLLECTION (billable)
```

### Phase 3: Quote Normalization

```txt
User action: Upload/forward quotes (email, PDF, screenshot, link)
System: Extracts line items, quantities, unit prices, terms
System: Normalizes to standard units (per kg, per ton, per piece)
System: Adjusts for shipping, lead time, payment terms
Checkpoint: QUOTE_COMPARISON (billable)
```

### Phase 4: Comparison & Decision

```txt
System: Compares all quotes (price, risk, term-adjusted total cost)
System: Generates SwitchDecisionReport:
  - Current supplier: effective cost + risk
  - Alternatives: cost + risk + savings potential
  - Recommendation: switch / negotiate / wait / gather more
  - Evidence: linked quote proofs
User: Reviews, approves, or requests more data
Checkpoint: BUYER_DECISION_REPORT (billable)
```

### Phase 5: Action

```txt
User: Approves next action (switch to X, negotiate with Y, monitor Z)
System: Executes action through registered action
System: Creates follow-up tasks (contact supplier, request sample, etc.)
Checkpoint: NEGOTIATION_RUN (billable, optional)
```

### Phase 6: Outcome Learning

```txt
System: Tracks actual savings vs predicted savings
System: Records switching cost / effort
System: Feeds outcome data back into baseline model
System: Improves benchmark accuracy over time
```

## 4. Core Objects

### 4.1 EconomicCase (NEW)

The overarching container for a supplier switch intelligence case. Wraps a SourcingRun with purchase-context.

```prisma
model EconomicCase {
  id              String   @id @default(cuid())
  organizationId  String
  sourcingRunId   String   // links to existing SourcingRun
  title           String
  status          EconomicCaseStatus @default(ACTIVE)

  // Purchase context
  currentSupplierId  String?    // SupplierId of current/main supplier
  productCategory    String?    // e.g. "Kraft paper", "Steel coil"
  annualSpend        Decimal?   // estimated annual spend on this product
  currency           String?
  savingsTarget      Decimal?   // user-defined target savings
  savingsAchieved    Decimal?   // cumulative tracked savings

  // Outcome
  outcomeStatus  OutcomeStatus @default(PENDING)
  switched       Boolean?      @default(false)
  switchedToId   String?       // new SupplierCandidate id
  savingsActual  Decimal?
  switchingCost  Decimal?
  outcomeNotes   String?

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  sourcingRun SourcingRun @relation(fields: [sourcingRunId], references: [id])
}
```

### 4.2 PurchaseBaseline (NEW)

A snapshot of what the buyer currently buys and at what cost. Created from uploaded invoice/quote/price list.

```prisma
model PurchaseBaseline {
  id              String   @id @default(cuid())
  organizationId  String
  sourcingRunId   String

  supplierName       String
  supplierContact    Json?    // contact info, email, phone
  sourceType         String   // "INVOICE" | "PRICE_LIST" | "MANUAL"
  sourceEvidenceId   String?  // link to original EvidenceItem

  // Baseline items — could be separate model if multi-item
  productDescription String
  quantity           Decimal?
  unit               String?
  unitPrice          Decimal?
  currency           String?
  frequency          String?  // per month, per quarter
  annualEquivalent   Decimal?

  // Terms
  paymentTerms   String?
  deliveryTerms  String?
  leadTime       String?
  minOrderQty    String?

  // Flags
  riskFlags    Json?    // computed risk flags
  leakageScore Int?     // 0-100, how much over market
  marketPrice  Decimal? // estimated market benchmark price

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

### 4.3 SupplierAlternative (NEW)

Extends SupplierCandidate with switch-specific context.

```prisma
model SupplierAlternative {
  id                 String   @id @default(cuid())
  economicCaseId     String
  supplierCandidateId String  // links to existing SupplierCandidate

  // Switch analysis
  estimatedSavings    Decimal?
  savingsConfidence   Int?     // 0-100
  switchingCost       Decimal? // estimated cost to switch
  switchingRisk       String?  // "LOW" | "MEDIUM" | "HIGH"
  totalCostComparison Json?    // normalized cost breakdown

  // Status
  status    String   @default("DISCOVERED") // DISCOVERED | QUOTED | EVALUATED | SELECTED | REJECTED
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 4.4 SwitchDecisionReport (NEW)

The artifact produced by the comparison phase: the decision output.

```prisma
model SwitchDecisionReport {
  id              String   @id @default(cuid())
  economicCaseId  String

  recommendation  String   // "SWITCH" | "NEGOTIATE" | "WAIT" | "GATHER_MORE_DATA"
  confidence      Int?     // 0-100
  summary         String
  risks           Json?    // array of risk descriptions
  savingsEstimate Decimal?
  currency        String?
  actionPlan      Json?    // ordered list of next actions

  // Link to existing BuyerDecisionReport
  generatedFromReportId String?

  createdAt DateTime @default(now())
}
```

### 4.5 OutcomeLearning (NEW)

Tracks actual outcomes after a switch/negotiate/wait decision.

```prisma
model OutcomeLearning {
  id              String   @id @default(cuid())
  economicCaseId  String

  decisionType    String   // "SWITCH" | "NEGOTIATE" | "WAIT"
  actualSavings   Decimal?
  switchingCost   Decimal?
  savingsAccuracy Decimal? // predicted vs actual ratio
  leadTimeDelta   Int?     // actual lead time change in days
  qualityDelta    String?  // "IMPROVED" | "SAME" | "WORSENED"

  // Feedback
  userFeedback    String?  // free-text user feedback
  wouldRecommend  Boolean? // would user recommend the decision

  createdAt DateTime @default(now())
}
```

## 5. Required Evidence Types

Supplier Switch Intelligence requires these evidence types beyond existing ones:

| Evidence Type                 | Source                  | Purpose                         |
| ----------------------------- | ----------------------- | ------------------------------- |
| `CURRENT_SUPPLIER_INVOICE`    | User upload             | Establish PurchaseBaseline      |
| `CURRENT_SUPPLIER_PRICE_LIST` | User upload             | Baseline pricing                |
| `ALTERNATIVE_QUOTE`           | Supplier email/PDF      | Quote from alternative supplier |
| `ALTERNATIVE_PROFILE`         | Web search / user input | Supplier discovery evidence     |
| `MARKET_BENCHMARK`            | External data           | Market price data point         |
| `SWITCH_DECISION_REPORT`      | System-generated        | Auditable decision record       |
| `OUTCOME_EVIDENCE`            | User upload             | Proof of actual savings/cost    |
| `NEGOTIATION_LOG`             | User input / system     | Record of negotiation steps     |

These can be accommodated by the existing `EvidenceItem` model using the `evidenceType` field (which is an enum — would need migration to add new values).

## 6. Human Approval Boundaries

| Action                                | Risk     | AI auto?         | Approval needed | Notes                 |
| ------------------------------------- | -------- | ---------------- | --------------- | --------------------- |
| Create PurchaseBaseline               | LOW      | Yes              | No              | From uploaded doc     |
| Detect leakage/risk                   | LOW      | Yes              | No              | Computed analysis     |
| Discover alternatives                 | MEDIUM   | Yes              | No              | Search, no commitment |
| Normalize quotes                      | LOW      | Yes              | No              | Computational         |
| Generate SwitchDecisionReport         | MEDIUM   | Yes, but flagged | No execution    | Read-only report      |
| **Execute switch (contact supplier)** | **HIGH** | **No**           | **Yes (OWNER)** | Real business action  |
| **Negotiate with current supplier**   | **HIGH** | **No**           | **Yes (OWNER)** | Changes relationship  |
| Approve checkpoint billing            | HIGH     | No               | Yes (OWNER)     | Existing pattern      |
| Outcome recording                     | LOW      | Yes              | No              | User feedback         |

The pattern matches existing TradeOS conventions: LOW/MEDIUM actions are AI-executable after review; HIGH/CRITICAL require human approval.

## 7. Monetization / Checkpoint Model

Reuses the existing `WorkCheckpoint` + `CheckpointType` billing lifecycle:

| Checkpoint            | Billable?      | Evidence gate                        | Price point (estimated) |
| --------------------- | -------------- | ------------------------------------ | ----------------------- |
| PAID_SOURCING_REQUEST | Yes            | Baseline created                     | $5                      |
| SUPPLIER_SHORTLIST    | Yes            | At least 3 candidates                | $10                     |
| QUOTE_COLLECTION      | Yes            | At least 2 normalized quotes         | $15                     |
| QUOTE_COMPARISON      | Yes            | Comparison complete                  | $10                     |
| BUYER_DECISION_REPORT | Yes            | Report generated + evidence attached | $20                     |
| NEGOTIATION_RUN       | Yes (optional) | Negotiation log recorded             | $10                     |

**Total per case**: $50–$70 per completed supplier switch intelligence case.

**Plan limit check**: `checkEntitlement("sourcing_runs")` already exists. Supplier Switch cases would consume the same entitlement, or add a new `"economic_cases"` feature entry.

## 8. MVP Boundary

### Phase A (MVP) — What to build first

```txt
1. PurchaseBaseline creation from manual input + invoice upload
2. Link baseline to existing SourcingRun
3. Manual alternative supplier addition
4. Quote upload and normalization (manual field entry)
5. Existing sourcing.compareQuotes + sourcing.generateBuyerReport
6. Enhanced SwitchDecisionReport layering on top of BuyerDecisionReport
7. Checkpoint billing (existing infrastructure)
```

### Phase B — What to defer

```txt
1. Automated alternative discovery (web search, directory crawl)
2. Automated quote extraction from PDF/email
3. Market benchmark data feed
4. Outcome learning tracking
5. EconomicCase model (wrap existing SourcingRun)
6. AI-powered recommendation generation
```

### Phase C — Future

```txt
1. Multi-user collaboration within buyer org
2. Supplier negotiation workflow
3. Automated switch execution (order placement)
4. Cross-user benchmark aggregation
5. Trade association network effects
```

## 9. Existing Architecture Mapping

| Spec concept        | Existing TradeOS object                  | Gap                                                                 |
| ------------------- | ---------------------------------------- | ------------------------------------------------------------------- |
| Sourcing container  | SourcingRun                              | Already has status lifecycle, supplier candidates, quotes, evidence |
| PurchaseBaseline    | None                                     | NEW — need model for current supplier snapshot                      |
| EconomicCase        | None                                     | NEW — need lightweight wrapper around SourcingRun                   |
| SupplierAlternative | SupplierCandidate                        | Extends well — need `reliabilityScore`, `riskFlags` (both exist)    |
| Quote normalization | SupplierQuote + compareQuotes            | Works for flat quotes; needs total-cost adjustment logic            |
| Supplier comparison | compareQuotes (existing)                 | Good foundation; needs term-adjusted comparison                     |
| Decision report     | generateBuyerReport + deliverBuyerReport | Report structure is close; needs switch recommendation field        |
| Evidence collection | EvidenceItem (polymorphic)               | Excellent fit; needs new evidence enum values                       |
| Billing             | WorkCheckpoint lifecycle                 | Perfect match; reuses existing PENDING→BILLED flow                  |
| Plan enforcement    | checkEntitlement()                       | Already works for sourcing_runs; new metric optional                |
| Outcome tracking    | None                                     | NEW — need OutcomeLearning model                                    |
| Permission/RBAC     | assertRole + assertPermission            | Existing; adds no new requirements                                  |

## 10. Non-Goals

1. **No marketplace** — TradeOS does not match buyers with suppliers. It helps buyers evaluate.
2. **No generic ERP** — No inventory, purchase order, or accounting modules.
3. **No social network** — No supplier reviews, ratings platform, or community features.
4. **No unaudited AI auto-purchase** — Every switch/negotiate action requires human approval.
5. **No contract management** — No contract drafting, signing, or storage.
6. **No payment processing** — Checkpoint billing is informational, not transactional.

## 11. Required Checks Before Implementation

1. **EvidenceItem enum migration** — Add new evidence types (CURRENT_SUPPLIER_INVOICE, ALTERNATIVE_QUOTE, SWITCH_DECISION_REPORT, OUTCOME_EVIDENCE, NEGOTIATION_LOG)
2. **PurchaseBaseline model** — Create Prisma schema, migration, and CRUD actions
3. **EconomicCase model** — Create lightweight wrapper around SourcingRun
4. **SupplierAlternative join** — Extend SupplierCandidate with switch-specific fields
5. **SwitchDecisionReport** — Layer on top of BuyerDecisionReport adding recommendation field
6. **OutcomeLearning model** — Create schema and tracking actions
7. **6 new registered actions** — baseline.create, alternative.discover, alternative.evaluate, report.generateSwitchDecision, outcome.record, outcome.summarize
8. **No migration** until production gates (E2E, authenticated smoke) are cleared

## 12. Risk Assessment

| Risk                             | Likelihood | Impact | Mitigation                                                            |
| -------------------------------- | ---------- | ------ | --------------------------------------------------------------------- |
| MVP too large                    | Medium     | High   | Phase A is incremental on existing SourcingRun; EconomicCase deferred |
| No automated quote parsing       | High       | Low    | Manual entry in MVP; defer AI extraction                              |
| Existing SourcingRun doesn't fit | Low        | High   | PurchaseBaseline as extension, not replacement                        |
| Users won't upload data          | Medium     | Medium | Provide templates, sample invoices, guided onboarding                 |
| Benchmark data unavailable       | High       | Medium | MVP works without benchmarks; leakage detection is self-referential   |
| Outcome learning too abstract    | Medium     | Low    | Defer to Phase B; baseline comparison is sufficient for MVP           |

## 13. Success Metrics

| Metric                             | Target (MVP) | Target (Phase B+) |
| ---------------------------------- | ------------ | ----------------- |
| Cases completed per user           | 1–3/month    | 3–10/month        |
| Average switch/negotiation actions | 0.5/case     | 1–2/case          |
| Evidence items per case            | 3–5          | 5–10              |
| Checkpoint billing events per case | 2–3          | 4–6               |
| User-reported savings (median)     | —            | 5–15%             |
| Outcome learning entries           | 0 (Phase A)  | >50% of cases     |
