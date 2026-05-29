-- Add approval idempotency, stale recovery, and retry chain fields
-- These were added to schema.prisma in commit 480f4b0 but no migration was created.

ALTER TABLE "ApprovalRequest" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
ALTER TABLE "ApprovalRequest" ADD COLUMN IF NOT EXISTS "executingSince" TIMESTAMP(3);
ALTER TABLE "ApprovalRequest" ADD COLUMN IF NOT EXISTS "lockedBy" TEXT;
ALTER TABLE "ApprovalRequest" ADD COLUMN IF NOT EXISTS "retryCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ApprovalRequest" ADD COLUMN IF NOT EXISTS "maxRetries" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "ApprovalRequest" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "ApprovalRequest" ADD COLUMN IF NOT EXISTS "parentApprovalRequestId" TEXT;
ALTER TABLE "ApprovalRequest" ADD COLUMN IF NOT EXISTS "retryChainId" TEXT;
ALTER TABLE "ApprovalRequest" ADD COLUMN IF NOT EXISTS "supersededById" TEXT;
ALTER TABLE "ApprovalRequest" ADD COLUMN IF NOT EXISTS "deprecatedAt" TIMESTAMP(3);

-- Self-referential foreign keys
DO $$ BEGIN
  ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_parentApprovalRequestId_fkey"
    FOREIGN KEY ("parentApprovalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_supersededById_fkey"
    FOREIGN KEY ("supersededById") REFERENCES "ApprovalRequest"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Unique constraint for idempotency
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "ApprovalRequest_organizationId_idempotencyKey_key"
    ON "ApprovalRequest"("organizationId", "idempotencyKey");
EXCEPTION WHEN undefined_table THEN null;
END $$;

-- Self-referential FK indexes
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "ApprovalRequest_parentApprovalRequestId_idx"
    ON "ApprovalRequest"("parentApprovalRequestId");
EXCEPTION WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "ApprovalRequest_supersededById_idx"
    ON "ApprovalRequest"("supersededById");
EXCEPTION WHEN undefined_table THEN null;
END $$;
