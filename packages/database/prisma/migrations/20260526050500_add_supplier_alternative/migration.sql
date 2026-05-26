-- Create SupplierAlternative table
CREATE TABLE "SupplierAlternative" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourcingRunId" TEXT NOT NULL,
    "supplierCandidateId" TEXT,
    "supplierName" TEXT NOT NULL,
    "productDescription" TEXT NOT NULL,
    "quantity" DECIMAL(65,30),
    "unit" TEXT,
    "unitPrice" DECIMAL(65,30),
    "totalCost" DECIMAL(65,30),
    "currency" TEXT,
    "moq" TEXT,
    "leadTime" TEXT,
    "paymentTerm" TEXT,
    "warranty" TEXT,
    "shippingNotes" TEXT,
    "riskFlags" JSONB,
    "estimatedSavings" DECIMAL(65,30),
    "savingsConfidence" INTEGER,
    "switchingCost" TEXT,
    "switchingRisk" TEXT,
    "totalCostComparison" JSONB,
    "evidenceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DISCOVERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierAlternative_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "SupplierAlternative_organizationId_sourcingRunId_idx" ON "SupplierAlternative"("organizationId", "sourcingRunId");

-- Add foreign keys
ALTER TABLE "SupplierAlternative" ADD CONSTRAINT "SupplierAlternative_sourcingRunId_fkey" FOREIGN KEY ("sourcingRunId") REFERENCES "SourcingRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierAlternative" ADD CONSTRAINT "SupplierAlternative_supplierCandidateId_fkey" FOREIGN KEY ("supplierCandidateId") REFERENCES "SupplierCandidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;