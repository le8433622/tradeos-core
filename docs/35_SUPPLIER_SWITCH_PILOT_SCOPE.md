# Supplier Switch Paid Pilot Scope

**Date**: 2026-05-26
**Status**: Draft — scope definition only. Pilot execution requires survival lane committed and schema migration applied.

## 1. Pilot Objective

Prove that TradeOS can deliver measurable cost savings for a real trade team through the Supplier Switch chain, end-to-end, without AI automation.

Success = a paying customer completes a switch decision using manual TradeOS workflows and reports a confirmed saving or better terms.

## 2. Pilot Tenant Requirements

| Item                    | Requirement                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------- |
| Tenant                  | Single isolated `organizationId` with dedicated data                                    |
| Users                   | 1–2 human operators (OWNER/OPERATOR roles)                                              |
| Auth                    | Demo auth enabled for pilot tenant (local/preview only); real auth for production pilot |
| Data isolation          | All records scoped to pilot `organizationId`                                            |
| No cross-tenant leakage | Verified by tenant invariant tests before pilot start                                   |
| Rollback                | Tenant data can be wiped by `organizationId` without affecting other tenants            |

## 3. Supplier Switch Chain — What Gets Tested

The full manual chain:

```
Current Spend Capture
  → PurchaseBaseline creation
    → Alternative Supplier entry + QuoteProof
      → SwitchDecisionReport generation
        → Buyer Approval / Request More Proof
          → Checkpoint Billing (evidence before billing)
            → OutcomeLearning recording
```

Each gate produces a deterministic output. No AI inference required.

## 4. Success Criteria

### Must have (paid pilot)

- [ ] Operator enters current supplier spend (PurchaseBaseline)
- [ ] Operator enters 2+ alternative suppliers with quotes (SupplierAlternative + QuoteProof)
- [ ] System generates a deterministic SwitchDecisionReport with savings estimate
- [ ] Buyer views report and approves/rejects/requests more proof
- [ ] Approval triggers a checkpoint billing event (evidence recorded before billing)
- [ ] Outcome is recorded (switch happened, savings realized)
- [ ] Tenant isolation verified — no data from other tenants visible
- [ ] All operations are audited (ImmutableAuditEvent chain verifiable)

### Nice to have

- [ ] Demo pilot tenant pre-populated with sample data
- [ ] 5-minute walkthrough for new operator
- [ ] Manual exit: operator can export all data at any time

## 5. Prerequisites (must be done before pilot)

| #   | Item                                                        | Owner      | Status                             |
| --- | ----------------------------------------------------------- | ---------- | ---------------------------------- |
| 1   | Survival lane (#65→#66) committed and merged                | Code agent | DONE locally, not merged           |
| 2   | Package.json CI gates active (E2E, schema, tenant)          | Code agent | In CI YAML, not active until merge |
| 3   | Kill switches documented + env vars in .env.example         | Code agent | DONE locally, not merged           |
| 4   | Schema migrations applied to staging Supabase               | Operator   | Not done — blocked on #66          |
| 5   | Pilot tenant created in Supabase                            | Operator   | Not done                           |
| 6   | Pilot user accounts created                                 | Operator   | Not done                           |
| 7   | Tenant invariant tests pass for all Supplier Switch actions | Code agent | Not done                           |
| 8   | Staging smoke test evidence recorded                        | Operator   | Not done                           |
| 9   | Health gate verified (`/api/health` → 200)                  | Operator   | Not done                           |

## 6. Pilot Execution Steps

### Phase A — Setup (operator + code agent)

1. Commit and merge survival lane (#65→#66) to main
2. Apply schema migrations to staging Supabase
3. Create pilot tenant `organizationId` in staging DB
4. Create pilot user account(s) with OWNER role
5. Verify tenant isolation with cross-tenant test
6. Run staging smoke tests
7. Record health gate evidence

### Phase B — Onboard pilot team (operator)

1. Give pilot team access to preview/staging URL
2. Walk through PurchaseBaseline entry
3. Walk through Alternative Supplier + Quote upload
4. Walk through SwitchDecisionReport generation
5. Walk through Buyer Approval flow
6. Walk through Outcome recording

### Phase C — Pilot execution (pilot team)

1. Pilot team enters their real supplier data
2. Team runs the chain for 1–3 products
3. Team makes a switch decision (or decides to negotiate)
4. Team records outcome
5. Team reports savings or qualitative result

### Phase D — Retrospective (operator + code agent)

1. Collect pilot feedback
2. Measure: time to complete chain per product
3. Measure: number of issues/bugs encountered
4. Measure: operator confidence in recommendation
5. Document: what worked, what broke, what was confusing
6. Decide: paid pilot extension, production pilot, or product pivot

## 7. Rollback Plan

If the pilot reveals critical issues:

1. Disable pilot tenant data visibility (no public routes)
2. Preserve all pilot data for analysis
3. Apply fixes in a branch with regression tests
4. Re-verify tenant isolation
5. Resume pilot on same or new tenant

If data corruption is discovered:

1. Stop pilot immediately
2. Restore staging DB from pre-pilot backup
3. Document root cause
4. Fix before restarting

## 8. What Is NOT in Pilot Scope

- No AI inference or planning
- No external supplier data integration
- No automated scraping or quote harvesting
- No marketplace features
- No generic CRM/ERP workflows
- No plugin execution
- No public signup or self-service
- No production Supabase or Vercel deployment
- No real payment processing

## 9. Pilot Duration

Target: **2–4 weeks** from prerequisites complete to retrospective.

| Phase         | Duration  |
| ------------- | --------- |
| Setup (A)     | 3–5 days  |
| Onboard (B)   | 1–2 days  |
| Execution (C) | 1–2 weeks |
| Retro (D)     | 2–3 days  |

## 10. Cost / Value Hypothesis

Pilot proves whether TradeOS can:

- Reduce time to evaluate supplier alternatives for a trade team
- Provide deterministic, explainable switch recommendations
- Create evidence-backed audit trail for procurement decisions
- Support checkpoint billing without AI

Minimum viable value: pilot team identifies at least one cost-saving opportunity or risk they would not have found without TradeOS.
