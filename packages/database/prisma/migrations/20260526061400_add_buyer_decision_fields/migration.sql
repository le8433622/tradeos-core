-- Add buyer decision fields to SwitchDecisionReport
ALTER TABLE "SwitchDecisionReport" ADD COLUMN "buyerDecision" TEXT;
ALTER TABLE "SwitchDecisionReport" ADD COLUMN "buyerDecidedAt" TIMESTAMP(3);
ALTER TABLE "SwitchDecisionReport" ADD COLUMN "buyerDecidedById" TEXT;
