-- FK Covering Indexes
--
-- Supabase performance advisor reports foreign key columns without covering
-- indexes. These prevent sequential scans as data grows.
--
-- Each CREATE INDEX is wrapped in a DO block to gracefully skip
-- if the table or column does not exist (staging may not have all tables).

DO $$ BEGIN CREATE INDEX IF NOT EXISTS "SourcingRun_leadId_idx" ON "SourcingRun" ("leadId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "SourcingRun_createdById_idx" ON "SourcingRun" ("createdById"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "SourcingRun_organizationId_idx" ON "SourcingRun" ("organizationId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "SourcingRun_status_idx" ON "SourcingRun" ("status"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "SourcingRun_createdAt_idx" ON "SourcingRun" ("createdAt"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS "PurchaseBaseline_sourcingRunId_idx" ON "PurchaseBaseline" ("sourcingRunId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "PurchaseBaseline_organizationId_idx" ON "PurchaseBaseline" ("organizationId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS "SupplierAlternative_sourcingRunId_idx" ON "SupplierAlternative" ("sourcingRunId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "SupplierAlternative_supplierCandidateId_idx" ON "SupplierAlternative" ("supplierCandidateId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "SupplierAlternative_organizationId_idx" ON "SupplierAlternative" ("organizationId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS "SupplierCandidate_sourcingRunId_idx" ON "SupplierCandidate" ("sourcingRunId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "SupplierCandidate_organizationId_idx" ON "SupplierCandidate" ("organizationId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS "SupplierQuote_sourcingRunId_idx" ON "SupplierQuote" ("sourcingRunId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "SupplierQuote_supplierCandidateId_idx" ON "SupplierQuote" ("supplierCandidateId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "SupplierQuote_organizationId_idx" ON "SupplierQuote" ("organizationId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS "SwitchDecisionReport_sourcingRunId_idx" ON "SwitchDecisionReport" ("sourcingRunId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "SwitchDecisionReport_baselineId_idx" ON "SwitchDecisionReport" ("baselineId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "SwitchDecisionReport_topAlternativeId_idx" ON "SwitchDecisionReport" ("topAlternativeId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "SwitchDecisionReport_organizationId_idx" ON "SwitchDecisionReport" ("organizationId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS "EvidenceItem_sourcingRunId_idx" ON "EvidenceItem" ("sourcingRunId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "EvidenceItem_organizationId_idx" ON "EvidenceItem" ("organizationId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS "WorkCheckpoint_sourcingRunId_idx" ON "WorkCheckpoint" ("sourcingRunId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "WorkCheckpoint_payerOrgId_idx" ON "WorkCheckpoint" ("payerOrgId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "WorkCheckpoint_organizationId_idx" ON "WorkCheckpoint" ("organizationId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "WorkCheckpoint_status_idx" ON "WorkCheckpoint" ("status"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS "OutcomeRecord_sourcingRunId_idx" ON "OutcomeRecord" ("sourcingRunId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "OutcomeRecord_organizationId_idx" ON "OutcomeRecord" ("organizationId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS "HumanHandover_sourcingRunId_idx" ON "HumanHandover" ("sourcingRunId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "HumanHandover_organizationId_idx" ON "HumanHandover" ("organizationId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS "Payment_checkpointId_idx" ON "Payment" ("checkpointId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "Payment_organizationId_idx" ON "Payment" ("organizationId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS "OrganizationMember_userId_idx" ON "OrganizationMember" ("userId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "OrganizationMember_roleId_idx" ON "OrganizationMember" ("roleId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "OrganizationMember_organizationId_idx" ON "OrganizationMember" ("organizationId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "OrganizationMember_status_idx" ON "OrganizationMember" ("status"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS "AuditLog_actorUserId_idx" ON "AuditLog" ("actorUserId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "AuditLog_organizationId_idx" ON "AuditLog" ("organizationId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS "ApprovalRequest_requestedById_idx" ON "ApprovalRequest" ("requestedById"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "ApprovalRequest_reviewedById_idx" ON "ApprovalRequest" ("reviewedById"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "ApprovalRequest_organizationId_idx" ON "ApprovalRequest" ("organizationId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS "Lead_companyId_idx" ON "Lead" ("companyId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "Lead_organizationId_idx" ON "Lead" ("organizationId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS "Deal_companyId_idx" ON "Deal" ("companyId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "Deal_leadId_idx" ON "Deal" ("leadId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "Deal_organizationId_idx" ON "Deal" ("organizationId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS "Task_leadId_idx" ON "Task" ("leadId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "Task_assigneeId_idx" ON "Task" ("assigneeId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "Task_organizationId_idx" ON "Task" ("organizationId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS "Quotation_leadId_idx" ON "Quotation" ("leadId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "Quotation_organizationId_idx" ON "Quotation" ("organizationId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS "User_organizationId_idx" ON "User" ("organizationId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS "Invitation_roleId_idx" ON "Invitation" ("roleId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "Invitation_organizationId_idx" ON "Invitation" ("organizationId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS "ReportSnapshot_approvedById_idx" ON "ReportSnapshot" ("approvedById"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "ReportSnapshot_organizationId_idx" ON "ReportSnapshot" ("organizationId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS "WebhookEvent_organizationId_idx" ON "WebhookEvent" ("organizationId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "WebhookEvent_status_idx" ON "WebhookEvent" ("status"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS "AiUsageEvent_organizationId_idx" ON "AiUsageEvent" ("organizationId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS "Contact_companyId_idx" ON "Contact" ("companyId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "Contact_organizationId_idx" ON "Contact" ("organizationId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;

DO $$ BEGIN CREATE INDEX IF NOT EXISTS "Job_parentJobId_idx" ON "Job" ("parentJobId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "Job_organizationId_idx" ON "Job" ("organizationId"); EXCEPTION WHEN undefined_table OR undefined_column THEN null; END $$;
