# TradeOS Workflows

## Workflow Principles

1. Store the raw business event before automation.
2. Keep the human-operable workflow visible in the UI.
3. Use registered actions for business mutations.
4. Convert risky automation into approval requests.
5. Record audit logs for important state changes.

## Inbound Buyer Request

```txt
Buyer message arrives
-> verify webhook/session
-> create WebhookEvent
-> find or create Conversation
-> create Message
-> run AI triage
-> create Lead
-> create Follow-up Task
-> optionally draft Quotation
-> update dashboard
-> write audit logs
```

Acceptance:

- original message is preserved
- lead is tenant-scoped
- duplicate inbound event is detected
- AI failure does not lose message
- risky action is not executed

## Manual Lead Capture

```txt
Sales user opens lead form
-> submits customer need
-> API resolves session
-> crm.createLead executes
-> audit log written
-> lead appears in dashboard
```

Acceptance:

- request body cannot set another `organizationId`
- viewer cannot create lead
- lead has source and status

## Lead Qualification

```txt
Sales reviews lead
-> links company/contact
-> adds missing trade fields
-> updates status
-> assigns follow-up task
-> optionally creates deal
```

Acceptance:

- status changes are auditable
- linked records belong to same organization
- stale lead detector can use status and timestamps

## Quotation Draft And Send

```txt
Lead is qualified
-> AI drafts quotation
-> sales edits draft
-> admin reviews terms
-> approval request created for send
-> owner/admin approves
-> approved request executes trade.sendQuotation
-> quotation status becomes SENT
-> audit logs record approval and execution
```

Acceptance:

- AI can draft only
- AI cannot send without approval
- quotation send action is high-risk
- approval request stores action input
- execution uses `approved=true` context

## Partner Suggestion

```txt
User or AI identifies partner need
-> trade.suggestPartner searches tenant-approved companies
-> suggestions include reason fields when available
-> user chooses next step manually
```

Acceptance:

- no cross-tenant data leakage
- suggestions are explainable
- marketplace-style external matching is not introduced without opt-in model

## Approval Lifecycle

```txt
Risky action proposed
-> ApprovalRequest PENDING
-> owner/admin reviews
-> APPROVED or REJECTED
-> approved request can be EXECUTED
-> execution success stores result
-> execution failure stores failure
```

Acceptance:

- only owner/admin can approve high-risk actions
- rejected request cannot execute
- non-approved request cannot execute
- result is stored and audit-visible

## Association Weekly Report

```txt
Scheduled report period closes
-> aggregate member activity
-> calculate inbound volume, response speed, quotes, stale leads
-> summarize product/country demand
-> draft association report
-> human reviews report
-> optional approved distribution
```

Acceptance:

- tenant privacy rules are respected
- member-level details are shown only to authorized association operator
- report snapshot is reproducible or stored
- bulk send is approval-gated

## Webhook Failure And Retry

```txt
Webhook received
-> event stored as RECEIVED
-> processing fails
-> event marked FAILED with error
-> operator opens Webhook Events page
-> operator retries after fix
-> event marked PROCESSED or FAILED again
```

Acceptance:

- failure does not disappear
- retry is idempotent
- duplicate replay does not duplicate lead/message

## Tenant Onboarding

```txt
Admin creates Organization
-> maps User email to organization and role
-> user logs in through Supabase
-> session resolver loads tenant context
-> user sees empty dashboard or seed data
```

Acceptance:

- production login does not rely on demo auth
- unmapped users land on pending onboarding screen
- role is enforced by policy

## Rollback Workflow

Prefer disabling behavior through:

- environment flags
- role/policy gates
- webhook provider disablement
- Vercel deployment rollback
- queue pause
- Cloudflare route/rate-limit changes

Do not rollback by deleting tenant data.
