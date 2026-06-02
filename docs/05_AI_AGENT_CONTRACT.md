# AI Agent Contract

Founder source of truth: root `FOUNDER_THINKING.md`.
Human-nature axiom layer: root `HUMAN_NATURE_AXIOMS.md`.

Core doctrine:

AI does the labor. Human approves the commitment. Evidence proves the work. Cashflow validates the product.
Human nature is the invariant behavioral dataset.

## Golden Rule

AI never writes directly to the database. AI only produces structured plans or calls registered actions through `@tradeos/policy-core`.

AI is an economic operator, not a chatbot. It must perform real work, preserve evidence, and request human approval at commitment boundaries.

AI may use stable human-nature priors to design scenarios and reason about risk. It must not convert those priors into factual claims without evidence.

## Agent Responsibilities

AI agents may:

- identify buyer loss and decision objective
- classify inbound trade messages
- summarize conversations
- extract trade fields
- identify missing information
- source suppliers or options through approved tools/actions
- compare options
- score risk
- preserve evidence
- draft follow-up tasks
- draft quotations
- suggest partners from tenant-approved data
- recommend next actions
- create approval requests for risky planned actions

AI agents may not:

- send quotations directly
- move money
- finalize orders
- delete customer/company/trade data
- change payment state
- approve contracts
- accept supplier terms
- make legal commitments
- change user roles or permissions
- send bulk messages
- publish public marketplace listings
- share data across tenants
- hide uncertainty or fabricate evidence

## Trade Intent Types

```ts
type TradeIntent =
  | "CREATE_LEAD"
  | "CREATE_FOLLOW_UP"
  | "DRAFT_QUOTATION"
  | "SUGGEST_PARTNER"
  | "SUMMARIZE"
  | "REQUEST_MISSING_INFO"
  | "UNKNOWN";
```

## Agent Plan Format

```ts
type AgentPlan = {
  intent: TradeIntent;
  confidence: number;
  summary: string;
  buyerLoss?:
    | "MONEY_LOSS"
    | "TIME_LOSS"
    | "TRUST_LOSS"
    | "SUPPLIER_RISK"
    | "DECISION_CONFUSION"
    | "OPERATIONAL_DISRUPTION"
    | "UNKNOWN";
  economicObjective?: string;
  extractedFields: {
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    companyName?: string;
    productCategory?: string;
    productDescription?: string;
    quantity?: string;
    originCountry?: string;
    destinationCountry?: string;
    budget?: string;
    currency?: string;
    incoterm?: string;
    timeline?: string;
    language?: "vi" | "en" | "other";
  };
  missingFields: string[];
  missingProofFlags: string[];
  evidenceToCreate: {
    type: string;
    source?: string;
    reason: string;
  }[];
  steps: {
    action: string;
    input: Record<string, unknown>;
    reason: string;
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    evidenceExpected?: string[];
    humanApprovalRequired?: boolean;
  }[];
  requiresHumanReview: boolean;
  humanDecisionNeeded?: string;
  paidWorkUnit?: string;
};
```

The plan must mark uncertainty instead of inventing proof. No evidence means no confident recommendation.

## Safe AI Actions

AI can execute these directly when role and policy allow:

- `crm.createLead`
- `crm.createFollowUpTask`
- `trade.draftQuotation`
- `trade.suggestPartner`

## Risky AI Actions

AI must create approval requests instead of executing:

- `trade.sendQuotation`
- `notification.sendBulk`
- final order confirmation
- money movement
- supplier contract acceptance
- destructive delete actions
- permission changes
- contract or payment actions
- public marketplace publication

Any action involving money, legal commitment, reputation, irreversible execution, suspicious supplier behavior, or unusually large price differences must include human review.

## Structured Output Requirements

When using an LLM provider, the agent must request structured JSON matching the plan schema.

The agent must handle:

- invalid JSON
- missing fields
- low confidence
- provider timeout
- provider rate limit
- unsafe requested action

Fallback behavior:

- preserve message
- create no high-risk action
- optionally create a low-risk lead if deterministic rules support it
- surface a review-needed summary to the user

## Prompt Safety Rules

Prompts must include:

- founder doctrine reminder: AI does labor, human approves commitment, evidence proves work, cashflow validates product
- human-nature prior reminder: wanting gain, fearing loss, confusion, pride/status, doubt, distrust, urgency, and desire for control
- buyer loss and payer reasoning
- tenant scope reminder
- no direct database writes
- allowed action list
- blocked action list
- output schema
- instruction to mark missing fields instead of inventing values
- instruction to mark missing proof instead of claiming certainty

Prompts must not include:

- unnecessary secrets
- unrelated tenant data
- raw large payloads when a normalized message is enough
- private data from other organizations

## Evaluation Fixtures

Maintain bilingual fixtures for Vietnamese and English messages.

Fixture categories:

- buyer asks for quotation
- seller offers products
- logistics request
- partner request
- follow-up appointment
- vague message with missing fields
- spam or irrelevant message
- high-risk instruction attempt

Each fixture should assert:

- intent
- confidence range
- buyer loss type
- extracted fields
- missing fields
- missing proof flags
- evidence to create
- planned actions
- whether human review is required

Add fixtures for:

- low-price supplier with weak evidence
- high supplier risk requiring human review
- platform data unavailable requiring manual fallback
- user asking AI to finalize order without approval
- recommendation that must include alternatives and uncertainty

## Latency Targets

Initial targets:

- p50 deterministic triage under 500ms
- p50 LLM triage under 1.2s
- p95 LLM triage under 4s
- webhook response should be fast enough to avoid provider retry storms

If AI planning becomes slow, move execution into `apps/worker` and return accepted processing state from the webhook.

## Failure Behavior

AI failure must not lose the inbound message.

Required sequence:

1. Store webhook event.
2. Store conversation/message.
3. Try AI plan.
4. On AI failure, mark processing failure and expose retry/review path.
5. Do not create unsafe fallback actions.

AI failure must also not fabricate certainty. When source access fails, use platform-dependency escape paths: user-provided links, screenshots, uploaded invoices, manual catalogs, chat quotes, operator-entered data, or manual follow-up.

If an agent asks for real data, it must classify whether the missing information is a human-behavior prior, a market fact, a supplier fact, a reliability fact, or paid-proof evidence. Only the last four require external production evidence.
