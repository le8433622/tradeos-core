# AI Agent Contract

## Golden Rule

AI never writes directly to the database. AI only produces structured plans or calls registered actions through `@tradeos/policy-core`.

## Agent Responsibilities

AI agents may:

- classify inbound trade messages
- summarize conversations
- extract trade fields
- identify missing information
- draft follow-up tasks
- draft quotations
- suggest partners from tenant-approved data
- recommend next actions
- create approval requests for risky planned actions

AI agents may not:

- send quotations directly
- delete customer/company/trade data
- change payment state
- approve contracts
- change user roles or permissions
- send bulk messages
- publish public marketplace listings
- share data across tenants

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
  steps: {
    action: string;
    input: Record<string, unknown>;
    reason: string;
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  }[];
  requiresHumanReview: boolean;
};
```

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
- destructive delete actions
- permission changes
- contract or payment actions
- public marketplace publication

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

- tenant scope reminder
- no direct database writes
- allowed action list
- blocked action list
- output schema
- instruction to mark missing fields instead of inventing values

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
- extracted fields
- missing fields
- planned actions
- whether human review is required

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
