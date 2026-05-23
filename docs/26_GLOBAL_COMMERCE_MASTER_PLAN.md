# TradeOS Global Commerce Master Plan

## Purpose

This is the execution plan for turning TradeOS from a strong MVP into a global commerce operating system with three explicit outcomes:

- Super value: customers can prove recovered revenue, faster quotes, and fewer missed opportunities.
- Super revenue: TradeOS can charge premium SaaS, association, enterprise, usage, and later transaction/data products.
- Super intelligence: AI becomes a trusted operating layer that is grounded in tenant data, policy-bound, measurable, and continuously improving.

This plan does not replace `RULES.md`. Every task below inherits the hard rules from `RULES.md`.

## Strategic Thesis

TradeOS should not win by becoming a generic CRM, a chatbot, or a premature marketplace. TradeOS wins by becoming the system of record and system of action for trade revenue work:

1. Capture every inbound opportunity.
2. Convert opportunities into quotes, follow-ups, approvals, and deals.
3. Prove revenue impact to owners, associations, and enterprises.
4. Learn from every interaction and make the next action smarter.
5. Build cross-tenant network value only after private workflow data proves repeated demand.

## Product Flywheel

```txt
More inbound channels
  -> more structured opportunities
  -> faster follow-up and quotation
  -> more measurable won/lost outcomes
  -> better AI recommendations
  -> stronger tenant ROI proof
  -> higher willingness to pay
  -> more tenants and associations
  -> opt-in intelligence and introduction network
```

## Non-Negotiable Product Gates

| Gate                        | Rule                                                                               | Why                                      |
| --------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------- |
| Security before growth      | No growth/marketplace feature ships while CRITICAL/HIGH security findings remain   | One tenant data leak kills trust         |
| Workflow before marketplace | Marketplace starts only after manifesto thresholds are met for 4 consecutive weeks | Avoid empty marketplace trap             |
| Human approval for risk     | AI drafts and recommends; risky execution is approved                              | Trade errors have legal/financial impact |
| Revenue proof before polish | Build metrics that prove money saved or earned before cosmetic features            | Customers pay for ROI, not pages         |
| Tenant isolation always     | Every read/write is scoped or explicitly consented                                 | Enterprise survival requirement          |
| Auditability always         | Every important mutation is traceable                                              | Trust layer and compliance foundation    |

## North-Star Metrics

| Area         | Metric                                                 | 90-Day Target        | 12-Month Target       |
| ------------ | ------------------------------------------------------ | -------------------- | --------------------- |
| Capture      | Inbound messages converted to structured opportunities | 80%                  | 95%                   |
| Speed        | Median first response time                             | < 2 hours            | < 30 minutes          |
| Quote        | Time from inbound to quotation draft                   | < 30 minutes         | < 5 minutes           |
| Follow-up    | Follow-up SLA completion                               | > 80%                | > 95%                 |
| Revenue      | Revenue attributed through TradeOS                     | tracked for 3 pilots | > 70% of closed deals |
| AI           | Intent precision on eval set                           | > 85%                | > 95%                 |
| Safety       | Mutations audited                                      | 100%                 | 100%                  |
| Reliability  | Webhook success after retry                            | > 99%                | > 99.9%               |
| Monetization | Average revenue per tenant                             | > $500/mo            | > $1,500/mo           |
| Margin       | LLM COGS as % of revenue                               | < 20%                | < 10%                 |

## Revenue Strategy

| Stage       | Target Customer                             | Price Motion          | Product Promise                                               |
| ----------- | ------------------------------------------- | --------------------- | ------------------------------------------------------------- |
| Pilot       | Exporter/importer team or small association | $499/mo + setup       | Never miss inbound trade opportunities                        |
| Team        | 5-20 person trade team                      | $1,500/mo             | Faster quote-to-win workflow and revenue dashboard            |
| Association | Trade association with members              | $3,000-$10,000/mo     | Prove member value and run vetted introductions               |
| Enterprise  | Multi-org trade operator                    | $20k-$100k ARR        | Governance, audit, SSO, compliance, integrations              |
| Network     | Opted-in tenants after marketplace gate     | Usage/transaction fee | Qualified introductions, trade intelligence, partner services |

## Execution Protocol For Every Task

Before implementation:

1. Read `RULES.md`.
2. Read the package that owns the behavior.
3. Check whether a registered action already exists.
4. Identify tenant isolation, permission, audit, MFA, and approval implications.
5. Define verification before coding.

Before completion:

1. Run targeted tests.
2. Run `pnpm build` unless blocked.
3. Run `pnpm db:generate` after schema changes.
4. Update `docs/13_CHECKPOINTS.md` when task status changes.
5. Record skipped checks and residual risks.

---

## Phase G0: Red Gate - Fix Current Critical Blockers

Goal: remove known correctness, security, and production-readiness blockers before adding growth features.

Exit criteria:

- No known CRITICAL findings remain from current review.
- MFA-sensitive actions can be completed by a real AAL2 session.
- Invitation flow cannot mutate data from a GET page load.
- Settings/team/privacy mutations are policy-aware and audited.
- Tenant isolation tests cover the known historical weak spots.

### G0.Security.001 Forward MFA Level To All Action Execution Contexts

Why: `executeAction()` enforces `context.mfaLevel === 'aal2'`, but API routes that call `executeAction` do not consistently pass `session.mfaLevel`.

Read first:

- `RULES.md` section 2
- `packages/policy-core/src/index.ts`
- all routes matching `executeAction(`

Implementation steps:

1. Search all `executeAction(` calls in `apps/web` and packages.
2. For every session-backed route, pass `mfaLevel: session.mfaLevel`.
3. For approval execution, preserve `approved: true` and also pass `mfaLevel`.
4. For system/worker calls, decide whether MFA is not applicable or whether execution must be approval-only.
5. Add tests or smoke notes covering one MFA-required action.

Acceptance:

- No session-backed `executeAction` call omits `mfaLevel`.
- MFA-required actions return `MFA_REQUIRED` only when session is not AAL2.
- Approval execution does not bypass MFA when policy requires it.

Verification:

- `pnpm --filter @tradeos/policy-core test`
- `pnpm build`

### G0.Security.002 Implement Real Supabase AAL/MFA Session Resolution

Why: `mfaLevel` is hardcoded to `aal1`, so sensitive actions can never pass MFA.

Read first:

- `packages/auth/src/tenant.ts`
- `packages/auth/src/supabase.ts`
- Supabase auth AAL/factors documentation

Implementation steps:

1. Extend Supabase token resolution to obtain current AAL or enrolled factor status.
2. Return `mfaLevel: 'aal2'` only when the authenticated session has completed MFA.
3. Keep demo auth local-only and explicit.
4. Add safe fallback to `aal1` when AAL cannot be verified.
5. Add API/user-facing guidance for MFA-required failures.

Acceptance:

- Production session can represent `aal2`.
- Missing Supabase MFA env/config does not silently grant `aal2`.
- MFA-required actions have a real path to success.

Verification:

- `pnpm build`
- Manual auth smoke test with AAL1 and AAL2 sessions

### G0.Security.003 Convert Invitation Accept From GET Mutation To POST Action

Why: accepting an invite on page load can be triggered by email preview bots and violates HTTP safety.

Read first:

- `apps/web/app/invite/[token]/page.tsx`
- `packages/database/prisma/schema.prisma`
- `RULES.md` section 8

Implementation steps:

1. Change GET page to read-only display of invite status.
2. Add a server action or POST route that accepts the invitation after explicit user click.
3. Wrap membership create/update, invitation update, and audit log in a transaction.
4. Validate `session.email === invitation.email`.
5. Make accept idempotent for already-active member.

Acceptance:

- GET never creates or updates membership/invitation records.
- POST writes an audit log and is transactionally consistent.
- Expired, accepted, mismatched, and invalid invite states are clear to the user.

Verification:

- `pnpm build`
- Manual invalid/expired/mismatch/already-accepted smoke tests

### G0.Policy.001 Move Team Invitation Creation Behind Registered Action

Why: the team settings server action currently creates invitations directly with Prisma.

Read first:

- `apps/web/app/settings/team/page.tsx`
- `apps/web/app/api/invitations/route.ts` if present
- `packages/policy-core/src/index.ts`

Implementation steps:

1. Add a registered action such as `user.invite` or reuse an existing invitation action if available.
2. Validate email format and roleId.
3. Validate role exists and is `isSystem` unless custom-role support is completed.
4. Generate token/hash inside the action or an explicit API boundary.
5. Write audit through `executeAction`.
6. Make page server action call the action or API instead of direct Prisma.

Acceptance:

- No direct `prisma.invitation.create` remains in page server actions.
- Invitation creation is permission-gated and audited.
- Invalid roleId cannot create broken invitations.

Verification:

- `pnpm --filter @tradeos/policy-core test`
- `pnpm build`

### G0.Policy.002 Move Organization Settings Mutations Behind Registered Actions

Why: settings mutations affect billing, AI budget, marketplace consent, and MFA policy.

Read first:

- `apps/web/app/api/organization/settings/route.ts`
- `packages/policy-core/src/index.ts`
- `RULES.md` sections 1, 2, 3, and 7

Implementation steps:

1. Define separate actions for settings classes: profile, billing, AI budget, security, introductions consent.
2. Risk-classify each action correctly.
3. Add permission keys and seed mappings.
4. Add MFA requirement for security/billing actions.
5. Replace direct `prisma.organization.update` with `executeAction`.
6. Redact audit inputs.

Acceptance:

- Plan, MFA, AI budget, and introductions toggles are audited via registered actions.
- OWNER-only and MFA rules are enforced centrally.
- API route remains thin.

Verification:

- `pnpm db:generate` if schema changes
- `pnpm --filter @tradeos/policy-core test`
- `pnpm build`

### G0.Tenancy.001 Fix Contact Update Tenant Isolation

Why: contacts without company relation can bypass org validation if only company org is checked.

Read first:

- `packages/crm-core/src/index.ts`
- `RULES.md` section 1.3

Implementation steps:

1. Load `contact.organizationId` before update.
2. Validate the contact itself belongs to `input.organizationId`.
3. Validate new `companyId`, if provided, also belongs to the same org.
4. Add regression test.

Acceptance:

- Cross-tenant contact updates fail even when contact has no company.
- Relation changes cannot point a contact to another org's company.

Verification:

- package tests if available
- `pnpm build`

### G0.Tenancy.002 Fix Introduction Participant Validation

Why: dispute/value-report actions must prove the caller org is part of the introduction.

Read first:

- `packages/trade-core/src/index.ts`
- `docs/00_PRODUCT_MANIFESTO.md` marketplace gate

Implementation steps:

1. Add participant validation helper for introduction request actions.
2. Apply it to dispute, report value, approve, reject, and any future introduction mutation.
3. Add regression tests for non-participant org.

Acceptance:

- Non-participant org cannot mutate introduction status/value/dispute fields.
- Participant validation is centralized.

Verification:

- package tests if available
- `pnpm build`

### G0.Privacy.001 Fix PII Anonymization Transaction And Unique Emails

Why: updating many users to the same anonymized email can violate unique constraints; using global prisma breaks transactional audit.

Read first:

- `packages/crm-core/src/index.ts`
- `packages/analytics-core/src/index.ts`
- `RULES.md` sections 1 and 7

Implementation steps:

1. Use `db(context)` inside `privacy.anonymizePii`.
2. Generate unique anonymized email per user, e.g. `deleted-{userId}@anonymized.local`.
3. Avoid `updateMany` for user email if uniqueness is required.
4. Keep contact/lead anonymization tenant-scoped.
5. Add regression test for multiple users in one org.

Acceptance:

- PII anonymization works for orgs with multiple users.
- Mutation and audit write commit or fail together.
- Result contains counts only, not PII.

Verification:

- targeted privacy/action test
- `pnpm build`

### G0.Auth.001 Complete Active Organization Selection

Why: multi-org membership exists, but active organization selection is not wired end-to-end.

Read first:

- `packages/auth/src/tenant.ts`
- `packages/auth/src/demo.ts`
- `apps/web/app/api/user/memberships/route.ts` if present
- settings/layout/header components

Implementation steps:

1. Decide active org source: signed cookie or trusted header set by app UI.
2. Pass active org into `resolveSessionFromEmail`.
3. Validate the user has ACTIVE membership in selected org.
4. Add workspace switcher UI.
5. Update all session display components to use active org name.

Acceptance:

- User with multiple orgs can switch active org.
- User cannot select an org where they are not active member.
- Tenant data follows selected org across APIs and pages.

Verification:

- `pnpm build`
- manual multi-org smoke test

### G0.Seed.001 Add Root Seed Script And Seed Drift Check

Why: permission-driven features break if the seed is not run or missing keys.

Implementation steps:

1. Add root `db:seed` script if missing.
2. Add a seed verification test/script that compares route/action permission references against `PERMISSIONS`.
3. Document seed command in `README.md` and `AGENTS.md` if needed.

Acceptance:

- `pnpm db:seed` is valid at repo root.
- Missing permission keys are caught before runtime.

Verification:

- `pnpm db:seed` on local/dev DB if safe
- `pnpm build`

### G0.Test.001 Create Regression Suite For Known Historical Failures

Why: every bug in `RULES.md` should have a test or smoke check.

Implementation steps:

1. Add tests for `mfaLevel` enforcement.
2. Add tests for cross-tenant contact update.
3. Add tests for introduction participant validation.
4. Add tests for invite role validation.
5. Add tests for settings action audit path.
6. Add a checklist when direct automated route tests are not feasible.

Acceptance:

- Every CRITICAL/HIGH finding in `RULES.md` has a corresponding test or documented smoke procedure.

Verification:

- all package tests
- `pnpm build`

---

## Phase G1: Revenue Command Center

Goal: make the product prove money, not activity. The dashboard must tell a trade owner how much revenue was captured, delayed, recovered, or at risk.

Exit criteria:

- Every inbound opportunity has owner, stage, value estimate, next action, and SLA status.
- Dashboard answers: what money is at risk today, what can be recovered, and who must act now.
- Weekly report contains revenue attribution and leak analysis.

### Task Backlog

| ID               | Task                                      | Outcome                                                 | Acceptance                                                       |
| ---------------- | ----------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------- |
| G1.Model.001     | Define Opportunity/Deal lifecycle         | Replace loose lead status with revenue workflow         | Domain doc updated; schema/action plan approved before migration |
| G1.Model.002     | Add value/probability/expected close date | Forecast revenue per opportunity                        | Tenant-scoped fields and audit-aware updates                     |
| G1.Workflow.001  | SLA queue                                 | Operators see urgent inbound and overdue follow-ups     | Queue sorts by urgency, value, and due time                      |
| G1.Workflow.002  | Revenue leak detector                     | Identify stale high-value leads and unsent quotes       | Dashboard card links to actionable list                          |
| G1.Workflow.003  | Recovery workflow                         | One-click task creation for stale revenue               | Registered action creates audited task                           |
| G1.Analytics.001 | Revenue attribution model                 | Attribute won deals to channel, owner, quote, follow-up | Metrics service centralizes calculations                         |
| G1.Analytics.002 | Funnel dashboard                          | Inbound -> lead -> quote -> sent -> won/lost            | Conversion rates and drop-offs visible                           |
| G1.Analytics.003 | Response speed by channel                 | Show which channels lose deals from delay               | Per-channel p50/p95 response metrics                             |
| G1.Report.001    | CEO weekly digest                         | Owner gets value summary, not raw activity              | Includes recovered revenue, at-risk revenue, next actions        |
| G1.UX.001        | Money dashboard redesign                  | Make home page a command center                         | Mobile and desktop load cleanly                                  |
| G1.Test.001      | Analytics fixtures                        | Ensure metrics cannot cross tenants                     | Multi-org sample fixtures and expected values                    |

Detailed implementation notes:

- Keep API routes thin; put calculations in `packages/analytics-core`.
- Any new mutation goes through registered actions.
- If introducing a new Deal/Opportunity model, update `docs/02_DOMAIN_MODEL.md` and create an ADR before schema migration.

---

## Phase G2: Quote-To-Win Engine

Goal: make TradeOS the fastest and safest way to turn an inbound requirement into a reviewed, tracked, and won quotation.

Exit criteria:

- Sales team can draft, review, send, and track quotations without leaving TradeOS.
- Quotes are grounded in product catalog and trade terms.
- Quote outcomes feed intelligence and revenue attribution.

### Task Backlog

| ID           | Task                                       | Outcome                                                 | Acceptance                                     |
| ------------ | ------------------------------------------ | ------------------------------------------------------- | ---------------------------------------------- |
| G2.Quote.001 | Incoterms and payment terms model          | Trade-specific quote terms                              | Validated terms; no hallucinated terms from AI |
| G2.Quote.002 | Multi-currency support                     | Quote in buyer currency, report in org currency         | FX source documented; historical rate stored   |
| G2.Quote.003 | Quote template library                     | Faster repeatable quote drafting                        | Tenant-scoped templates; audited changes       |
| G2.Quote.004 | Quote versioning                           | Track revisions and negotiation                         | Immutable version history with actor/timestamp |
| G2.Quote.005 | PDF/export renderer                        | Customer-ready quotation documents                      | No PII leak; brandable template                |
| G2.Quote.006 | Approval-aware send flow                   | Send only after policy passes                           | HIGH risk action remains approval-gated        |
| G2.Quote.007 | Customer viewed/accepted/rejected tracking | Lifecycle visibility                                    | Events are tenant-scoped and auditable         |
| G2.Quote.008 | Product catalog matching                   | AI suggests products from real catalog only             | No freeform product invention in quote drafts  |
| G2.Quote.009 | Margin guardrails                          | Prevent below-margin quotes                             | Warning or approval required below threshold   |
| G2.Quote.010 | Lost reason workflow                       | Learn why quotes fail                                   | Required reason on lost/rejected outcome       |
| G2.AI.001    | Grounded quote drafting                    | AI drafts from catalog, prior quotes, and customer need | Includes confidence and missing fields         |
| G2.Test.001  | Quote lifecycle tests                      | Prevent tenant/action regressions                       | Draft/update/send/version tests pass           |

---

## Phase G3: Multi-Channel Acquisition Engine

Goal: own the first mile of global trade demand across messaging, email, web forms, and future channels.

Exit criteria:

- Tenant can onboard at least Zalo, WhatsApp, email, and web forms with health checks.
- Every inbound event is idempotent, observable, and recoverable.
- Identity resolution reduces duplicate companies/contacts/leads.

### Task Backlog

| ID              | Task                             | Outcome                              | Acceptance                                          |
| --------------- | -------------------------------- | ------------------------------------ | --------------------------------------------------- |
| G3.Setup.001    | Integration setup wizard         | Non-engineer can connect channels    | Shows required secrets, test status, last event     |
| G3.Health.001   | Integration health dashboard     | Operators see broken channels early  | Last success, failure rate, disabled status visible |
| G3.Email.001    | Real email thread sync           | Keep full buyer conversation context | Reply-to-thread and dedupe behavior documented      |
| G3.WhatsApp.001 | Bidirectional WhatsApp messaging | Respond from TradeOS                 | Sending remains policy/rate-limit aware             |
| G3.Zalo.001     | Bidirectional Zalo messaging     | Serve Vietnam wedge deeply           | Signature and tenant integration rules preserved    |
| G3.Web.001      | Embeddable inquiry form          | Capture website leads                | Spam/rate-limit/tenant isolation included           |
| G3.Identity.001 | Contact/company dedupe           | Reduce duplicate CRM records         | Merge is approval/audit-aware                       |
| G3.Routing.001  | Auto-routing rules               | Assign by product/country/channel    | Rules are tenant-scoped and testable                |
| G3.Queue.001    | Dead-letter operations UI        | Recover failed inbound jobs          | Retry/cancel/manual resolve paths exist             |
| G3.Test.001     | Provider fixture suite           | Prevent webhook breakage             | Signed valid/invalid/duplicate payload fixtures     |

---

## Phase G4: Super Intelligent AI Layer

Goal: evolve from intent detection into a policy-bound multi-agent trade intelligence system.

Exit criteria:

- AI is grounded in tenant facts.
- Every AI decision is explainable, evaluated, and observable.
- AI improves response speed and quote quality without bypassing human approval.

### Task Backlog

| ID                   | Task                             | Outcome                                                       | Acceptance                                        |
| -------------------- | -------------------------------- | ------------------------------------------------------------- | ------------------------------------------------- |
| G4.Agent.001         | Multi-agent pipeline design      | Separate triage, extraction, quote, policy, insight agents    | ADR created before implementation                 |
| G4.RAG.001           | Tenant-safe retrieval layer      | AI uses product catalog, prior quotes, conversations          | Retrieval is organization-scoped                  |
| G4.Policy.001        | AI policy reasoning trace        | Explain why action executed, blocked, or requested approval   | Trace visible in audit/agent result               |
| G4.Eval.001          | Expanded multilingual golden set | Measure EN/VI/Chinese/Thai/Indonesian intent                  | Thresholds in CI/eval command                     |
| G4.Eval.002          | Hallucination tests              | Prevent fake terms/products/regulations                       | AI must output missing fields/refusal             |
| G4.Eval.003          | Prompt-injection suite           | Prevent user text from overriding policy                      | False-positive mutation rate stays near zero      |
| G4.Learning.001      | Human correction capture         | Learn from approval/rejection/edit behavior                   | Corrections stored tenant-scoped and privacy-safe |
| G4.Observability.001 | AI trace dashboard               | Track cost, latency, confidence, fallback, block rate         | Per-tenant and global safe metrics                |
| G4.Cost.001          | Model routing engine             | Use cheap model for easy tasks, stronger model for hard tasks | Budget caps preserved                             |
| G4.Proactive.001     | Next-best-action engine          | Recommend actions before users ask                            | Recommendations require human action to execute   |
| G4.Safety.001        | AI kill switch                   | Disable risky AI features quickly                             | Feature flag documented and tested                |

---

## Phase G5: Enterprise Trust And Governance

Goal: make TradeOS safe enough for enterprise buyers, associations, and regulated partners.

Exit criteria:

- Enterprise admin can govern users, roles, SSO, MFA, data retention, audit exports, and integrations.
- Security review has no critical/high findings.
- SOC2 readiness evidence is continuously maintained.

### Task Backlog

| ID               | Task                            | Outcome                                        | Acceptance                                         |
| ---------------- | ------------------------------- | ---------------------------------------------- | -------------------------------------------------- |
| G5.RBAC.001      | Custom role CRUD                | Admins can create roles and assign permissions | Permission changes are MFA + audit gated           |
| G5.MFA.001       | Security settings UI            | Owner can enable org MFA policy                | Calls registered action; shows enrollment status   |
| G5.SSO.001       | SAML/OIDC SSO                   | Enterprise login                               | Tenant-configurable and safe fallback              |
| G5.SCIM.001      | SCIM provisioning               | Enterprise user lifecycle                      | Suspend/remove flows are audited                   |
| G5.Audit.001     | Audit export pack               | Compliance-ready evidence export               | Redaction and date filters preserved               |
| G5.Retention.001 | Data retention policies         | Tenant-controlled retention/archive            | Deletes/anonymization approval-gated               |
| G5.Legal.001     | Legal hold workflow             | Preserve data under legal hold                 | Blocks destructive actions where needed            |
| G5.Admin.001     | Integration admin controls      | Disable/rotate secrets quickly                 | No production header org fallback                  |
| G5.Flags.001     | Feature flags and kill switches | Gradual rollout and emergency rollback         | Flags documented in runbook                        |
| G5.Security.001  | OWASP route review              | Reduce web app risk                            | Findings tracked and fixed before enterprise pilot |

---

## Phase G6: Association And Network Value

Goal: make associations pay because TradeOS proves member value and creates controlled, audited introductions.

Exit criteria:

- Association operator can onboard members, monitor engagement, run vetted introductions, and report value.
- Cross-tenant data sharing remains opt-in and approval-gated.
- Marketplace readiness can be measured automatically.

### Task Backlog

| ID                | Task                          | Outcome                                     | Acceptance                                     |
| ----------------- | ----------------------------- | ------------------------------------------- | ---------------------------------------------- |
| G6.Member.001     | Member onboarding flow        | Invite and activate member orgs             | Uses OrganizationMember and invitation rules   |
| G6.Member.002     | Member health score           | Association sees engaged/inactive members   | Score uses safe aggregate metrics              |
| G6.Operator.001   | Association command center    | Operator sees opportunities and bottlenecks | No private member data leaks by default        |
| G6.Intro.001      | Introduction queue v2         | Match demand/supply with operator mediation | Participant validation and consent enforced    |
| G6.Intro.002      | Introduction outcome tracking | Prove value from connections                | Value reporting tenant/participant scoped      |
| G6.Broadcast.001  | Vetted opportunity broadcast  | Send opportunities to eligible members      | Bulk send approval-gated                       |
| G6.Profile.001    | Opt-in profile pages          | Controlled member visibility                | Consent level controls exposure                |
| G6.Reputation.001 | Reputation score prototype    | Trust based on real outcomes                | Private first; no public score without consent |
| G6.Report.001     | Association ROI report        | Show member value weekly/monthly            | Exportable summary for board meetings          |
| G6.Gate.001       | Marketplace readiness tracker | Enforce manifesto thresholds                | Four-week gate visible and automated           |

---

## Phase G7: Monetization Engine

Goal: make revenue mechanics explicit, measurable, and scalable.

Exit criteria:

- Plans, limits, billing, upgrades, usage metering, and COGS controls are operational.
- Sales team can sell a clear ROI-backed package.
- Product can identify expansion and churn risk.

### Task Backlog

| ID                 | Task                         | Outcome                                    | Acceptance                                       |
| ------------------ | ---------------------------- | ------------------------------------------ | ------------------------------------------------ |
| G7.Pricing.001     | Packaging definition         | Pilot/Team/Association/Enterprise SKUs     | Entitlements mapped to features and limits       |
| G7.Entitlement.001 | Entitlement checks           | Feature access follows plan                | Backend source of truth, not UI only             |
| G7.Billing.001     | Billing provider integration | Real subscriptions/invoices                | Provider webhooks update plan safely             |
| G7.Metering.001    | Usage event stream           | Bill or limit by channel/messages/AI       | Internal usage remains source of truth           |
| G7.Upgrade.001     | Upgrade UX                   | Convert value moments into paid plan       | Shows usage, ROI, and next tier benefit          |
| G7.COGS.001        | Gross margin dashboard       | Keep AI/provider costs under control       | Margin by tenant visible                         |
| G7.Sales.001       | Paid pilot playbook          | Repeatable onboarding/sales motion         | Includes setup checklist and ROI report template |
| G7.Expansion.001   | Expansion signals            | Identify tenants ready for higher tier     | Uses usage, teams, integrations, ROI             |
| G7.Churn.001       | Churn risk signals           | Detect drop in engagement/value            | Alerts customer success/operator                 |
| G7.Finance.001     | Finance export               | CFO-ready usage and invoice reconciliation | Export excludes unnecessary PII                  |

---

## Phase G8: Global Trade Expansion

Goal: make TradeOS work across countries, currencies, languages, compliance regimes, and trade workflows.

Exit criteria:

- The app supports cross-border quoting, localized UI, multi-currency reporting, and key compliance checks.
- Launch playbook exists for each target region.

### Task Backlog

| ID                   | Task                                | Outcome                                    | Acceptance                                           |
| -------------------- | ----------------------------------- | ------------------------------------------ | ---------------------------------------------------- |
| G8.Locale.001        | Localization framework              | UI/messages in target languages            | EN/VI first; extensible to others                    |
| G8.Locale.002        | Localized error and email templates | Professional user experience               | No hardcoded English-only customer flows             |
| G8.Currency.001      | FX rate service                     | Normalize revenue and quote amounts        | Historical rates stored for audit                    |
| G8.Compliance.001    | HS code assistant                   | Suggest product classification candidates  | AI never gives final legal advice                    |
| G8.Compliance.002    | Sanctions/KYB check integration     | Reduce counterparty risk                   | High-risk matches require review                     |
| G8.Documents.001     | Trade document generation           | Commercial invoice, packing list, proforma | Human review required before external use            |
| G8.Logistics.001     | Shipment tracking integration       | Follow deal after quote                    | Provider-specific reliability and privacy rules      |
| G8.Region.001        | Country launch checklist            | Repeatable expansion process               | Legal, tax, data residency, channel support captured |
| G8.Mobile.001        | Mobile-first field workflow         | Sales can respond on phone                 | Key flows usable on mobile                           |
| G8.Accessibility.001 | Accessibility baseline              | Enterprise procurement friendly            | Keyboard, contrast, semantic structure checked       |

---

## Phase G9: Platform And Ecosystem

Goal: turn TradeOS into the operating layer where service providers, partners, and developers integrate.

Exit criteria:

- External systems can integrate safely through scoped APIs and webhooks.
- Service providers can participate without accessing private tenant data by default.
- Platform revenue streams become possible.

### Task Backlog

| ID                 | Task                             | Outcome                                          | Acceptance                                   |
| ------------------ | -------------------------------- | ------------------------------------------------ | -------------------------------------------- |
| G9.API.001         | Public API design                | Stable integration surface                       | Versioning and auth model documented         |
| G9.API.002         | Scoped API keys                  | Tenant-controlled API access                     | Key creation/rotation audited                |
| G9.Webhooks.001    | Outbound webhooks                | Notify external systems                          | Signing, retry, idempotency included         |
| G9.SDK.001         | TypeScript SDK                   | Faster partner integrations                      | Generated types and examples                 |
| G9.DevPortal.001   | Developer portal                 | External dev onboarding                          | Sandbox and docs available                   |
| G9.Provider.001    | Logistics provider app           | Request/receive rates                            | No unauthorized customer data sharing        |
| G9.Provider.002    | Inspection provider app          | Request inspection quotes                        | Approval-gated external sharing              |
| G9.Provider.003    | Finance/insurance provider pilot | Transaction support                              | Consent, compliance, and audit mandatory     |
| G9.Plugin.001      | AI skill/plugin permission model | Third-party intelligence safely extends platform | Plugin actions are policy-gated              |
| G9.Marketplace.001 | Service marketplace after gate   | Monetize partner services                        | Only after private workflow proof and opt-in |

---

## Phase G10: Trade Intelligence Network

Goal: create defensible intelligence products from opt-in, anonymized, aggregated trade workflow data.

Exit criteria:

- Tenants receive insights they cannot produce alone.
- Data products respect consent, privacy, and opt-out.
- Intelligence revenue can scale beyond seats.

### Task Backlog

| ID                  | Task                               | Outcome                                    | Acceptance                                       |
| ------------------- | ---------------------------------- | ------------------------------------------ | ------------------------------------------------ |
| G10.Data.001        | Consent-aware aggregation pipeline | Safe aggregate market data                 | No tenant-identifiable leakage                   |
| G10.Privacy.001     | Re-identification risk review      | Prevent small-cell privacy leaks           | Minimum cohort thresholds enforced               |
| G10.Benchmark.001   | Price benchmark reports            | Market pricing by product/country          | Source coverage and confidence shown             |
| G10.Forecast.001    | Demand forecasting                 | Predict demand trends                      | Backtesting and confidence intervals             |
| G10.Alert.001       | Market opportunity alerts          | Notify tenants of relevant trends          | User can tune/disable alerts                     |
| G10.Intro.001       | Match scoring engine               | Rank buyer/seller fit                      | Explanation required; approval-gated intro       |
| G10.DataProduct.001 | Intelligence subscription SKU      | Monetize reports                           | Legal/privacy review complete                    |
| G10.Share.001       | Tenant data revenue-share model    | Incentivize opt-in data contribution       | Clear consent and payout logic                   |
| G10.AI.001          | Model improvement loop             | Improve from anonymized aggregate patterns | Tenant private data not leaked into global model |
| G10.Governance.001  | Data governance board process      | Control high-risk data products            | Review checklist and audit trail                 |

---

## 30/60/90-Day Execution Sequence

### First 7 Days

1. Complete all G0 CRITICAL tasks.
2. Add regression tests for every known historical security mistake.
3. Confirm `pnpm build` and relevant package tests pass.
4. Update checkpoint with remaining risks.

### Days 8-30

1. Build Revenue Command Center core: SLA queue, revenue leak detector, funnel metrics.
2. Start Quote-To-Win foundation: incoterms, currency, quote versioning, PDF export.
3. Create paid pilot packaging and onboarding checklist.
4. Run pilot workflow with 1-3 realistic tenant datasets.

### Days 31-60

1. Ship integration setup wizard and health dashboard.
2. Add grounded AI quote drafting and expanded multilingual evals.
3. Add member/association ROI report.
4. Start billing provider integration behind feature flag.

### Days 61-90

1. Run paid pilot with measurable ROI report.
2. Close enterprise trust gaps: MFA UI, custom roles, audit export, retention policy.
3. Add upgrade prompts and gross margin dashboard.
4. Decide next wedge based on pilot evidence: exporter teams, associations, or service providers.

## Priority Rules

If two tasks compete, choose in this order:

1. Fix security/data integrity bugs.
2. Make current pilot workflow produce revenue proof.
3. Reduce operator/customer time-to-value.
4. Improve AI accuracy only when it directly improves workflow or revenue.
5. Add integrations that capture real inbound demand.
6. Add marketplace/network mechanics only after gate metrics are met.

## Do Not Build Yet

Do not build these until the relevant gates are satisfied:

| Feature                         | Wait Until                                                                   |
| ------------------------------- | ---------------------------------------------------------------------------- |
| Public company marketplace      | Manifesto marketplace thresholds met for 4 weeks                             |
| Public reputation scores        | Consent, dispute process, and legal review complete                          |
| Autonomous quote sending        | Strong approval, audit, compliance, and customer trust evidence              |
| Payments/escrow                 | Quote-to-win and trust workflows prove recurring demand                      |
| Data resale                     | Consent-aware aggregation, privacy review, and revenue-share policy complete |
| Broad social/community features | Core revenue workflow is sticky and paid                                     |

## Definition Of Perfect Enough To Scale

TradeOS is ready to scale globally when all are true:

1. A new tenant can connect channels, import catalog, invite team, and process first lead in one day.
2. Every inbound opportunity becomes a measurable workflow object or a clear rejected/noise record.
3. AI improves speed and quality without bypassing policy.
4. The dashboard proves weekly revenue impact in money terms.
5. Every mutation is tenant-scoped, permission-gated, MFA-aware where needed, and audited.
6. The system can recover from webhook, worker, AI provider, and database failure modes using documented runbooks.
7. Pricing maps directly to captured value and usage.
8. Association/network features only expose data by explicit consent.
9. Enterprise buyers can pass security review without custom engineering.
10. The product creates data intelligence that compounds with each tenant while respecting privacy.
