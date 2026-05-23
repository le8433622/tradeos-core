# TradeOS Product Framework

## North Star

TradeOS turns international trade conversations into structured data, trusted workflows, AI-assisted execution, and measurable revenue.

## Product Thesis

International trade teams do not first need another marketplace. They need a reliable operating system for the work that already happens across inboxes, messaging apps, sales teams, associations, logistics partners, and quotation workflows.

TradeOS should win by becoming the system of record and system of action for trade relationships before expanding into marketplace matching.

## Target Users

### Trade Association Operator

Needs:

- onboard member businesses
- monitor inbound opportunities
- broadcast vetted opportunities
- report member engagement and revenue potential

Success metrics:

- active members
- response speed
- weekly opportunity volume
- quotation volume
- qualified introductions

### Exporter Or Importer Sales Team

Needs:

- capture leads from multiple channels
- follow up quickly
- draft quotations
- track companies, contacts, and deals
- avoid missed opportunities

Success metrics:

- lead response time
- follow-up completion rate
- quote conversion
- won revenue
- stale lead reduction

### Trade Service Partner

Needs:

- receive relevant trade requests
- respond with services or rates
- track operational handoff

Success metrics:

- partner match acceptance
- service response speed
- fulfilled requests

## Product Layers

1. Identity and tenant layer: organizations, users, roles, sessions.
2. Data layer: companies, contacts, leads, products, deals, quotations, conversations, messages.
3. Workflow layer: tasks, approvals, audit logs, webhook events.
4. Agent layer: inbox triage, follow-up, draft quotation, partner suggestion.
5. Integration layer: web, email, Zalo, WhatsApp, manual intake.
6. Intelligence layer: summaries, scoring, analytics, recommendations.

## MVP Wedge

Start with a private operating system for 3-5 pilot businesses inside a trade association.

Build only what improves:

- capturing inbound opportunities,
- response speed,
- follow-up consistency,
- quotation drafting,
- association visibility,
- and auditability.

Do not build marketplace liquidity, public profiles, payment rails, or complex matching until the private CRM data shows repeated demand.

## Core Workflow

```txt
Inbound message
  -> conversation/message record
  -> agent plan
  -> registered action
  -> policy decision
  -> audit log
  -> database mutation
  -> dashboard update
  -> optional approval queue
```

## Trust Model

TradeOS must be trusted before it is intelligent.

Required trust properties:

- every customer object belongs to one organization,
- every mutation has an actor/source,
- AI cannot execute high-risk actions without approval,
- webhook ingestion is idempotent,
- secrets are never committed,
- production auth cannot rely on demo fallback.

## Commercial Packaging

Phase 1:

- pilot setup fee
- monthly SaaS per business
- association dashboard fee

Phase 2:

- AI usage tiers
- integration setup packages
- trade intelligence reports

Phase 3:

- partner matching fee
- marketplace transaction or introduction fee

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
- deals won/lost
- webhook failures
- AI action block rate
