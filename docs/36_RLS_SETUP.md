# RLS Policy Setup

## Status

- ✅ Old tables (Organization, User, Company, Lead, Quotation, ApprovalRequest, WebhookEvent, etc.) already have RLS policies deployed.
- ✅ Migration SQL written: `20260527_add_rls_policies` — adds policies for 12 Supplier Switch tables that were missing them.
- ❌ Migration NOT YET applied to staging. Requires `prisma migrate deploy` or manual SQL execution.
- ❌ No Supabase Auth Hook needed — policies use `auth.jwt() ->> 'email'` to look up org via User table.

## How It Works

Each policy calls `current_user_org_id()` which resolves the organization by looking up the authenticated user's email:

```sql
CREATE OR REPLACE FUNCTION current_user_org_id()
RETURNS TEXT
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (SELECT "organizationId" FROM "User" WHERE email = auth.jwt() ->> 'email' LIMIT 1),
    ''
  );
$$;
```

Policy pattern (example for SourcingRun):

```sql
CREATE POLICY "tenant_sourcingrun" ON "SourcingRun"
  FOR ALL USING ("organizationId" = current_user_org_id());
```

## Why Not auth.uid()?

Our `User.id` uses CUID format (e.g., `cmplxyz...`), but `auth.uid()` returns a Supabase UUID. The two do not match, so we cannot join `auth.uid()` with our User/OrganizationMember tables. Using `auth.jwt() ->> 'email'` avoids this mismatch without requiring a custom JWT claim hook.

## Tables Covered

Supplier Switch tables (this migration):

| Table                | Policy Name                   |
| -------------------- | ----------------------------- |
| SourcingRun          | `tenant_sourcingrun`          |
| PurchaseBaseline     | `tenant_purchasebaseline`     |
| SupplierAlternative  | `tenant_supplieralternative`  |
| SupplierCandidate    | `tenant_suppliercandidate`    |
| SupplierQuote        | `tenant_supplierquote`        |
| SwitchDecisionReport | `tenant_switchdecisionreport` |
| EvidenceItem         | `tenant_evidenceitem`         |
| WorkCheckpoint       | `tenant_workcheckpoint`       |
| OutcomeRecord        | `tenant_outcomerecord`        |
| HumanHandover        | `tenant_humanhandover`        |
| Payment              | `tenant_payment`              |
| Job                  | `tenant_job`                  |
| AiUsageEvent         | `tenant_aiusageevent`         |

Old tables: already have their own RLS policies (separate deployment).

## Apply to Staging

```bash
# Option 1: via Prisma migrate
npx prisma migrate deploy

# Option 2: manual SQL via Supabase Dashboard > SQL Editor
# Copy the contents of:
# packages/database/prisma/migrations/20260527_add_rls_policies/migration.sql
```

## Testing

```sql
-- As a regular authenticated user
SELECT * FROM "SourcingRun";  -- Should only return rows for your org

-- Cross-tenant should fail
SELECT * FROM "SourcingRun" WHERE "organizationId" != current_user_org_id();

-- As service_role (bypasses RLS)
SELECT * FROM "SourcingRun";  -- Returns all rows
```

## Role-Based Write Restriction

Current policies allow all org members to read/write. To restrict writes to Owner/Admin:

```sql
CREATE POLICY "write_owner_admin" ON "SourcingRun"
  FOR INSERT/UPDATE/DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" om
      JOIN "User" u ON u.id = om."userId"
      WHERE u.email = auth.jwt() ->> 'email'
      AND om."organizationId" = "SourcingRun"."organizationId"
      AND om.status = 'ACTIVE'
      AND om.role IN ('OWNER', 'ADMIN')
    )
  );
```

## Rollback

```sql
DROP POLICY IF EXISTS "tenant_sourcingrun" ON "SourcingRun";
DROP POLICY IF EXISTS "tenant_purchasebaseline" ON "PurchaseBaseline";
-- ... repeat for each policy
```
