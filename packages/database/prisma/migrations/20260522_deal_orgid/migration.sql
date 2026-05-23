-- Safely add organizationId to Deal model with backfill
-- Step 1: Add column as nullable first (safe for existing rows)
ALTER TABLE "Deal" ADD COLUMN "organizationId" TEXT;

-- Step 2: Backfill existing rows with a default organization ID
-- If Deal table has data, set to any existing org; otherwise no-op
UPDATE "Deal" SET "organizationId" = (SELECT id FROM "Organization" LIMIT 1) WHERE "organizationId" IS NULL;

-- Step 3: Set NOT NULL now that all rows have a value
ALTER TABLE "Deal" ALTER COLUMN "organizationId" SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE;

-- Add index
CREATE INDEX "Deal_organizationId_idx" ON "Deal"("organizationId");