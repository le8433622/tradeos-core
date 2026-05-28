-- CreateTable: BuyerReportDelivery
CREATE TABLE "BuyerReportDelivery" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourcingRunId" TEXT NOT NULL,
    "assignedToEmail" TEXT NOT NULL,
    "assignedById" TEXT,
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,

    CONSTRAINT "BuyerReportDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BuyerReportDelivery_organizationId_assignedToEmail_idx" ON "BuyerReportDelivery"("organizationId", "assignedToEmail");
CREATE INDEX "BuyerReportDelivery_sourcingRunId_idx" ON "BuyerReportDelivery"("sourcingRunId");
CREATE INDEX "BuyerReportDelivery_organizationId_idx" ON "BuyerReportDelivery"("organizationId");
