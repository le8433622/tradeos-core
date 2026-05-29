-- #120 — Enable RLS on BuyerReportDelivery (missed by previous RLS migrations)
-- #123 — Add missing FK indexes for BuyerReportDelivery
--
-- BuyerReportDelivery was added by 20260528_add_buyer_report_delivery but
-- was not included in any RLS migration. Supabase security advisor flags it
-- as "RLS disabled on public table."
--
-- This migration:
--   1. Enables RLS on BuyerReportDelivery
--   2. Adds tenant isolation policy (same org can read/write)
--   3. Adds missing FK index on assignedById → User.id
--
-- Depends on current_user_org_id() helper defined in 20260527_add_rls_policies.

ALTER TABLE "BuyerReportDelivery" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_buyerreportdelivery" ON "BuyerReportDelivery";
CREATE POLICY "tenant_buyerreportdelivery" ON "BuyerReportDelivery"
  FOR ALL
  TO authenticated
  USING ("organizationId" = current_user_org_id())
  WITH CHECK ("organizationId" = current_user_org_id());

-- Missing FK covering index for assignedById → User.id
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "BuyerReportDelivery_assignedById_idx"
    ON "BuyerReportDelivery" ("assignedById");
EXCEPTION WHEN undefined_table THEN null;
END $$;
