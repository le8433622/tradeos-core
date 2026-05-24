-- CreateEnum
CREATE TYPE "SourcingRunStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUPPLIER_SHORTLISTED', 'QUOTES_COLLECTED', 'COMPARED', 'READY_FOR_REVIEW', 'REPORT_DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('DISCOVERED', 'CONTACTED', 'QUOTED', 'SELECTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('SUPPLIER_MESSAGE', 'CALL_NOTE', 'QUOTE_SCREENSHOT', 'QUOTE_FILE', 'INVOICE', 'PAYMENT_PROOF', 'APPROVAL_RECORD', 'DELIVERY_CONFIRMATION', 'COMPARISON_TABLE', 'BUYER_DECISION', 'SYSTEM_LOG');

-- CreateEnum
CREATE TYPE "CheckpointStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DELIVERED', 'APPROVED', 'REJECTED', 'BILLED');

-- CreateEnum
CREATE TYPE "CheckpointType" AS ENUM ('PAID_SOURCING_REQUEST', 'SUPPLIER_SHORTLIST', 'QUOTE_COLLECTION', 'QUOTE_COMPARISON', 'NEGOTIATION_RUN', 'BUYER_DECISION_REPORT', 'INTRODUCTION', 'DEAL_SUCCESS');

-- CreateEnum
CREATE TYPE "HandoverStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HandoverReason" AS ENUM ('PRICE_THRESHOLD', 'ABNORMAL_SUPPLIER', 'UNCLEAR_PAYMENT', 'LEGAL_AMBIGUITY', 'SHIPPING_AMBIGUITY', 'BUYER_PREFERENCE_CONFLICT', 'LOW_CONFIDENCE', 'MONEY_MOVEMENT', 'FINAL_ORDER', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "SourcingRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT,
    "title" TEXT NOT NULL,
    "requirement" TEXT NOT NULL,
    "status" "SourcingRunStatus" NOT NULL DEFAULT 'DRAFT',
    "targetCountry" TEXT,
    "sourceCountry" TEXT,
    "productCategory" TEXT,
    "quantity" TEXT,
    "budget" TEXT,
    "currency" TEXT,
    "riskLevel" TEXT NOT NULL DEFAULT 'MEDIUM',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourcingRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierCandidate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourcingRunId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT,
    "website" TEXT,
    "platform" TEXT,
    "country" TEXT,
    "contactInfo" JSONB,
    "reliabilityScore" INTEGER,
    "riskFlags" JSONB,
    "status" "SupplierStatus" NOT NULL DEFAULT 'DISCOVERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierQuote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourcingRunId" TEXT NOT NULL,
    "supplierCandidateId" TEXT,
    "productDescription" TEXT NOT NULL,
    "quantity" DECIMAL(65,30),
    "unit" TEXT,
    "unitPrice" DECIMAL(65,30),
    "totalAmount" DECIMAL(65,30),
    "currency" TEXT,
    "moq" TEXT,
    "leadTime" TEXT,
    "shippingTerm" TEXT,
    "paymentTerm" TEXT,
    "warranty" TEXT,
    "riskScore" INTEGER,
    "comparisonRank" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'COLLECTED',
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourcingRunId" TEXT,
    "relatedType" TEXT NOT NULL,
    "relatedId" TEXT,
    "evidenceType" "EvidenceType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "fileUrl" TEXT,
    "externalUrl" TEXT,
    "hash" TEXT,
    "metadata" JSONB,
    "capturedBy" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkCheckpoint" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourcingRunId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "checkpointType" "CheckpointType" NOT NULL,
    "status" "CheckpointStatus" NOT NULL DEFAULT 'PENDING',
    "price" DECIMAL(65,30),
    "currency" TEXT,
    "payerOrgId" TEXT,
    "evidenceCount" INTEGER NOT NULL DEFAULT 0,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HumanHandover" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourcingRunId" TEXT,
    "reason" "HandoverReason" NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "recommendedNextAction" TEXT,
    "status" "HandoverStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToId" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HumanHandover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "checkpointId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider" TEXT NOT NULL DEFAULT 'manual',
    "status" "PaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanLimit" (
    "id" TEXT NOT NULL,
    "plan" "TenantPlan" NOT NULL,
    "feature" TEXT NOT NULL,
    "limitValue" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'count',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SourcingRun_organizationId_status_idx" ON "SourcingRun"("organizationId", "status");

-- CreateIndex
CREATE INDEX "SourcingRun_leadId_idx" ON "SourcingRun"("leadId");

-- CreateIndex
CREATE INDEX "SupplierCandidate_organizationId_sourcingRunId_idx" ON "SupplierCandidate"("organizationId", "sourcingRunId");

-- CreateIndex
CREATE INDEX "SupplierQuote_organizationId_sourcingRunId_idx" ON "SupplierQuote"("organizationId", "sourcingRunId");

-- CreateIndex
CREATE INDEX "EvidenceItem_organizationId_relatedType_relatedId_idx" ON "EvidenceItem"("organizationId", "relatedType", "relatedId");

-- CreateIndex
CREATE INDEX "EvidenceItem_sourcingRunId_idx" ON "EvidenceItem"("sourcingRunId");

-- CreateIndex
CREATE INDEX "WorkCheckpoint_organizationId_status_idx" ON "WorkCheckpoint"("organizationId", "status");

-- CreateIndex
CREATE INDEX "WorkCheckpoint_sourcingRunId_idx" ON "WorkCheckpoint"("sourcingRunId");

-- CreateIndex
CREATE INDEX "HumanHandover_organizationId_status_idx" ON "HumanHandover"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Payment_organizationId_checkpointId_idx" ON "Payment"("organizationId", "checkpointId");

-- CreateIndex
CREATE INDEX "Payment_organizationId_paidAt_idx" ON "Payment"("organizationId", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlanLimit_plan_feature_key" ON "PlanLimit"("plan", "feature");

-- CreateIndex
CREATE INDEX "Organization_plan_idx" ON "Organization"("plan");

-- AddForeignKey
ALTER TABLE "SourcingRun" ADD CONSTRAINT "SourcingRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourcingRun" ADD CONSTRAINT "SourcingRun_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierCandidate" ADD CONSTRAINT "SupplierCandidate_sourcingRunId_fkey" FOREIGN KEY ("sourcingRunId") REFERENCES "SourcingRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierQuote" ADD CONSTRAINT "SupplierQuote_sourcingRunId_fkey" FOREIGN KEY ("sourcingRunId") REFERENCES "SourcingRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierQuote" ADD CONSTRAINT "SupplierQuote_supplierCandidateId_fkey" FOREIGN KEY ("supplierCandidateId") REFERENCES "SupplierCandidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_sourcingRunId_fkey" FOREIGN KEY ("sourcingRunId") REFERENCES "SourcingRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkCheckpoint" ADD CONSTRAINT "WorkCheckpoint_sourcingRunId_fkey" FOREIGN KEY ("sourcingRunId") REFERENCES "SourcingRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanHandover" ADD CONSTRAINT "HumanHandover_sourcingRunId_fkey" FOREIGN KEY ("sourcingRunId") REFERENCES "SourcingRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_checkpointId_fkey" FOREIGN KEY ("checkpointId") REFERENCES "WorkCheckpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

