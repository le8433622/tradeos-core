-- Create SwitchDecisionReport table
CREATE TABLE "SwitchDecisionReport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourcingRunId" TEXT NOT NULL,

    "recommendation" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,

    "savingsScore" INTEGER,
    "evidenceScore" INTEGER,
    "paymentRiskScore" INTEGER,
    "leadTimeRiskScore" INTEGER,
    "dependencyRiskScore" INTEGER,
    "overallScore" INTEGER,

    "monthlySavings" DECIMAL(65,30),
    "annualSavings" DECIMAL(65,30),
    "savingsPercent" DECIMAL(65,30),
    "currency" TEXT,

    "baselineId" TEXT,
    "topAlternativeId" TEXT,

    "evidenceSummary" JSONB,
    "missingProof" JSONB,
    "riskFlags" JSONB,

    "summary" TEXT,
    "nextActions" JSONB,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwitchDecisionReport_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "SwitchDecisionReport_organizationId_sourcingRunId_idx" ON "SwitchDecisionReport"("organizationId", "sourcingRunId");

-- Add foreign keys
ALTER TABLE "SwitchDecisionReport" ADD CONSTRAINT "SwitchDecisionReport_sourcingRunId_fkey" FOREIGN KEY ("sourcingRunId") REFERENCES "SourcingRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
