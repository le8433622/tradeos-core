# Vercel Deploy Guide

## Current Vercel Status

The Vercel connector can list teams/projects but cannot import this GitHub repo directly. It returned the instruction to use Vercel CLI or Git Integration.

Current team:

```txt
Team: earthkingdomuniverse-6943's projects
Team ID: team_9qCkAgCiWrexEBm3eo20Yr5V
Projects: none at time of setup
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
