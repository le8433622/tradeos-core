# ADR 001: Action Registry as Source of Truth for Risk

**Status**: Accepted (2025-03)
**Risk Area**: Database schema, Security
**Reviewer**: CTO, CISO

## Context

The AI agent (`runTradeAgent`) plans actions with LLM-provided risk levels. These may be incorrect or manipulated. The system needs a single authoritative source for action risk metadata.

## Decision

Every action must be registered in the `@tradeos/policy-core` action registry via `registerAction()`. The registry stores:

- `riskLevel` — authoritative risk classification (LOW/MEDIUM/HIGH/CRITICAL)
- `requiresApprovalForAI` — whether AI needs human approval
- `allowedRoles` — which roles can execute the action

When `runTradeAgent` processes a plan, it:

1. Looks up each step action via `getAction(step.action)`
2. Uses registry `riskLevel` and `requiresApprovalForAI` for routing
3. Preserves LLM-provided risk as advisory `llmRiskLevel` on result
4. Rejects unknown actions with `REJECTED` status

## Consequences

- LLM cannot override risk level of an action
- Unknown actions are safely rejected
- Audit trail preserves both registry and LLM risk for analysis
- New actions must be registered before AI can use them
