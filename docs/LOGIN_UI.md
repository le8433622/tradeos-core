# Login UI

## Added

```txt
apps/web/lib/supabase-browser.ts
apps/web/app/login/page.tsx
apps/web/app/auth/callback/page.tsx
apps/web/components/sign-out-button.tsx
```

## Flow

```txt
/login
  -> email magic link
  -> Supabase sends link
  -> /auth/callback
  -> redirect to dashboard
```

## Tenant Mapping

A signed-in Supabase Auth user must have a row in the public `User` table:

```txt
User.email = Supabase Auth email
User.organizationId = tenant organization
User.role = OWNER | ADMIN | SALES | OPERATOR | VIEWER
```

For the seeded demo tenant:

```txt
Organization: demo-org
User email: owner@tradeos.local
Role: OWNER
```

## Production Required

Set:

```env
ALLOW_DEMO_AUTH="false"
```

## Current Limitation

The dashboard server pages still use the demo session helper for browser-rendered pages. API routes already support real bearer-token session resolution.

Next step: add middleware/cookie-based Supabase server session so protected dashboard pages can read the signed-in session directly.
