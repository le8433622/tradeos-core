-- Human-nature trade-pain metadata and outcome learning fields.
-- All new business fields are nullable to avoid unsafe backfills on existing data.

ALTER TABLE "SourcingRun"
ADD COLUMN "metadata" JSONB;

ALTER TABLE "PurchaseBaseline"
ADD COLUMN "originUnitPrice" DECIMAL(65,30),
ADD COLUMN "landedCost" DECIMAL(65,30),
ADD COLUMN "marketBenchmarkPrice" DECIMAL(65,30);

ALTER TABLE "OutcomeRecord"
ADD COLUMN "moneySaved" DECIMAL(65,30),
ADD COLUMN "timeSaved" TEXT,
ADD COLUMN "riskReduced" TEXT,
ADD COLUMN "dependencyReduced" TEXT,
ADD COLUMN "trustImproved" TEXT,
ADD COLUMN "proofImproved" TEXT,
ADD COLUMN "buyerUnderstoodReport" BOOLEAN,
ADD COLUMN "operatorTimeSpent" TEXT,
ADD COLUMN "lessonLearned" TEXT,
ADD COLUMN "failedOutcomeReason" TEXT;

UPDATE "BuyerReportDelivery"
SET "assignedToEmail" = lower(trim("assignedToEmail"));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "BuyerReportDelivery"
    GROUP BY "organizationId", "sourcingRunId", "assignedToEmail"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate BuyerReportDelivery assignments must be resolved before adding unique constraint';
  END IF;
END $$;

CREATE UNIQUE INDEX "BuyerReportDelivery_organizationId_sourcingRunId_assignedToEmail_key"
ON "BuyerReportDelivery" ("organizationId", "sourcingRunId", "assignedToEmail");
