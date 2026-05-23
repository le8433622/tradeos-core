# TradeOS Roadmap

## Roadmap Rule

Do not build marketplace functionality until private workflow data proves repeated buyer/seller matching demand.

## Phase 0: Documentation Operating System

Goal: give AI coding agents a complete execution map.

Deliverables:

- product manifesto
- architecture contract
- domain model contract
- database contract
- action registry contract
- AI agent contract
- security and tenancy contract
- API contract
- workflow docs
- testing strategy
- deployment runbook
- task plan
- checkpoint log
- ADRs

Exit criteria:

- agent can identify what to build next
- agent can identify forbidden actions
- agent can verify work before reporting done

## Phase 1: Foundation Hardening

Goal: make the existing MVP safe to demo with real pilot data.

Deliverables:

- tenant session hardening
- no production hardcoded `demo-org`
- policy-core tests
- auth tests
- clearer empty/error states
- seed data for realistic trade workflows
- CI workflow

Exit criteria:

- build passes in CI
- production env checklist is complete
- demo auth disabled in production
- first tenant can log in and view dashboard

## Phase 2: Pilot Operating System

Goal: support 3-5 businesses inside one trade association.

Deliverables:

- organization onboarding flow
- user invite and role assignment
- lead detail and edit views
- company/contact detail views
- conversation detail timeline
- task due dates and owner assignment
- quotation draft/detail/review views
- approval request queue
- audit filters

Exit criteria:

- association operator can onboard pilot members
- sales user can process inbound leads
- admin can approve high-risk actions
- audit trail explains every important mutation

## Phase 3: AI Inbox

Goal: convert messy inbound trade messages into structured work.

Deliverables:

- structured LLM output
- confidence score
- missing field extraction
- bilingual fixtures
- duplicate detection
- lead/company matching
- follow-up suggestion
- quotation draft suggestion
- safe fallback when AI provider fails

Exit criteria:

- p95 triage latency under 4 seconds
- no direct AI database writes
- high-risk steps become approval requests
- false-positive lead creation rate is measured

## Phase 4: Integrations

Goal: make TradeOS useful where trade teams already work.

Deliverables:

- signed Zalo webhook adapter
- signed WhatsApp webhook adapter
- email inbound adapter
- manual inbox entry
- webhook replay protection
- provider health dashboard
- retry failed webhook
- Cloudflare WAF/rate-limit plan

Exit criteria:

- every inbound event has idempotency
- failed events can be inspected and retried
- public routes have documented abuse controls

## Phase 5: Trade Intelligence

Goal: turn operational data into revenue insight.

Deliverables:

- weekly association report
- stale opportunity detector
- response speed dashboard
- quotation conversion dashboard
- partner matching history
- product demand summary
- country/industry trend summary

Exit criteria:

- association can see measurable member value weekly
- businesses can identify missed revenue
- matching demand is evidence-backed

## Phase 6: Marketplace Readiness

Goal: decide whether marketplace expansion is justified.

Deliverables:

- [x] matching evidence threshold defined (see product manifesto)
- [x] opt-in model required
- [x] approval-gated introduction flow required
- [x] public/private profile boundary
- [x] opt-in data sharing model
- [ ] partner introduction workflow (implementation)
- [ ] monetization trigger
- [ ] dispute and trust process

Exit criteria:

- marketplace scope is backed by usage data
- privacy and consent model is documented
- introduction workflow is approval-gated
