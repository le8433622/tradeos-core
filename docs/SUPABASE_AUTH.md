# Supabase Auth + TradeOS Tenant Resolver

## Current Auth Model

TradeOS supports two auth modes:

1. Supabase Auth bearer token mode
2. Demo fallback mode for local development

Production must use Supabase Auth and set:

```env
ALLOW_DEMO_AUTH="false"
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL="https://ulnjanlaehfmxurreibj.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_l4cna-BDSGbrrvIObSBmAg_H5egBYE6"
SUPABASE_URL="https://ulnjanlaehfmxurreibj.supabase.co"
SUPABASE_PUBLISHABLE_KEY="sb_publishable_l4cna-BDSGbrrvIObSBmAg_H5egBYE6"
ALLOW_DEMO_AUTH="false"
```

## Request Flow

```txt
Authorization: Bearer <supabase_access_token>
  -> Supabase auth.getUser(token)
  -> user.email
  -> Prisma User.email
  -> organizationId + role
  -> tenant-scoped API execution
```

## User Mapping Requirement

Every Supabase Auth user must have a matching row in the TradeOS `User` table:

```txt
User.email = Supabase Auth user email
User.organizationId = tenant organization
User.role = OWNER | ADMIN | SALES | OPERATOR | VIEWER
```

If a Supabase user signs in but does not exist in `User`, API returns:

```txt
USER_NOT_MAPPED_TO_TENANT
```

## Local Development

For local dev only:

```env
ALLOW_DEMO_AUTH="true"
```

This enables fallback to:

```txt
demo-org
owner@tradeos.local
OWNER
```

## Production Rule

Do not deploy production with demo auth enabled.

Required Vercel settings:

```env
ALLOW_DEMO_AUTH="false"
WEBHOOK_SECRET="strong-secret"
DATABASE_URL="Supabase pooled connection string"
DIRECT_URL="Supabase direct connection string"
```

## API Routes Updated

The following routes use `requireSessionFromRequest(request)`:

```txt
/api/agent
/api/webhooks/inbox
/api/webhooks/zalo
/api/webhooks/whatsapp
/api/webhooks/email
```

## Next Steps

1. Build login UI.
2. Add protected app shell.
3. Add invite user flow.
4. Add onboarding flow to create Organization + User after first login.
5. Remove demo fallback from all production paths.
