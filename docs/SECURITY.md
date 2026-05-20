# TradeOS Security

## Core Security Rule

AI is not an admin. AI is an operator that must pass through policy.

## Tenant Isolation

Every business object must carry `organizationId` where applicable.

Required production checks:

- API middleware validates session
- API middleware validates organization access
- Prisma queries always scope by organizationId
- Admin actions require owner/admin role

## AI Safety Gates

AI can suggest and draft. AI cannot finalize high-risk trade decisions.

Human approval required for:

- sending quotation
- bulk messaging
- payment status changes
- contract approval
- user permission changes
- destructive deletes

## Audit Log

Every registered action should write:

- organizationId
- actorUserId
- actionName
- riskLevel
- input
- result
- approved
- timestamp

## Data Privacy

- Do not store raw secrets in database
- Use environment variables for API keys
- Mask sensitive payment data
- Encrypt tokens at rest in production
- Separate customer data by tenant
