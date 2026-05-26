-- FK Covering Indexes
--
-- Supabase performance advisor reports foreign key columns without covering
-- indexes. These prevent sequential scans as data grows.

-- SourcingRun — leadId, createdById
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SourcingRun_leadId_idx" ON "SourcingRun" ("leadId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SourcingRun_createdById_idx" ON "SourcingRun" ("createdById");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SourcingRun_organizationId_idx" ON "SourcingRun" ("organizationId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SourcingRun_status_idx" ON "SourcingRun" ("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SourcingRun_createdAt_idx" ON "SourcingRun" ("createdAt");

-- PurchaseBaseline — sourcingRunId, sourceEvidenceId, organizationId
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PurchaseBaseline_sourcingRunId_idx" ON "PurchaseBaseline" ("sourcingRunId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PurchaseBaseline_organizationId_idx" ON "PurchaseBaseline" ("organizationId");

-- SupplierAlternative — sourcingRunId, supplierCandidateId, evidenceId, organizationId
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SupplierAlternative_sourcingRunId_idx" ON "SupplierAlternative" ("sourcingRunId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SupplierAlternative_supplierCandidateId_idx" ON "SupplierAlternative" ("supplierCandidateId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SupplierAlternative_organizationId_idx" ON "SupplierAlternative" ("organizationId");

-- SupplierCandidate — sourcingRunId, organizationId
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SupplierCandidate_sourcingRunId_idx" ON "SupplierCandidate" ("sourcingRunId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SupplierCandidate_organizationId_idx" ON "SupplierCandidate" ("organizationId");

-- SupplierQuote — sourcingRunId, supplierCandidateId, organizationId
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SupplierQuote_sourcingRunId_idx" ON "SupplierQuote" ("sourcingRunId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SupplierQuote_supplierCandidateId_idx" ON "SupplierQuote" ("supplierCandidateId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SupplierQuote_organizationId_idx" ON "SupplierQuote" ("organizationId");

-- SwitchDecisionReport — sourcingRunId, baselineId, topAlternativeId, buyerDecidedById, organizationId
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SwitchDecisionReport_sourcingRunId_idx" ON "SwitchDecisionReport" ("sourcingRunId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SwitchDecisionReport_baselineId_idx" ON "SwitchDecisionReport" ("baselineId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SwitchDecisionReport_topAlternativeId_idx" ON "SwitchDecisionReport" ("topAlternativeId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "SwitchDecisionReport_organizationId_idx" ON "SwitchDecisionReport" ("organizationId");

-- EvidenceItem — sourcingRunId, organizationId
CREATE INDEX CONCURRENTLY IF NOT EXISTS "EvidenceItem_sourcingRunId_idx" ON "EvidenceItem" ("sourcingRunId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "EvidenceItem_organizationId_idx" ON "EvidenceItem" ("organizationId");

-- WorkCheckpoint — sourcingRunId, payerOrgId, approvedById, organizationId
CREATE INDEX CONCURRENTLY IF NOT EXISTS "WorkCheckpoint_sourcingRunId_idx" ON "WorkCheckpoint" ("sourcingRunId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "WorkCheckpoint_payerOrgId_idx" ON "WorkCheckpoint" ("payerOrgId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "WorkCheckpoint_organizationId_idx" ON "WorkCheckpoint" ("organizationId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "WorkCheckpoint_status_idx" ON "WorkCheckpoint" ("status");

-- OutcomeRecord — sourcingRunId, linkedReportId, organizationId
CREATE INDEX CONCURRENTLY IF NOT EXISTS "OutcomeRecord_sourcingRunId_idx" ON "OutcomeRecord" ("sourcingRunId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "OutcomeRecord_organizationId_idx" ON "OutcomeRecord" ("organizationId");

-- HumanHandover — sourcingRunId, assignedToId, resolvedById, organizationId
CREATE INDEX CONCURRENTLY IF NOT EXISTS "HumanHandover_sourcingRunId_idx" ON "HumanHandover" ("sourcingRunId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "HumanHandover_organizationId_idx" ON "HumanHandover" ("organizationId");

-- Payment — checkpointId, invoiceId, organizationId
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Payment_checkpointId_idx" ON "Payment" ("checkpointId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Payment_organizationId_idx" ON "Payment" ("organizationId");

-- OrganizationMember — userId, roleId, organizationId
CREATE INDEX CONCURRENTLY IF NOT EXISTS "OrganizationMember_userId_idx" ON "OrganizationMember" ("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "OrganizationMember_roleId_idx" ON "OrganizationMember" ("roleId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "OrganizationMember_organizationId_idx" ON "OrganizationMember" ("organizationId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "OrganizationMember_status_idx" ON "OrganizationMember" ("status");

-- AuditLog — actorUserId, organizationId
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditLog_actorUserId_idx" ON "AuditLog" ("actorUserId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AuditLog_organizationId_idx" ON "AuditLog" ("organizationId");

-- ImmutableAuditEvent — actorUserId, organizationId
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ImmutableAuditEvent_actorUserId_idx" ON "ImmutableAuditEvent" ("actorUserId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ImmutableAuditEvent_organizationId_idx" ON "ImmutableAuditEvent" ("organizationId");

-- ApprovalRequest — requestedById, reviewedById, parentApprovalRequestId, supersededById, organizationId
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ApprovalRequest_requestedById_idx" ON "ApprovalRequest" ("requestedById");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ApprovalRequest_reviewedById_idx" ON "ApprovalRequest" ("reviewedById");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ApprovalRequest_organizationId_idx" ON "ApprovalRequest" ("organizationId");

-- Lead — companyId, organizationId
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Lead_companyId_idx" ON "Lead" ("companyId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Lead_organizationId_idx" ON "Lead" ("organizationId");

-- Deal — companyId, leadId, organizationId
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Deal_companyId_idx" ON "Deal" ("companyId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Deal_leadId_idx" ON "Deal" ("leadId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Deal_organizationId_idx" ON "Deal" ("organizationId");

-- Task — leadId, assigneeId, organizationId
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Task_leadId_idx" ON "Task" ("leadId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Task_assigneeId_idx" ON "Task" ("assigneeId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Task_organizationId_idx" ON "Task" ("organizationId");

-- Quotation — leadId, organizationId
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Quotation_leadId_idx" ON "Quotation" ("leadId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Quotation_organizationId_idx" ON "Quotation" ("organizationId");

-- User — organizationId
CREATE INDEX CONCURRENTLY IF NOT EXISTS "User_organizationId_idx" ON "User" ("organizationId");

-- Invitation — roleId, organizationId
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Invitation_roleId_idx" ON "Invitation" ("roleId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Invitation_organizationId_idx" ON "Invitation" ("organizationId");

-- ReportSnapshot — approvedById, organizationId
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ReportSnapshot_approvedById_idx" ON "ReportSnapshot" ("approvedById");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ReportSnapshot_organizationId_idx" ON "ReportSnapshot" ("organizationId");

-- WebhookEvent — organizationId
CREATE INDEX CONCURRENTLY IF NOT EXISTS "WebhookEvent_organizationId_idx" ON "WebhookEvent" ("organizationId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "WebhookEvent_status_idx" ON "WebhookEvent" ("status");

-- AiUsageEvent — organizationId
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AiUsageEvent_organizationId_idx" ON "AiUsageEvent" ("organizationId");

-- Contact — companyId, organizationId
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Contact_companyId_idx" ON "Contact" ("companyId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Contact_organizationId_idx" ON "Contact" ("organizationId");

-- Job — parentJobId, organizationId
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Job_parentJobId_idx" ON "Job" ("parentJobId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Job_organizationId_idx" ON "Job" ("organizationId");
