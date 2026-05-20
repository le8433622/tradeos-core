# Deployment Guide — Supabase + Vercel

## 1. Supabase

Create a Supabase project and copy the database connection strings.

Use Supabase project settings:

- Connection string for pooled app access
- Direct connection string for migrations

Set local `.env`:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
JWT_SECRET="change-me"
APP_URL="http://localhost:3000"
```

Then run:

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm --filter @tradeos/database db:seed
```

## 2. Vercel

Import the GitHub repo into Vercel.

Recommended settings:

```txt
Framework Preset: Next.js
Root Directory: apps/web
Install Command: pnpm install
Build Command: pnpm --filter @tradeos/web build
Output Directory: .next
```

Environment variables on Vercel:

```env
DATABASE_URL="Supabase pooled connection string"
DIRECT_URL="Supabase direct connection string"
JWT_SECRET="strong-production-secret"
APP_URL="https://your-vercel-domain.vercel.app"
OPENAI_API_KEY="optional"
OPENROUTER_API_KEY="optional"
REDIS_URL="optional"
```

## 3. Production Migration

Before first deploy:

```bash
pnpm db:generate
pnpm db:migrate
```

For production, prefer controlled migrations from local or CI, not from runtime serverless functions.

## 4. Current Demo Tenant

The MVP currently uses:

```txt
organizationId = demo-org
```

Before production multi-tenant rollout, replace hard-coded `demo-org` with authenticated organization context.

## 5. Next Production Hardening

1. Add authentication.
2. Replace demo organization with real tenant resolver.
3. Add role-based middleware.
4. Write audit logs inside `executeAction`.
5. Add approval queue for high-risk AI actions.
6. Add Zalo/WhatsApp/email webhook adapters.
