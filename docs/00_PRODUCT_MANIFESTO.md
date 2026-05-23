# TradeOS Product Manifesto

## North Star

TradeOS turns international trade relationships into measurable, auditable, executable workflows.

## Product Thesis

International trade teams do not first need another marketplace. They need a reliable operating system for work that already happens across inboxes, messaging apps, sales teams, associations, logistics partners, and quotation workflows.

TradeOS should win by becoming the system of record and system of action for trade relationships before expanding into marketplace matching.

## Core Promise

No valuable trade opportunity should be missed. Every inbound message should become one or more of these objects:

- a conversation
- a message
- a lead
- a follow-up task
- a quotation draft
- an approval request
- a partner suggestion
- an insight for reporting

## Target Users

### Exporter Or Importer Sales Team

Needs:

- capture trade opportunities from many channels
- respond quickly
- draft accurate quotations
- track companies, contacts, deals, and follow-ups
- reduce missed opportunities

Success metrics:

- median first response time
- follow-up completion rate
- quotation volume
- quote-to-win conversion
- stale lead reduction

### Trade Association Operator

Needs:

- onboard member businesses
- monitor inbound opportunities
- broadcast vetted opportunities
- report engagement and revenue potential
- identify market demand trends

Success metrics:

- active member organizations
- weekly inbound opportunity volume
- member response speed
- qualified introductions
- weekly report usefulness

### Trade Service Partner

Needs:

- receive relevant requests
- respond with services or rates
- track operational handoff
- prove service performance

Success metrics:

- partner match acceptance
- service response speed
- fulfilled service requests
- repeat partner usage

## What We Are Building

TradeOS is an AI-assisted operating layer for:

- AI inbox triage
- CRM and relationship tracking
- follow-up execution
- quotation drafting and review
- approval-gated risky actions
- webhook and integration ingestion
- association-level reporting
- trade intelligence derived from private workflow data

## What We Are Not Building Yet

TradeOS is not yet:

- a public marketplace
- a generic CRM clone
- an autonomous AI sales agent that can act without policy
- a payment rail
- a contract-signing system
- a public company directory
- a data resale platform

## Product Principles

1. Manual workflow is the source of truth.
2. AI assists, drafts, extracts, summarizes, and suggests.
3. Humans approve risky actions.
4. Every tenant owns its data boundary.
5. Every important mutation is auditable.
6. Marketplace comes after private workflow data proves repeated demand.
7. Trust is more important than automation speed.
8. Reporting must show measurable trade value every week.

## MVP Wedge

Start with a private operating system for 3-5 pilot businesses inside one trade association.

The MVP must improve:

- inbound opportunity capture
- response speed
- follow-up consistency
- quotation drafting
- association visibility
- auditability

The MVP must not spend core build time on:

- public marketplace liquidity
- public profile SEO
- payments
- complex public matching
- broad social features

## Marketplace Gate

Marketplace features (public company directory, cross-tenant matching, public search, data resale) must not be built until ALL of the following thresholds are met:

### Evidence Thresholds

| Metric                       | Threshold                                                                   | Rationale                                        |
| ---------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------ |
| Active organizations         | ≥ 50 with ≥ 1 inbound message in 30 days                                    | Prove multi-tenant adoption beyond pilot         |
| Inbound messages/month       | ≥ 5,000                                                                     | Prove enough transaction volume to infer demand  |
| Leads with matched need      | ≥ 200 with `need` field non-empty                                           | Prove enough structured demand data              |
| Quotations drafted/month     | ≥ 100                                                                       | Prove quotation workflow is active               |
| Repeat matching pattern      | ≥ 10 cases where seller product category matches buyer need within same org | Prove natural matching exists                    |
| Association operator request | Formal request from ≥ 2 association operators                               | Prove pull from operators, not just product team |

### Opt-In Requirement

- No data is publicly visible by default.
- Each tenant must explicitly opt in for any public listing or cross-tenant matching.
- Opt-in must be revocable (opt out at any time).
- Opt-in/opt-out changes must be recorded in audit log.

### Opt-In Data Sharing Model

**Scope of shared data.** When a tenant opts in, they choose which data categories to expose:

| Category        | Example data                                                 | Default                  |
| --------------- | ------------------------------------------------------------ | ------------------------ |
| Company profile | Name, industry, country, products, certifications, MOQ range | Private                  |
| Demand signals  | Aggregated product categories buyer is seeking               | Private (aggregate only) |
| Supply signals  | Aggregated product categories seller offers                  | Private (aggregate only) |
| Contact details | Email, phone, address                                        | Always private           |
| Workflow data   | Leads, quotations, conversations, tasks                      | Always private           |

**Opt-in levels:**

1. **Aggregate only (default).** The tenant's data contributes to anonymous market demand/supply summaries (e.g., "5 buyers seeking rice this week"). No tenant-identifiable data is shared.
2. **Profile visible.** Company name, industry, country, and product catalog are visible to other opted-in tenants. Contact details remain hidden. Introductions go through association operator.
3. **Introduction ready.** Association operator can propose introductions between matched tenants. No direct contact sharing; operator mediates first contact.

**Consent recording.** Every opt-in or opt-out change must:

- Be performed by an OWNER or ADMIN of the tenant.
- Be recorded in the audit log with the previous and new consent level.
- Include a timestamp and the acting user's ID.

**Data removal on opt-out.** When a tenant opts out from any level back to aggregate-only:

- Their profile is removed from any public or cross-tenant views within 1 hour.
- Existing introduction requests involving the tenant may complete but no new ones are created.
- Aggregated historical data that was already anonymized may be retained for reporting.

### Approval-Gated Introduction

- The first marketplace introduction flow (matching one tenant's demand to another tenant's supply) must be approval-gated.
- No direct peer-to-peer contact without human approval.
- An association operator must review and approve each introduction.
- Introduction approvals must be logged and auditable.

### Measurement

Track weekly against thresholds in the scorecard. Publish status to the roadmap. Do not begin marketplace engineering until thresholds are met for 4 consecutive weeks.

## Product Scorecard

Track weekly:

- active organizations
- inbound messages
- leads created
- median first response time
- follow-up completion rate
- quotations drafted
- quotations sent
- approvals pending
- deals won or lost
- webhook failures
- AI action block rate
- stale opportunities
- top requested product categories
- top requested countries or markets
