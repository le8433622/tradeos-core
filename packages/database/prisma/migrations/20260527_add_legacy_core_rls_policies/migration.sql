-- Legacy Core RLS Policies
--
-- Ports existing RLS policies from staging to production for tables that
-- had policies set up outside of Prisma migrations (e.g., via Supabase SQL
-- editor or manual apply). The Supplier Switch tables already have policies
-- via 20260527_add_rls_policies.
--
-- Approach: same as existing Supplier Switch migration — use
-- auth.jwt() ->> 'email' for user resolution. The helper function
-- current_user_org_id() was created by 20260527_add_rls_policies.
--
-- Idempotent: each CREATE POLICY is preceded by DROP POLICY IF EXISTS so
-- that re-applying on a DB that already has these policies (e.g., staging)
-- does not fail.

-- ============================================================
-- CORE BUSINESS TABLES — tenant-scoped CRUD
-- ============================================================

ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Company" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Deal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Quotation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApprovalRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebhookEvent" ENABLE ROW LEVEL SECURITY;

-- Organization: SELECT only — user must be a member (have a User record in it)
DROP POLICY IF EXISTS "tenant_select_organizations" ON "Organization";
CREATE POLICY "tenant_select_organizations" ON "Organization"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "Organization".id
        AND u.email = auth.jwt() ->> 'email'
    )
  );

-- User: own-row read for all; OWNER/ADMIN can manage all users in their org
DROP POLICY IF EXISTS "tenant_read_own_user" ON "User";
CREATE POLICY "tenant_read_own_user" ON "User"
  FOR SELECT
  TO authenticated
  USING (email = auth.jwt() ->> 'email');

DROP POLICY IF EXISTS "tenant_manage_users_owner_admin" ON "User";
CREATE POLICY "tenant_manage_users_owner_admin" ON "User"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" actor
      WHERE actor."organizationId" = "User"."organizationId"
        AND actor.email = auth.jwt() ->> 'email'
        AND actor.role IN ('OWNER', 'ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "User" actor
      WHERE actor."organizationId" = "User"."organizationId"
        AND actor.email = auth.jwt() ->> 'email'
        AND actor.role IN ('OWNER', 'ADMIN')
    )
  );

-- Company: full CRUD for org members
DROP POLICY IF EXISTS "tenant_crud_companies" ON "Company";
CREATE POLICY "tenant_crud_companies" ON "Company"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "Company"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "Company"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
    )
  );

-- Contact: CRUD through Company relationship (org resolved via Company)
DROP POLICY IF EXISTS "tenant_crud_contacts" ON "Contact";
CREATE POLICY "tenant_crud_contacts" ON "Contact"
  FOR ALL
  TO authenticated
  USING (
    "companyId" IS NULL
    OR EXISTS (
      SELECT 1 FROM "Company" c
      JOIN "User" u ON u."organizationId" = c."organizationId"
      WHERE c.id = "Contact"."companyId"
        AND u.email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    "companyId" IS NULL
    OR EXISTS (
      SELECT 1 FROM "Company" c
      JOIN "User" u ON u."organizationId" = c."organizationId"
      WHERE c.id = "Contact"."companyId"
        AND u.email = auth.jwt() ->> 'email'
    )
  );

-- Lead: full CRUD for org members
DROP POLICY IF EXISTS "tenant_crud_leads" ON "Lead";
CREATE POLICY "tenant_crud_leads" ON "Lead"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "Lead"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "Lead"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
    )
  );

-- Deal: CRUD through Company or Lead relationship
DROP POLICY IF EXISTS "tenant_crud_deals" ON "Deal";
CREATE POLICY "tenant_crud_deals" ON "Deal"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Company" c
      JOIN "User" u ON u."organizationId" = c."organizationId"
      WHERE c.id = "Deal"."companyId"
        AND u.email = auth.jwt() ->> 'email'
    )
    OR
    EXISTS (
      SELECT 1 FROM "Lead" l
      JOIN "User" u ON u."organizationId" = l."organizationId"
      WHERE l.id = "Deal"."leadId"
        AND u.email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Company" c
      JOIN "User" u ON u."organizationId" = c."organizationId"
      WHERE c.id = "Deal"."companyId"
        AND u.email = auth.jwt() ->> 'email'
    )
    OR
    EXISTS (
      SELECT 1 FROM "Lead" l
      JOIN "User" u ON u."organizationId" = l."organizationId"
      WHERE l.id = "Deal"."leadId"
        AND u.email = auth.jwt() ->> 'email'
    )
  );

-- Product: full CRUD for org members
DROP POLICY IF EXISTS "tenant_crud_products" ON "Product";
CREATE POLICY "tenant_crud_products" ON "Product"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "Product"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "Product"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
    )
  );

-- Conversation: full CRUD for org members
DROP POLICY IF EXISTS "tenant_crud_conversations" ON "Conversation";
CREATE POLICY "tenant_crud_conversations" ON "Conversation"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "Conversation"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "Conversation"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
    )
  );

-- Message: CRUD through Conversation relationship
DROP POLICY IF EXISTS "tenant_crud_messages" ON "Message";
CREATE POLICY "tenant_crud_messages" ON "Message"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Conversation" c
      JOIN "User" u ON u."organizationId" = c."organizationId"
      WHERE c.id = "Message"."conversationId"
        AND u.email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Conversation" c
      JOIN "User" u ON u."organizationId" = c."organizationId"
      WHERE c.id = "Message"."conversationId"
        AND u.email = auth.jwt() ->> 'email'
    )
  );

-- Quotation: full CRUD for org members
DROP POLICY IF EXISTS "tenant_crud_quotations" ON "Quotation";
CREATE POLICY "tenant_crud_quotations" ON "Quotation"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "Quotation"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "Quotation"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
    )
  );

-- Task: full CRUD for org members
DROP POLICY IF EXISTS "tenant_crud_tasks" ON "Task";
CREATE POLICY "tenant_crud_tasks" ON "Task"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "Task"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "Task"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
    )
  );

-- Notification: full CRUD for org members (orgId IS NOT NULL guard)
DROP POLICY IF EXISTS "tenant_crud_notifications" ON "Notification";
CREATE POLICY "tenant_crud_notifications" ON "Notification"
  FOR ALL
  TO authenticated
  USING (
    "Notification"."organizationId" IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "Notification"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
    )
  )
  WITH CHECK (
    "Notification"."organizationId" IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "Notification"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
    )
  );

-- ============================================================
-- AUDIT / SYSTEM TABLES — SELECT only for authenticated users
-- ============================================================

-- AuditLog: SELECT only for org members
DROP POLICY IF EXISTS "tenant_select_audit_logs" ON "AuditLog";
CREATE POLICY "tenant_select_audit_logs" ON "AuditLog"
  FOR SELECT
  TO authenticated
  USING (
    "AuditLog"."organizationId" IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "AuditLog"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
    )
  );

-- WebhookEvent: SELECT only for org members
DROP POLICY IF EXISTS "tenant_select_webhook_events" ON "WebhookEvent";
CREATE POLICY "tenant_select_webhook_events" ON "WebhookEvent"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "WebhookEvent"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
    )
  );

-- ============================================================
-- APPROVAL REQUEST — special: SELECT all, manage for OWNER/ADMIN
-- ============================================================

DROP POLICY IF EXISTS "tenant_select_approval_requests" ON "ApprovalRequest";
CREATE POLICY "tenant_select_approval_requests" ON "ApprovalRequest"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "ApprovalRequest"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "tenant_manage_approval_requests_owner_admin" ON "ApprovalRequest";
CREATE POLICY "tenant_manage_approval_requests_owner_admin" ON "ApprovalRequest"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "ApprovalRequest"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
        AND u.role IN ('OWNER', 'ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u."organizationId" = "ApprovalRequest"."organizationId"
        AND u.email = auth.jwt() ->> 'email'
        AND u.role IN ('OWNER', 'ADMIN')
    )
  );
