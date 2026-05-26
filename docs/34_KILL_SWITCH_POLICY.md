# Kill Switch Policy — TradeOS

**Date**: 2026-05-26
**Status**: Policy agreed; runtime implementation complete (#70)
**Issue**: #70
**Purpose**: every production automation path must have an OFF switch before it has an ON switch.

## 1. Rule Zero

```txt
No kill switch → no production enablement.
Fail closed, not open.
Manual before automatic.
```

## 2. Kill Switch Inventory

| Flag                           | Scope                      | Default (Production) | Default (Local/Dev) | Behavior When OFF                                              |
| ------------------------------ | -------------------------- | -------------------- | ------------------- | -------------------------------------------------------------- |
| `AI_EXECUTION_ENABLED`         | AI inference/planning      | `false`              | `false`             | AI may not generate plans, extract intents, or call actions.   |
| `EXTERNAL_TOOLCALL_ENABLED`    | AI-driven tool execution   | `false`              | `false`             | AI may not execute external tools (API, webhook, file system). |
| `WEBHOOK_PROCESSING_ENABLED`   | Inbound webhook ingestion  | `false`              | `false`             | Inbound webhooks are rejected with 503.                        |
| `WORKER_CONSUMING_ENABLED`     | Background job processing  | `false`              | `false`             | Worker loop is stopped; no jobs are dequeued or processed.     |
| `BILLING_SIDE_EFFECTS_ENABLED` | Payment/billing mutations  | `false`              | `false`             | Billing operations fail closed; no charges, no invoice state.  |
| `PLUGIN_EXECUTION_ENABLED`     | Third-party plugin sandbox | `false`              | `false`             | Plugin sandbox is disabled; no plugin code executes.           |

## 3. Per-Switch Behavior

### 3.1 `AI_EXECUTION_ENABLED`

**ON**: AI may perform inference, intent detection, extraction, summarization, draft messaging, missing-proof suggestion. AI output must pass runtime schema validation before action execution.

**OFF**: AI endpoints return `503 Service Unavailable`. No AI call is made. Human-only workflows are the sole path.

**Manual alternative**: operator reads and classifies messages, writes summaries, drafts messages manually.

### 3.2 `EXTERNAL_TOOLCALL_ENABLED`

**ON**: AI may invoke registered external tools with budget cap, max retry limit, and human takeover boundary.

**OFF**: AI toolcall path is disabled. AI may suggest tools but cannot execute them. Tool invocation endpoints return `503`.

**Manual alternative**: operator executes tools directly through the dashboard.

### 3.3 `WEBHOOK_PROCESSING_ENABLED`

**ON**: Inbound webhooks are accepted, idempotency-checked, and enqueued for processing.

**OFF**: All inbound webhook requests return `503 Service Unavailable`. No data is ingested. No jobs are enqueued.

**Manual alternative**: operator uploads data through the dashboard import feature.

### 3.4 `WORKER_CONSUMING_ENABLED`

**ON**: Worker loop dequeues and processes jobs per queue class with configured concurrency, timeout, retry, and DLQ.

**OFF**: Worker loop stops. In-flight jobs complete gracefully within their timeout, then the consumer shuts down. No new jobs are dequeued.

**Manual alternative**: operator processes items through the dashboard batch action.

### 3.5 `BILLING_SIDE_EFFECTS_ENABLED`

**ON**: Billing actions (invoice creation, payment state change, checkpoint billing) are allowed. Evidence-before-billing and approval gates still apply.

**OFF**: All billing actions fail closed. Checkpoint billing returns `503`. Invoice creation returns `503`. Payment state changes return `503`.

**Manual alternative**: billing operations are performed outside the system; manual reconciliation later.

### 3.6 `PLUGIN_EXECUTION_ENABLED`

**ON**: Third-party plugins may execute within sandbox with resource limits, budget cap, and approval gates.

**OFF**: Plugin sandbox is disabled. No plugin code executes. Plugin registration may still occur but execution is blocked.

**Manual alternative**: not applicable (no plugins exist in MVP).

## 4. Deployment Values

### Production

```env
AI_EXECUTION_ENABLED=false
EXTERNAL_TOOLCALL_ENABLED=false
WEBHOOK_PROCESSING_ENABLED=false
WORKER_CONSUMING_ENABLED=false
BILLING_SIDE_EFFECTS_ENABLED=false
PLUGIN_EXECUTION_ENABLED=false
```

All switches start OFF in production. Enable one at a time after verification:

- Kill switch toggles are tested and confirmed working
- Manual flow is proven for the corresponding feature
- Behavior QA confirms the path is safe
- Rollback path is documented

### Local Development / Staging

May set individual switches to `true` for testing, but:

- Never enable `BILLING_SIDE_EFFECTS_ENABLED` or `PLUGIN_EXECUTION_ENABLED` against a shared DB
- Never test automation paths against production data

## 5. Manual-First Rule

```txt
If manual flow does not work, auto flow is invalid.
```

Every automation path must have a working manual equivalent. Before enabling any kill switch:

1. Prove the manual flow works end-to-end.
2. Document the exact manual steps.
3. Verify the manual flow produces the same outputs as the automated flow would.
4. Confirm the manual flow does not depend on the automation being enabled.

### Supplier Switch Manual Flow

The entire Supplier Switch chain must work without AI:

| Step | Manual Action                                      | System Role                    |
| ---- | -------------------------------------------------- | ------------------------------ |
| 1    | Operator enters Current Spend data                 | Validate, persist, scope       |
| 2    | Operator enters PurchaseBaseline                   | Validate, persist, scope       |
| 3    | Operator enters alternative suppliers and quotes   | Normalize, persist, scope      |
| 4    | Operator triggers SwitchDecisionReport             | Deterministic scoring + report |
| 5    | Buyer views report, approves/rejects/requests-more | Persist decision, enforce gate |
| 6    | System generates checkpoint billing on approval    | Evidence-before-billing gate   |
| 7    | Operator records final outcome                     | Persist, learn                 |

AI may assist with extraction, summarization, draft messaging, or missing-proof suggestion — but the chain must work without any AI call.

## 6. Agent Stop Conditions

AI/code agents must stop and declare a blocker if:

1. A kill switch is missing for a side-effecting automation path.
2. The task requires enabling a kill switch in production without documented verification.
3. The task requires automation without the corresponding manual flow being proven.
4. AI output would drive action execution without runtime schema validation.
5. Economic side effects would occur without human approval and evidence.
6. The task creates a new automation path without adding a corresponding kill switch.

## 7. Kill Switch Implementation Pattern

Kill switches are implemented in `@tradeos/policy-core`:

- `assertKillSwitchEnabled(name)` — throws `KILL_SWITCH_BLOCKED` error if flag is not `"true"`
- `isKillSwitchEnabled(name)` — returns boolean
- `KILL_SWITCHES` — constant map of all switch names

### Wired Entry Points

| Kill Switch                    | File                                        | Function                          |
| ------------------------------ | ------------------------------------------- | --------------------------------- |
| `AI_EXECUTION_ENABLED`         | `packages/ai-core/src/index.ts:425`         | `runTradeAgent()`                 |
| `AI_EXECUTION_ENABLED`         | `packages/ai-core/src/llm.ts:199`           | `planWithLlm()`                   |
| `WEBHOOK_PROCESSING_ENABLED`   | `packages/webhook-core/src/pipeline.ts:105` | `processWebhookRequest()`         |
| `WORKER_CONSUMING_ENABLED`     | `packages/job-core/src/index.ts:242`        | `runWorkerLoop()`                 |
| `BILLING_SIDE_EFFECTS_ENABLED` | `packages/sourcing-core/src/index.ts:1290`  | `checkpoint.markAsBilled` handler |
| `BILLING_SIDE_EFFECTS_ENABLED` | `packages/analytics-core/src/index.ts:831`  | `billing.export` handler          |

**Not yet wired** (no runtime code exists):

- `EXTERNAL_TOOLCALL_ENABLED` — wire when external toolcall feature is implemented
- `PLUGIN_EXECUTION_ENABLED` — wire when plugin sandbox is implemented

## 8. Verification

Before enabling any kill switch in production:

```txt
[x] Kill switch OFF → service returns 503 / fails closed
[x] Kill switch ON → service operates normally
[x] Manual flow verified independently
[x] Rollback path documented
[x] Evidence-before-billing gate intact
[x] No auto-commitment without human approval
```

Implementation verified (2026-05-27):

```txt
pnpm typecheck   → 18/18
pnpm test        → 447 passed, 10 skipped
pnpm build       → 53/53
pnpm docs:check  → 60/60
```

Test environment: all kill switch env vars set to `"true"` in vitest configs (`webhook-core`, `ai-core`, `sourcing-core`, `analytics-core`). Tests mock `assertKillSwitchEnabled` in `ai-core` to ensure the check exists without depending on env.
