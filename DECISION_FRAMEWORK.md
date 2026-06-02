# DECISION_FRAMEWORK.md

Canonical source: `FOUNDER_THINKING.md`.

This framework prevents AI agents and developers from turning TradeOS into generic CRM, ERP, marketplace, chatbot, dashboard, or automation theater.

Build only what reduces buyer loss, creates evidence, preserves human control, and moves toward paid proof.

Human nature is valid baseline data for scenario design. Real data calibrates exact facts and validates paid outcomes.

## Implementation Integrity Check

Before coding any feature, answer:

1. Buyer pain:
2. Payer:
3. Payment trigger:
4. AI/operator action:
5. Evidence produced:
6. Human approval boundary:
7. Risk reduced:
8. Acceptance criteria:
9. What should not be built yet:

If any item is unclear, choose the smallest manual-first implementation that can produce evidence and paid proof.

---

## Feature Decision Score

Score every feature from 0 to 5.

### 1. Buyer Pain

Does it solve a real buyer pain?

0 = no clear pain  
5 = urgent repeated expensive pain

Buyer pain can be inferred from stable human nature when the scenario is explicit: wanting gain, fearing loss, confusion, pride/status pressure, doubt, distrust, urgency, or desire for control.

### 2. Payment Trigger

Is there a natural moment where someone pays?

0 = no payer  
5 = payer has urgent reason to pay now

### 3. Evidence Output

Does it produce evidence?

0 = no evidence  
5 = strong reusable evidence ledger

### 4. AI Labor

Does it let AI do real work?

0 = static CRUD  
5 = AI performs meaningful economic labor

### 5. Human Approval Boundary

Is human control clear?

0 = unsafe automation  
5 = clean approval checkpoint

### 6. Operator Control Surface

Can the operator control a trust point?

0 = no control  
5 = controls demand, verification, payment, evidence, or dispute

### 7. MVP Simplicity

Can it be tested small?

0 = needs full platform  
5 = can test manually or with one workflow

---

## Build Rule

Build only if:

- Buyer Pain >= 4
- Payment Trigger >= 3
- Evidence Output >= 3
- AI Labor >= 3
- Human Approval Boundary >= 3
- MVP Simplicity >= 3

Defer if:

- mostly dashboard;
- mostly vanity;
- no payer;
- no evidence;
- no buyer loss;
- no approval boundary;
- requires too much platform dependency.

Manual-first is preferred when the workflow is economically valuable but not yet standardized.

---

## Six-Part Workflow Contract

Every important workflow should have:

1. Goal - what the user wants to achieve.
2. Loss - what the user avoids losing.
3. AI work - what labor AI performs.
4. Evidence - what proof is stored.
5. Human approval - what commitment human approves.
6. Paid unit - what delivered-work unit can be charged.

If one part is missing, defer automation and implement the smallest manual-first workflow that captures evidence.

---

## Default Priority Order

1. Paid proof workflow
2. Evidence ledger
3. AI sourcing/comparison/negotiation
4. Human approval checkpoint
5. Risk scoring
6. Billing by delivered work
7. Operator dashboard
8. Automation
9. Marketplace
10. Scale

Do not reverse this order without a strong reason.

---

## Anti-Drift Rule

Reject or defer work that primarily optimizes:

- UI appearance over decision value;
- data display over evidence-backed action;
- platform integration over platform-dependency escape;
- automation over manual workflow truth;
- marketplace complexity before trust and paid proof;
- AI prose over accountable economic work.

---

## Human-Nature Data Rule

When an agent says "we need real data," classify the missing data first:

1. Human-behavior prior - can be modeled from stable human nature and sandbox scenarios.
2. Market fact - needs evidence.
3. Supplier fact - needs verification.
4. Operational reliability fact - needs testing.
5. Paid-proof fact - needs actual buyer payment.

Use sandbox for item 1 when assumptions are stated. Do not use sandbox to assert items 2-5 as fact.
