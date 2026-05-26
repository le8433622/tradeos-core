-- RLS Policies — Supplier Switch Tenant Isolation
--
-- Status: old tables (Organization, User, Lead, Quotation, ApprovalRequest,
-- WebhookEvent, etc.) already have RLS policies deployed. This migration
-- adds policies ONLY for the 12 Supplier Switch tables that are missing them.
--
-- Approach: use auth.jwt() ->> 'email' to look up the user's organization
-- from the app's User table. This avoids the auth.uid() vs User.id (CUID)
-- mismatch and does NOT require a custom JWT claim hook.
--
-- Application-layer tenant isolation (requireSessionFromRequest) is the
-- primary defense. RLS is defense-in-depth.

-- Helper: resolve organizationId from the authenticated user's email
CREATE OR REPLACE FUNCTION current_user_org_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT "organizationId" FROM "User" WHERE email = auth.jwt() ->> 'email' LIMIT 1),
    ''
  );
$$;

-- ============================================================
-- Supplier Switch tables — enable RLS and add tenant policy
-- ============================================================

ALTER TABLE "SourcingRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseBaseline" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupplierAlternative" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupplierCandidate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupplierQuote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SwitchDecisionReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvidenceItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkCheckpoint" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OutcomeRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HumanHandover" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Job" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiUsageEvent" ENABLE ROW LEVEL SECURITY;

-- Tenant isolation: same org can read/write
CREATE POLICY "tenant_sourcingrun" ON "SourcingRun"
  FOR ALL USING ("organizationId" = current_user_org_id());

CREATE POLICY "tenant_purchasebaseline" ON "PurchaseBaseline"
  FOR ALL USING ("organizationId" = current_user_org_id());

CREATE POLICY "tenant_supplieralternative" ON "SupplierAlternative"
  FOR ALL USING ("organizationId" = current_user_org_id());

CREATE POLICY "tenant_suppliercandidate" ON "SupplierCandidate"
  FOR ALL USING ("organizationId" = current_user_org_id());

CREATE POLICY "tenant_supplierquote" ON "SupplierQuote"
  FOR ALL USING ("organizationId" = current_user_org_id());

CREATE POLICY "tenant_switchdecisionreport" ON "SwitchDecisionReport"
  FOR ALL USING ("organizationId" = current_user_org_id());

CREATE POLICY "tenant_evidenceitem" ON "EvidenceItem"
  FOR ALL USING ("organizationId" = current_user_org_id());

CREATE POLICY "tenant_workcheckpoint" ON "WorkCheckpoint"
  FOR ALL USING ("organizationId" = current_user_org_id());

CREATE POLICY "tenant_outcomerecord" ON "OutcomeRecord"
  FOR ALL USING ("organizationId" = current_user_org_id());

CREATE POLICY "tenant_humanhandover" ON "HumanHandover"
  FOR ALL USING ("organizationId" = current_user_org_id());

CREATE POLICY "tenant_payment" ON "Payment"
  FOR ALL USING ("organizationId" = current_user_org_id());

CREATE POLICY "tenant_job" ON "Job"
  FOR ALL USING ("organizationId" = current_user_org_id());

CREATE POLICY "tenant_aiusageevent" ON "AiUsageEvent"
  FOR ALL USING ("organizationId" = current_user_org_id());
