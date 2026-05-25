-- Add OUTCOME_FOLLOWUP to CheckpointType enum
ALTER TYPE "CheckpointType" ADD VALUE IF NOT EXISTS 'OUTCOME_FOLLOWUP';

-- Create OutcomeRecord table
CREATE TABLE "OutcomeRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourcingRunId" TEXT NOT NULL,

    "buyerAction" TEXT NOT NULL,
    "actualSupplier" TEXT,
    "actualUnitPrice" DECIMAL(65,30),
    "actualDeliveryDays" INTEGER,
    "qualityResult" TEXT,
    "disputeOccurred" BOOLEAN NOT NULL DEFAULT false,
    "reorderOccurred" BOOLEAN NOT NULL DEFAULT false,
    "buyerSatisfaction" INTEGER,
    "learningNote" TEXT,

    "linkedReportId" TEXT,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutcomeRecord_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "OutcomeRecord_organizationId_sourcingRunId_idx" ON "OutcomeRecord"("organizationId", "sourcingRunId");

-- Add foreign keys
ALTER TABLE "OutcomeRecord" ADD CONSTRAINT "OutcomeRecord_sourcingRunId_fkey" FOREIGN KEY ("sourcingRunId") REFERENCES "SourcingRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
