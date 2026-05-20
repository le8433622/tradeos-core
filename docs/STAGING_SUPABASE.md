# TradeOS Core Staging — Supabase

## Project

```txt
Organization: TradeOS AI
Project: TradeOS Core Staging
Project ref: ulnjanlaehfmxurreibj
Region: ap-southeast-2
Status: ACTIVE_HEALTHY
Database host: db.ulnjanlaehfmxurreibj.supabase.co
Supabase URL: https://ulnjanlaehfmxurreibj.supabase.co
```

## Publishable Keys

Use the modern publishable key for frontend/browser clients:

```env
NEXT_PUBLIC_SUPABASE_URL="https://ulnjanlaehfmxurreibj.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_l4cna-BDSGbrrvIObSBmAg_H5egBYE6"
```

The legacy anon key also exists in Supabase, but prefer the modern publishable key for new client work.

## Server Environment Variables

Set these in local `.env` and Vercel environment variables:

```env
DATABASE_URL="postgresql://postgres.ulnjanlaehfmxurreibj:<DB_PASSWORD>@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.ulnjanlaehfmxurreibj:<DB_PASSWORD>@db.ulnjanlaehfmxurreibj.supabase.co:5432/postgres"
APP_URL="http://localhost:3000"
JWT_SECRET="replace-with-strong-secret"
WEBHOOK_SECRET="replace-with-strong-webhook-secret"
```

Do not commit real DB passwords.

## Database Status

Applied:

1. TradeOS core schema
2. Demo seed data
3. Tenant RLS policies
4. Webhook event log schema
5. Security hardening for `public.rls_auto_enable()`

Security advisors: clean at time of setup.

## Demo Tenant

```txt
Organization ID: demo-org
User: owner@tradeos.local
Role: OWNER
```

## Required Before Production

1. Replace demo auth with Supabase Auth bearer token resolver.
2. Map Supabase Auth users to `User.email`.
3. Remove demo fallback in production.
4. Rotate DB password if it was ever shared in chat or logs.
5. Set Vercel env variables.
6. Test webhook secret in deployed environment.
