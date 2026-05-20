# Vercel Deploy Guide

## Current Vercel Status

Project exists on Vercel:

```txt
Project: tradeos-core
Project ID: prj_3b4Eg8YpEvztpNpCxRMm2sgj8utj
Team: earthkingdomuniverse-6943's projects
Team ID: team_9qCkAgCiWrexEBm3eo20Yr5V
```

First deployment failed during `pnpm install` with registry metadata error:

```txt
ERR_PNPM_META_FETCH_FAIL
ERR_INVALID_THIS
```

Fix applied in repo:

```txt
Node pinned to 20.x
pnpm pinned to 10.11.0
```

## Recommended Import Settings

Import GitHub repo:

```txt
le8433622/tradeos-core
```

Use these settings:

```txt
Framework Preset: Next.js
Root Directory: .
Install Command: pnpm install
Build Command: pnpm --filter @tradeos/web build
Output Directory: apps/web/.next
```

The repo includes root `vercel.json`:

```json
{
  "buildCommand": "pnpm --filter @tradeos/web build",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "outputDirectory": "apps/web/.next"
}
```

## Required Environment Variables

Production/Preview env:

```env
DATABASE_URL="postgresql://postgres.ulnjanlaehfmxurreibj:<DB_PASSWORD>@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.ulnjanlaehfmxurreibj:<DB_PASSWORD>@db.ulnjanlaehfmxurreibj.supabase.co:5432/postgres"

NEXT_PUBLIC_SUPABASE_URL="https://ulnjanlaehfmxurreibj.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_l4cna-BDSGbrrvIObSBmAg_H5egBYE6"
SUPABASE_URL="https://ulnjanlaehfmxurreibj.supabase.co"
SUPABASE_PUBLISHABLE_KEY="sb_publishable_l4cna-BDSGbrrvIObSBmAg_H5egBYE6"

ALLOW_DEMO_AUTH="false"
WEBHOOK_SECRET="replace-with-strong-secret"
APP_URL="https://your-vercel-domain.vercel.app"
JWT_SECRET="replace-with-strong-secret"
OPENAI_API_KEY="optional"
OPENROUTER_API_KEY="optional"
REDIS_URL="optional"
```

## Local Test Before Import

```bash
pnpm install
pnpm db:generate
pnpm --filter @tradeos/web build
```

## Redeploy After Fix

In Vercel:

```txt
Project -> Deployments -> failed deployment -> Redeploy
```

If it fails again, inspect build logs and fix the next real error.

## After Deploy

Test these routes:

```txt
/login
/
/leads
/api/health
/api/webhooks/inbox
```

## Important

Production must not use demo auth:

```env
ALLOW_DEMO_AUTH="false"
```

If a signed-in user reaches `/onboarding/pending`, map their Supabase Auth email to the TradeOS `User` table.
