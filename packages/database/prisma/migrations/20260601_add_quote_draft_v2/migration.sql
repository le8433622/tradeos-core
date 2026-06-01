-- Add QuoteDraft model and QuoteDraftStatus enum for Quote & Margin Engine
-- These were added to schema.prisma in commit de62430 but no migration was created.

DO $$ BEGIN
  CREATE TYPE "QuoteDraftStatus" AS ENUM (
    'DRAFT',
    'NEEDS_MORE_COST_DATA',
    'WAITING_FOUNDER_APPROVAL',
    'APPROVED',
    'SENT',
    'ACCEPTED',
    'REJECTED',
    'EXPIRED'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "QuoteDraft" (
    "id"                    TEXT NOT NULL,
    "organizationId"        TEXT NOT NULL,
    "sourcingRunId"         TEXT,
    "title"                 TEXT NOT NULL,
    "supplierName"          TEXT NOT NULL,
    "buyPrice"              DECIMAL NOT NULL,
    "currency"              TEXT NOT NULL DEFAULT 'USD',
    "quantity"              DECIMAL,
    "unit"                  TEXT,
    "shippingCost"          DECIMAL,
    "handlingCost"          DECIMAL,
    "riskBuffer"            DECIMAL,
    "taxOrFee"              DECIMAL,
    "targetMarginPercent"   DECIMAL,
    "salePrice"             DECIMAL,
    "grossProfit"           DECIMAL,
    "depositRequired"       BOOLEAN NOT NULL DEFAULT true,
    "depositAmount"         DECIMAL,
    "deliveryEstimate"      TEXT,
    "refundTerms"           TEXT,
    "quoteExpiresAt"        TIMESTAMP(3),
    "riskNotes"             TEXT,
    "evidenceIds"           JSONB DEFAULT '[]'::jsonb,
    "metadata"              JSONB DEFAULT '{}'::jsonb,
    "status"                "QuoteDraftStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy"             TEXT,
    "approvedBy"            TEXT,
    "approvedAt"            TIMESTAMP(3),
    "sentAt"                TIMESTAMP(3),
    "customerAcceptedAt"    TIMESTAMP(3),
    "customerRejectedAt"    TIMESTAMP(3),
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,
    CONSTRAINT "QuoteDraft_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "QuoteDraft_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE,
    CONSTRAINT "QuoteDraft_sourcingRunId_fkey" FOREIGN KEY ("sourcingRunId") REFERENCES "SourcingRun"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "QuoteDraft_organizationId_idx" ON "QuoteDraft"("organizationId");
CREATE INDEX IF NOT EXISTS "QuoteDraft_sourcingRunId_idx" ON "QuoteDraft"("sourcingRunId");
CREATE INDEX IF NOT EXISTS "QuoteDraft_status_idx" ON "QuoteDraft"("status");
