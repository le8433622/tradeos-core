# Demo Walkthrough — Supplier Switch Pilot (#99)

## Prerequisites

- Staging environment running with seed data
- 4 demo accounts live (see below)
- Demo auth enabled (`ALLOW_DEMO_AUTH=true` or `NODE_ENV !== "production"`)

## Demo Accounts

All belong to `demo-supplier-switch-org`. Each uses a distinct role for testing the access control layer.

| Email                         | Role     | Land Page                  | Can access Settings?       |
| ----------------------------- | -------- | -------------------------- | -------------------------- |
| `owner-demo@tradeos.local`    | OWNER    | `/settings/team`           | Yes (all)                  |
| `admin-demo@tradeos.local`    | ADMIN    | `/sourcing-runs`           | Yes (not security/billing) |
| `operator-demo@tradeos.local` | OPERATOR | `/sourcing-runs`           | No                         |
| `viewer-demo@tradeos.local`   | VIEWER   | `/sourcing-runs?mode=view` | No                         |

## How to use

### With demo auth (local/staging)

Browse to `/?x-demo-auth-email=<email>` — or set the `x-demo-auth-email` cookie to one of the emails above.

Easiest: open DevTools → Application → Cookies → set `x-demo-auth-email` → reload.

### With real Supabase Auth (production)

Seed the DB first, then invite each email via `/settings/team`. Users sign up with magic link.

## Walkthrough steps

1. **Login as OWNER** — lands on `/settings/team`. Can see all members, change roles, access all settings pages.
2. **Login as ADMIN** — lands on `/sourcing-runs`. Can navigate to settings team and roles (has `user.invite`, `settings.profile`).
3. **Login as OPERATOR** — lands on `/sourcing-runs`. Can view case detail. Cannot access any settings page (redirected to `/?error=permission_denied`).
4. **Login as VIEWER** — lands on `/sourcing-runs?mode=view`. Cannot access settings. Read-only experience on sourcing runs.

## Role definitions

See `packages/database/prisma/seed.ts` for exact permission lists per role.

Key differences:

- **OWNER** — all 52 permissions
- **ADMIN** — 47 permissions (excludes `billing.manage`, `privacy.anonymize`, `privacy.legalHold`, `user.roleUpdate`, `settings.security`)
- **OPERATOR** — 17 permissions (operations-focused: inbox, approvals, sourcing read)
- **VIEWER** — 9 read-only permissions

## What to verify during demo

- Role-based landing redirects are correct
- Permission gates block unauthorized screen access (redirect to `/?error=permission_denied`)
- OWNER can manage team members (role change, invite)
- All roles can view sourcing-runs dashboard and case details
- No data leaks between sessions (switch users and verify isolation)
