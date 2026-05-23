# Billing Build-Vs-Buy Analysis

## Decision Record

TradeOS billing and metering uses **build-internal metering + external billing provider** (hybrid approach).

## What We Build (In-House)

| Component               | Decision | Rationale                                                                                               |
| ----------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| **Usage metering**      | Build    | Usage is tracked per tenant through existing analytics queries. No external service needed.             |
| **Plan limits**         | Build    | Simple config-driven limits checked at query time. No external dependency for read-only limits.         |
| **Usage export**        | Build    | Finance-ready JSON export from existing data. Avoids locking into a specific billing provider's schema. |
| **Graceful upgrade UI** | Build    | Plan-exceeded state shows upgrade message. Keep UX control.                                             |

## What We Buy (External Provider)

When ready to charge, integrate a billing provider for:

| Component                   | Recommendation | Examples                                                          |
| --------------------------- | -------------- | ----------------------------------------------------------------- |
| **Payment processing**      | Buy            | Stripe, Paddle, Chargebee — PCI-compliant, handles tax, invoicing |
| **Subscription management** | Buy            | Handles plan changes, proration, dunning, invoice generation      |
| **Metered billing events**  | Buy            | Send usage events from our meter → provider calculates charges    |

## Integration Pattern

```
TradeOS meter (analytics-core)
  → Internal usage tracking (getBillingMetrics, exportBillingUsage)
  → External billing provider webhook/integration
    → Stripe metered subscription
    → Paddle subscription
```

The `getBillingMetrics` / `exportBillingUsage` functions serve as the single source of truth for usage. A future integration layer will:

1. Periodically push usage events to the billing provider via their API
2. Sync plan changes from provider webhooks back to Organization.plan
3. Handle failed payment → limit enforcement (downgrade to FREE)

## Current Limitations

- No automatic plan change on payment failure
- No metered billing event streaming — usage is queried, not pushed
- No invoice generation — finance uses `/api/organization/billing/export`
- No tax handling — export provides raw usage data only
