-- AlterTable: add externalPaymentId to Payment for idempotency
ALTER TABLE "Payment" ADD COLUMN "externalPaymentId" TEXT;

-- CreateIndex: unique constraint for idempotency (provider + externalPaymentId)
CREATE UNIQUE INDEX "Payment_provider_externalPaymentId_key" ON "Payment"("provider", "externalPaymentId");
