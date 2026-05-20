# Protected App Shell

## Added

```txt
apps/web/lib/supabase-server.ts
apps/web/lib/page-session.ts
apps/web/middleware.ts
apps/web/app/onboarding/pending/page.tsx
```

## Purpose

Server-rendered dashboard pages can now read Supabase session cookies and resolve the TradeOS tenant.

## Flow

```txt
Browser login
  -> Supabase cookie session
  -> middleware refreshes session
  -> requirePageSession()
  -> Supabase user email
  -> User.email mapping in Prisma
  -> organizationId + role
  -> tenant-scoped dashboard
```

## Pending Tenant Mapping

If a Supabase user is authenticated but has no matching TradeOS `User.email`, dashboard redirects to:

```txt
/onboarding/pending
```

## Production Rule

Set this on Vercel production:

```env
ALLOW_DEMO_AUTH="false"
```

## Current Status

The root dashboard `/` uses `requirePageSession()`.

Next pages to convert:

```txt
/leads
/companies
/conversations
/quotations
/notifications
/approvals
/webhook-events
/audit-logs
```

Until converted, some child pages may still use demo tenant directly.
