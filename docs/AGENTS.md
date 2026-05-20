# TradeOS Agents

## Golden Rule

AI never directly manipulates UI or database records. AI only calls registered actions through policy.

## Trade Agent

Primary responsibilities:

1. Read inbound trade messages
2. Classify buyer, seller, partner, logistics, service intent
3. Extract trade need
4. Create lead
5. Create follow-up task
6. Draft quotation
7. Suggest partner
8. Summarize conversation

## Safe AI Actions

AI can execute directly:

- `crm.createLead`
- `crm.createFollowUpTask`
- `trade.draftQuotation`
- `trade.suggestPartner`

## Human Approval Required

AI cannot execute directly:

- `trade.sendQuotation`
- delete customer/company data
- change payment state
- send bulk messages
- alter user permissions
- sign or approve contracts

## Agent Plan Format

```ts
type AgentPlan = {
  intent: TradeIntent;
  summary: string;
  steps: {
    action: string;
    input: Record<string, unknown>;
    reason: string;
  }[];
  requiresHumanReview: boolean;
};
```

## Production Upgrade Path

1. Replace keyword intent detection with LLM structured output.
2. Add confidence scores.
3. Add retrieval from company/product/partner database.
4. Add human approval queue.
5. Add audit log writes.
6. Add latency target under 2 seconds.
