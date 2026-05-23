# TradeOS Core Staging — Supabase

## Project

```
Organization: TradeOS AI
Project: TradeOS Core Staging
Project ref: ulnjanlaehfmxurreibj
Region: ap-southeast-2
Status: ACTIVE_HEALTHY
Database host: db.ulnjanlaehfmxurreibj.supabase.co
Pooler host: aws-0-ap-southeast-2.pooler.supabase.com
Supabase URL: https://ulnjanlaehfmxurreibj.supabase.co
```

## Publishable Keys

Use the modern publishable key for frontend/browser clients:

```env
NEXT_PUBLIC_SUPABASE_URL="https://ulnjanlaehfmxurreibj.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_l4cna-BDSGbrrvIObSBmAg_H5egBYE6"
```

The legacy anon key also exists but prefer the modern publishable key.

## Server Environment Variables

Set these in local `.env`, Vercel preview, and Vercel staging environments:

```env
DATABASE_URL="postgresql://postgres.ulnjanlaehfmxurreibj:<DB_PASSWORD>@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.ulnjanlaehfmxurreibj:<DB_PASSWORD>@db.ulnjanlaehfmxurreibj.supabase.co:5432/postgres"
APP_URL="http://localhost:3000"
JWT_SECRET="replace-with-strong-secret"
WEBHOOK_SECRET="replace-with-strong-webhook-secret"
```

**Do not commit real DB passwords.**

## Database Status

Applied:

1. TradeOS core schema
2. Demo seed data
3. Tenant RLS policies
4. Webhook event log schema
5. Security hardening for `public.rls_auto_enable()`
6. Job queue schema
7. AiUsageEvent and AiMonthlyBudget schema
8. IntroductionRequest schema and opt-in fields
9. WebhookIntegration registry
10. OrganizationMember + Role + Permission + Invitation (Phase 18)

Security advisors: clean at time of setup.

## Demo Tenant

```
Organization ID: demo-org
User: owner@tradeos.local
Role: OWNER (via OrganizationMember)
```

## Migration Safety

Before any migration:

1. Confirm this is the STAGING project, not production
2. Read the migration SQL
3. Test on local DB first
4. Have rollback SQL ready

## Required Before Production

1. Replace demo auth with Supabase Auth bearer token resolver
2. Map Supabase Auth users to `User.email` (via OrganizationMember)
3. Remove demo fallback in production: `ALLOW_DEMO_AUTH=false`
4. Rotate DB password if ever shared in chat or logs
5. Set Vercel env variables per environment (preview/staging/production)
6. Test webhook secret in deployed environment
7. Verify ALLOW_DEMO_AUTH=false in production env
8. Take Supabase backup before production migration
