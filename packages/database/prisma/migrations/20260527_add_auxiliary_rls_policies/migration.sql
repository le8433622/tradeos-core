-- Auxiliary/Admin RLS Policies (#93)
--
-- Covers remaining tables not touched by previous RLS migrations:
--   - 20260527_add_rls_policies (Supplier Switch tables, 13 tables)
--   - 20260527_add_legacy_core_rls_policies (core business tables, 15 tables)
--
-- Table classification:
--   SYSTEM         — _prisma_migrations (block all access)
--   GLOBAL_RO      — Permission, PlanLimit (SELECT for all authenticated)
--   GLOBAL_MIXED   — Role, RolePermission (global + org-scoped rows)
--   TENANT_DIRECT  — WebhookIntegration, ReportSnapshot, Invitation,
--                    OrganizationMember (direct organizationId)
--   TENANT_PARENT  — QuotationLineItem (via Quotation.organizationId)
--   TENANT_MULTI   — IntroductionRequest (proposer/buyer/seller orgs)
--   TENANT_MGMT    — OrganizationMember (SELECT own-org, ALL for OWNER/ADMIN)
--
-- Idempotent: each CREATE POLICY preceded by DROP POLICY IF EXISTS.

-- ============================================================
-- SYSTEM TABLE — block all access
-- ============================================================

ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- No policy means all operations are blocked for any role, including
-- authenticated users. Only superuser / service_role can access.

-- ============================================================
-- GLOBAL READ-ONLY — Permission, PlanLimit
-- ============================================================

ALTER TABLE "Permission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlanLimit" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_permissions" ON "Permission";
CREATE POLICY "tenant_select_permissions" ON "Permission"
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "tenant_select_plan_limits" ON "PlanLimit";
CREATE POLICY "tenant_select_plan_limits" ON "PlanLimit"
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- GLOBAL + ORG-SCOPED MIXED — Role, RolePermission
-- ============================================================

ALTER TABLE "Role" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RolePermission" ENABLE ROW LEVEL SECURITY;

-- Role: system roles (orgId=NULL) readable by all authenticated;
--       custom org roles readable by that org's members;
--       custom org roles manageable by OWNER/ADMIN of that org
DROP POLICY IF EXISTS "tenant_select_roles" ON "Role";
CREATE POLICY "tenant_select_roles" ON "Role"
  FOR SELECT
  TO authenticated
  USING (
    "Role"."organizationId" IS NULL
    OR EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "Role"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "tenant_manage_custom_roles_owner_admin" ON "Role";
CREATE POLICY "tenant_manage_custom_roles_owner_admin" ON "Role"
  FOR ALL
  TO authenticated
  USING (
    "Role"."organizationId" IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "Role"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
        AND u.role IN ('OWNER', 'ADMIN')
    )
  )
  WITH CHECK (
    "Role"."organizationId" IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "Role"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
        AND u.role IN ('OWNER', 'ADMIN')
    )
  );

-- RolePermission: access through parent Role
DROP POLICY IF EXISTS "tenant_select_role_permissions" ON "RolePermission";
CREATE POLICY "tenant_select_role_permissions" ON "RolePermission"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Role" r
      WHERE r.id = "RolePermission"."roleId"
        AND (
          r."organizationId" IS NULL
          OR EXISTS (
            SELECT 1 FROM "User" u
            WHERE u."organizationId" = r."organizationId"
              AND u.email = auth.jwt() ->> 'email'
          )
        )
    )
  );

DROP POLICY IF EXISTS "tenant_manage_role_permissions_owner_admin" ON "RolePermission";
CREATE POLICY "tenant_manage_role_permissions_owner_admin" ON "RolePermission"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Role" r
      JOIN "User" u ON u."organizationId" = r."organizationId"
      WHERE r.id = "RolePermission"."roleId"
        AND u.email = auth.jwt() ->> 'email'
        AND u.role IN ('OWNER', 'ADMIN')
        AND r."organizationId" IS NOT NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Role" r
      JOIN "User" u ON u."organizationId" = r."organizationId"
      WHERE r.id = "RolePermission"."roleId"
        AND u.email = auth.jwt() ->> 'email'
        AND u.role IN ('OWNER', 'ADMIN')
        AND r."organizationId" IS NOT NULL
    )
  );

-- ============================================================
-- TENANT-SCOPED DIRECT — WebhookIntegration, ReportSnapshot
-- ============================================================

ALTER TABLE "WebhookIntegration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReportSnapshot" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_crud_webhook_integrations" ON "WebhookIntegration";
CREATE POLICY "tenant_crud_webhook_integrations" ON "WebhookIntegration"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "WebhookIntegration"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "WebhookIntegration"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "tenant_crud_report_snapshots" ON "ReportSnapshot";
CREATE POLICY "tenant_crud_report_snapshots" ON "ReportSnapshot"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "ReportSnapshot"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "ReportSnapshot"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
    )
  );

-- ============================================================
-- TENANT-SCOPED THROUGH PARENT — QuotationLineItem
-- ============================================================

ALTER TABLE "QuotationLineItem" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_crud_quotation_line_items" ON "QuotationLineItem";
CREATE POLICY "tenant_crud_quotation_line_items" ON "QuotationLineItem"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Quotation" q
      JOIN "User" u ON u."organizationId" = q."organizationId"
      WHERE q.id = "QuotationLineItem"."quotationId"
        AND u.email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Quotation" q
      JOIN "User" u ON u."organizationId" = q."organizationId"
      WHERE q.id = "QuotationLineItem"."quotationId"
        AND u.email = auth.jwt() ->> 'email'
    )
  );

-- ============================================================
-- MULTI-ORG — IntroductionRequest (proposer/buyer/seller)
-- ============================================================

ALTER TABLE "IntroductionRequest" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_crud_introduction_requests" ON "IntroductionRequest";
CREATE POLICY "tenant_crud_introduction_requests" ON "IntroductionRequest"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.email = auth.jwt() ->> 'email'
        AND u."organizationId" IN (
          "IntroductionRequest"."proposerOrgId",
          "IntroductionRequest"."buyerOrgId",
          "IntroductionRequest"."sellerOrgId"
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.email = auth.jwt() ->> 'email'
        AND u."organizationId" IN (
          "IntroductionRequest"."proposerOrgId",
          "IntroductionRequest"."buyerOrgId",
          "IntroductionRequest"."sellerOrgId"
        )
    )
  );

-- ============================================================
-- TENANT MEMBERSHIP — OrganizationMember, Invitation
-- ============================================================

ALTER TABLE "OrganizationMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invitation" ENABLE ROW LEVEL SECURITY;

-- OrganizationMember: SELECT for own-row or org members;
--                     INSERT/UPDATE/DELETE for OWNER/ADMIN
DROP POLICY IF EXISTS "tenant_select_org_members" ON "OrganizationMember";
CREATE POLICY "tenant_select_org_members" ON "OrganizationMember"
  FOR SELECT
  TO authenticated
  USING (
    -- own membership record
    "OrganizationMember"."userId" IN (
      SELECT id FROM "User" WHERE email = auth.jwt() ->> 'email'
    )
    OR
    -- any membership in orgs the user belongs to
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "OrganizationMember"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "tenant_manage_org_members_owner_admin" ON "OrganizationMember";
CREATE POLICY "tenant_manage_org_members_owner_admin" ON "OrganizationMember"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "OrganizationMember"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
        AND u.role IN ('OWNER', 'ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "OrganizationMember"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
        AND u.role IN ('OWNER', 'ADMIN')
    )
  );

-- Invitation: SELECT for org members; INSERT/UPDATE/DELETE for OWNER/ADMIN
DROP POLICY IF EXISTS "tenant_select_invitations" ON "Invitation";
CREATE POLICY "tenant_select_invitations" ON "Invitation"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "Invitation"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "tenant_manage_invitations_owner_admin" ON "Invitation";
CREATE POLICY "tenant_manage_invitations_owner_admin" ON "Invitation"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "Invitation"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
        AND u.role IN ('OWNER', 'ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "Invitation"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
        AND u.role IN ('OWNER', 'ADMIN')
    )
  );
