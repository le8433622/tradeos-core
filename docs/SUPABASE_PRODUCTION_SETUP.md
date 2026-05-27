# Supabase Production Project Setup

**Date**: 2026-05-27
**Status**: Plan — NOT YET EXECUTED
**Prerequisite**: Supabase team access (existing team `earthkingdomuniverse-6943`)

## Goal

Create a clean Supabase production project, apply all 12 Prisma migrations, wire Vercel production to it, and keep staging for E2E/QA only.

## Current State

```
Vercel Production (tradeos-core.vercel.app)
  └── DATABASE_URL → staging DB (ulnjanlaehfmxurreibj)  ❌ HIGH RISK

Vercel Preview (PR deploys)
  └── DATABASE_URL → staging DB (ulnjanlaehfmxurreibj)  ✅ acceptable

Local Dev
  └── DATABASE_URL → staging DB (ulnjanlaehfmxurreibj)  ✅ acceptable
```

## Target State

```
Vercel Production (tradeos-core.vercel.app)
  └── DATABASE_URL → prod DB (<production-ref>)          ✅ isolated

Vercel Preview (PR deploys)
  └── DATABASE_URL → staging DB (ulnjanlaehfmxurreibj)   ✅

Local Dev
  └── DATABASE_URL → staging DB (ulnjanlaehfmxurreibj)   ✅
```

## Migration Steps

### Step 1: Create Supabase Production Project

**Action**: Create new Supabase project via Dashboard or CLI.

**Requirements**:

- Project name: `tradeos-core-prod`
- Region: `ap-southeast-2` (Sydney — same as staging)
- Plan: Pro (or Team, depending on anticipated volume)
- Password: generate strong random password, store in 1Password

**Output** (save to 1Password `TradeOS Core Engineering`):

- Project ref: `xxxxxxxxxxxxxxxxxx` (placeholder)
- Database host: `db.xxxxxxxxxxxxxxxxxx.supabase.co`
- Supabase URL: `https://xxxxxxxxxxxxxxxxxx.supabase.co`
- Anon key (publishable): `sb_pu_...`
- Service role key: `sb_sr_...`
- DB password (postgres role)

### Step 2: Apply Migrations

Run against the production database URL (direct connection, NOT pooled):

```bash
# 2a. Set DATABASE_URL to production direct connection
export DATABASE_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres"

# 2b. Apply all 12 migrations
cd packages/database && npx prisma migrate deploy

# 2c. Verify migration history
npx prisma migrate status
```

Expected: all 12 migrations marked as `Applied` (not `Pending`).

**Do NOT run `prisma migrate dev`** — `dev` creates shadow DB and is for dev only.
**Do NOT run `prisma db seed`** — no seed data on production.

### Step 3: Generate Env Values for Production

| Variable                               | Source                                                            | Notes                                  |
| -------------------------------------- | ----------------------------------------------------------------- | -------------------------------------- |
| `DATABASE_URL`                         | Supabase Project Settings → Database → Connection string (Pooled) | Append `?pgbouncer=true`               |
| `DIRECT_URL`                           | Supabase Project Settings → Database → Connection string (Direct) | No connection pooler                   |
| `NEXT_PUBLIC_SUPABASE_URL`             | `https://<ref>.supabase.co`                                       | Public — visible to browser            |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase Project Settings → API → Anon key                        | Public — visible to browser            |
| `SUPABASE_URL`                         | Same as `NEXT_PUBLIC_SUPABASE_URL`                                | Server-side                            |
| `SUPABASE_PUBLISHABLE_KEY`             | Same as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`                    | Server-side                            |
| `SUPABASE_SERVICE_ROLE_KEY`            | Supabase Project Settings → API → service_role key                | **KEEP SECRET** — never in client      |
| `JWT_SECRET`                           | Generate new: `openssl rand -base64 32`                           | Must match Supabase Project JWT secret |
| `WEBHOOK_SECRET`                       | Generate new: `openssl rand -base64 32`                           |                                        |
| `WEBHOOK_ENCRYPTION_KEY`               | Generate new: `openssl rand -base64 32`                           |                                        |
| `ALLOW_DEMO_AUTH`                      | `false`                                                           |                                        |
| `APP_URL`                              | `https://tradeos-core.vercel.app`                                 |                                        |
| `E2E_RUN_ENABLED`                      | (do not set on production)                                        |                                        |

**JWT_SECRET sync**: The Supabase project uses a default auto-generated JWT secret. For production, either:

1. Use the auto-generated secret from Supabase Dashboard → Settings → API → JWT Secret, OR
2. Set a custom JWT secret in both Supabase Dashboard AND Vercel env (must match)

### Step 4: Wire Vercel Production Environment

Using Vercel CLI:

```bash
# Switch production env vars one at a time
vercel env rm DATABASE_URL production --yes
vercel env add DATABASE_URL production <<< "postgresql://postgres.<ref>:<password>@<host>:6543/postgres?pgbouncer=true"

vercel env rm DIRECT_URL production --yes
vercel env add DIRECT_URL production <<< "postgresql://postgres.<ref>:<password>@<host>:5432/postgres"

vercel env rm NEXT_PUBLIC_SUPABASE_URL production --yes
vercel env add NEXT_PUBLIC_SUPABASE_URL production <<< "https://<ref>.supabase.co"

vercel env rm NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production --yes
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production <<< "<anon-key>"

vercel env rm SUPABASE_URL production --yes
vercel env add SUPABASE_URL production <<< "https://<ref>.supabase.co"

vercel env rm SUPABASE_PUBLISHABLE_KEY production --yes
vercel env add SUPABASE_PUBLISHABLE_KEY production <<< "<anon-key>"

vercel env rm SUPABASE_SERVICE_ROLE_KEY production --yes
vercel env add SUPABASE_SERVICE_ROLE_KEY production <<< "<service-role-key>"

vercel env rm JWT_SECRET production --yes
vercel env add JWT_SECRET production <<< "<new-jwt-secret>"

vercel env rm WEBHOOK_SECRET production --yes
vercel env add WEBHOOK_SECRET production <<< "<new-webhook-secret>"

vercel env rm WEBHOOK_ENCRYPTION_KEY production --yes
vercel env add WEBHOOK_ENCRYPTION_KEY production <<< "<new-encryption-key>"
```

**Note**: Use `--non-interactive` flag if running in automation.
Do NOT remove env vars from Preview or Staging environments — they keep pointing to staging DB.

### Step 5: Redeploy Vercel Production

```bash
# Trigger production redeploy
vercel --prod

# Or redeploy latest deployment
vercel redeploy <latest-production-deployment-url> --target production
```

### Step 6: Verify

| Check                   | Method                                                                             | Expected             |
| ----------------------- | ---------------------------------------------------------------------------------- | -------------------- |
| Health endpoint         | `curl https://tradeos-core.vercel.app/api/health`                                  | `{"ok":true}`        |
| Demo auth blocked       | `curl -b "x-demo-auth-email=owner@tradeos.local" https://tradeos-core.vercel.app/` | Login page shown     |
| E2E endpoint blocked    | `curl -X POST https://tradeos-core.vercel.app/api/e2e/login`                       | 403                  |
| Production DB connected | `curl https://tradeos-core.vercel.app/api/health`                                  | Connected to prod DB |
| Supabase auth works     | Visit login page, send magic link                                                  | Link received        |

### Step 7: Smoke Test (Read-Only)

Navigate to `https://tradeos-core.vercel.app` and verify:

1. Login page loads (no demo auto-login)
2. Send magic link to test email
3. Sign in, verify redirect to workspace
4. Workspace loads without errors
5. All dashboard pages render

## Rollback Plan

If anything goes wrong:

1. **Revert Vercel env vars** — set all production env vars back to staging values
2. **Redeploy** — trigger production redeploy with staging config
3. **Verify** — health endpoint returns to pre-migration state
4. **Investigate** — production DB issue without production traffic pressure

## Residual Risks After Migration

| Risk                                     | Severity                           | Mitigation                                                       |
| ---------------------------------------- | ---------------------------------- | ---------------------------------------------------------------- |
| Staging data NOT in production           | ✅ By design — clean DB is desired |                                                                  |
| No seed data on production               | LOW                                | Users start with empty workspace; onboarding wizard handles this |
| SUPABASE_SERVICE_ROLE_KEY exposed in env | HIGH                               | Must be treated as secret; limit to Vercel production env only   |
| JWT_SECRET mismatch                      | HIGH                               | Verify Supabase JWT secret matches Vercel env var                |

## Security Notes

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are **public** — they load in browser
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — **never** expose to client code; only use in server-side API routes
- Rotate DB password periodically
- Enable MFA on Supabase Dashboard access

## Staging vs Production Comparison

| Aspect       | Staging                                      | Production                         |
| ------------ | -------------------------------------------- | ---------------------------------- |
| Project name | `TradeOS Core Staging`                       | `tradeos-core-prod`                |
| URL          | `https://ulnjanlaehfmxurreibj.supabase.co`   | `https://<ref>.supabase.co`        |
| Seed data    | Yes (demo org + user + permissions)          | No                                 |
| RLS          | 30 policies (13 supplier switch + 17 legacy) | Same 30 policies (same migrations) |
| Migrations   | Applied (12/12)                              | Apply via `prisma migrate deploy`  |
| Vercel env   | Preview, Staging, Local                      | Production only                    |
| Demo auth    | Enabled (preview), disabled (prod)           | Disabled                           |
| E2E endpoint | Enabled (`E2E_RUN_ENABLED=true`)             | Blocked (403)                      |
| Wipe risk    | HIGH (shared dev DB)                         | LOW (isolated)                     |
