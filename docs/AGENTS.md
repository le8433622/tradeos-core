# TradeOS Agents

Root source of truth: `../FOUNDER_THINKING.md` and `../AGENTS.md`.
Human-nature axiom layer: `../HUMAN_NATURE_AXIOMS.md`.

Core doctrine:

AI does the labor. Human approves the commitment. Evidence proves the work. Cashflow validates the product.
Human nature is the invariant behavioral dataset.

Do not turn this project into generic CRM, ERP, marketplace, chatbot, dashboard, or automation theater.

Read `../HUMAN_NATURE_DATA_MODEL.md` before rejecting sandbox scenarios for lack of production data.

## Golden Rule

AI never directly manipulates UI or database records. AI only calls registered actions through policy.

AI must preserve evidence, mark uncertainty, and request human approval at money, legal, final-order, reputation, or irreversible-action boundaries.

## Trade Agent

Primary responsibilities:

1. Understand buyer objective and loss
2. Read inbound trade messages
3. Classify buyer, seller, partner, logistics, service intent
4. Extract trade need
5. Identify missing proof
6. Compare options and score risk
7. Preserve evidence
8. Create lead
9. Create follow-up task
10. Draft quotation
11. Suggest partner
12. Summarize conversation
13. Create approval request for risky commitment

## Safe AI Actions

AI can execute directly:

- `crm.createLead`
- `crm.createFollowUpTask`
- `trade.draftQuotation`
- `trade.suggestPartner`

## Human Approval Required

AI cannot execute directly:

- `trade.sendQuotation`
- move money
- finalize orders
- delete customer/company data
- change payment state
- send bulk messages
- alter user permissions
- sign or approve contracts
- accept supplier terms
- hide uncertainty or fabricate evidence

## Agent Plan Format

```ts
type AgentPlan = {
  intent: TradeIntent;
  summary: string;
  buyerLoss?: string;
  evidenceToCreate: string[];
  missingProofFlags: string[];
  humanDecisionNeeded?: string;
  steps: {
    action: string;
    input: Record<string, unknown>;
    reason: string;
    evidenceExpected?: string[];
  }[];
  requiresHumanReview: boolean;
};
```

No evidence, no confident recommendation.

## Production Upgrade Path

1. Replace keyword intent detection with LLM structured output.
2. Add confidence scores.
3. Add retrieval from company/product/partner database.
4. Add human approval queue.
5. Add audit log writes.
6. Add latency target under 2 seconds.

## Production 10/10 Plan

For production-readiness tasks, follow `docs/28_PRODUCTION_10_10_TASK_PLAN.md`. This plan addresses ALL known blockers (4 critical, 5 high, 9 medium) documented in `docs/13_CHECKPOINTS.md`.

Before any production operation:

- Read `agent.md` (Production Ops Mode)
- Read `docs/10_DEPLOYMENT_RUNBOOK.md`
- Get explicit user approval per command
