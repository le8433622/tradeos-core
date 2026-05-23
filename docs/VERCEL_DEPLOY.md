# Vercel Deploy Guide

## Current Vercel Status

```
Project: tradeos-core
Project ID: prj_3b4Eg8YpEvztpNpCxRMm2sgj8utj
Team: earthkingdomuniverse-6943's projects
Team ID: team_9qCkAgCiWrexEBm3eo20Yr5V
```

First deployment failed during `pnpm install` with `ERR_PNPM_META_FETCH_FAIL` / `ERR_INVALID_THIS`. Fixes applied:

- Node pinned to 20.x (via `engines` in `package.json`)
- pnpm pinned to 10.11.0 (via `packageManager` in `package.json`)

## Recommended Import Settings

```
Framework Preset: Next.js
Root Directory: .
Install Command: pnpm install
Build Command: pnpm db:generate && pnpm --filter @tradeos/web build
Output Directory: apps/web/.next
```

The repo includes root `vercel.json` with these settings.

## Required Environment Variables

### Preview (uses staging Supabase, demo auth enabled)

```env
DATABASE_URL="<staging-pooler-url>?pgbouncer=true"
DIRECT_URL="<staging-direct-url>"
NEXT_PUBLIC_SUPABASE_URL="https://<staging-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="<staging-key>"
SUPABASE_URL="https://<staging-ref>.supabase.co"
SUPABASE_PUBLISHABLE_KEY="<staging-key>"
ALLOW_DEMO_AUTH="true"
APP_URL="<preview-url>"
JWT_SECRET="<strong-secret>"
WEBHOOK_SECRET="<webhook-secret>"
WEBHOOK_ENCRYPTION_KEY="<aes-key>"
HEALTHCHECK_SECRET="<ops-secret>"
```

### Staging (uses staging Supabase, demo auth disabled)

```env
# Same as preview except:
ALLOW_DEMO_AUTH="false"
APP_URL="<staging-url>"
```

### Production (uses production Supabase, demo auth disabled)

```env
# Different DATABASE_URL + DIRECT_URL pointing to production project
ALLOW_DEMO_AUTH="false"
APP_URL="<production-url>"
```

## Local Test Before Deploy

```bash
pnpm install
pnpm db:generate
pnpm --filter @tradeos/web build
```

## Redeploy

In Vercel: Project → Deployments → failed deployment → Redeploy

## Post-Deploy Verification

Must verify these routes:

| Route                 | Expected                                                  |
| --------------------- | --------------------------------------------------------- |
| `/api/health`         | 200 OK                                                    |
| `/api/health/deep`    | 200 with component status (requires `HEALTHCHECK_SECRET`) |
| `/login`              | Renders login page                                        |
| `/`                   | Dashboard (with valid session)                            |
| `/leads`              | Leads list (with valid session)                           |
| `/api/webhooks/inbox` | Webhook processing (with valid signature)                 |

## Important

- Production must NOT use demo auth: `ALLOW_DEMO_AUTH="false"`
- If a signed-in user reaches `/onboarding/pending`, map their Supabase Auth email to the TradeOS `User` table (via OrganizationMember)
- Never commit real secret values in code or docs
- Use three separate Vercel environments: Preview, Staging, Production
