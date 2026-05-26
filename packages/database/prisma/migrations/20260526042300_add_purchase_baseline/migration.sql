-- Add new EvidenceType values for Supplier Switch Intelligence
ALTER TYPE "EvidenceType" ADD VALUE IF NOT EXISTS 'CURRENT_SUPPLIER_INVOICE';
ALTER TYPE "EvidenceType" ADD VALUE IF NOT EXISTS 'CURRENT_SUPPLIER_PRICE_LIST';
ALTER TYPE "EvidenceType" ADD VALUE IF NOT EXISTS 'ALTERNATIVE_QUOTE';
ALTER TYPE "EvidenceType" ADD VALUE IF NOT EXISTS 'ALTERNATIVE_PROFILE';
ALTER TYPE "EvidenceType" ADD VALUE IF NOT EXISTS 'MARKET_BENCHMARK';
ALTER TYPE "EvidenceType" ADD VALUE IF NOT EXISTS 'SWITCH_DECISION_REPORT';
ALTER TYPE "EvidenceType" ADD VALUE IF NOT EXISTS 'OUTCOME_EVIDENCE';
ALTER TYPE "EvidenceType" ADD VALUE IF NOT EXISTS 'NEGOTIATION_LOG';

-- Create PurchaseBaseline table
CREATE TABLE "PurchaseBaseline" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourcingRunId" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "supplierContact" JSONB,
    "sourceType" TEXT NOT NULL DEFAULT 'MANUAL',
    "sourceEvidenceId" TEXT,
    "productDescription" TEXT NOT NULL,
    "quantity" DECIMAL(65,30),
    "unit" TEXT,
    "unitPrice" DECIMAL(65,30),
    "currency" TEXT,
    "frequency" TEXT,
    "annualEquivalent" DECIMAL(65,30),
    "paymentTerms" TEXT,
    "deliveryTerms" TEXT,
    "leadTime" TEXT,
    "minOrderQty" TEXT,
    "riskFlags" JSONB,
    "leakageScore" INTEGER,
    "marketPrice" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseBaseline_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "PurchaseBaseline_organizationId_sourcingRunId_idx" ON "PurchaseBaseline"("organizationId", "sourcingRunId");

-- Add foreign key
ALTER TABLE "PurchaseBaseline" ADD CONSTRAINT "PurchaseBaseline_sourcingRunId_fkey" FOREIGN KEY ("sourcingRunId") REFERENCES "SourcingRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
