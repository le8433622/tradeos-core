export * from "./types";
export * from "./adapters";

import { prisma } from "@tradeos/database";
import {
  DEFAULT_ADMIN_ROLES,
  DEFAULT_LOW_RISK_ROLES,
  registerAction,
  validateRecordBelongsToOrg,
} from "@tradeos/policy-core";
import { z } from "zod";

export const createEvidenceItemSchema = z
  .object({
    organizationId: z.string().min(1),
    sourcingRunId: z.string().min(1).optional(),
    relatedType: z.string().min(1).max(64),
    relatedId: z.string().min(1).optional(),
    evidenceType: z.string().min(1).max(64),
    title: z.string().min(1).max(512),
    description: z.string().max(4096).optional(),
    content: z.string().max(16384).optional(),
    fileUrl: z.string().max(1024).optional(),
    externalUrl: z.string().max(1024).optional(),
    hash: z.string().max(128).optional(),
    metadata: z.any().optional(),
  })
  .strict();

export const createEvidenceItemAction = registerAction<
  z.infer<typeof createEvidenceItemSchema>,
  { id: string }
>({
  name: "evidence.createItem",
  description: "Create an evidence item for a sourcing run or other entity.",
  riskLevel: "LOW",
  allowedRoles: DEFAULT_LOW_RISK_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = createEvidenceItemSchema.parse(input);
    if (parsed.sourcingRunId) {
      const run = await prisma.sourcingRun.findUnique({
        where: { id: parsed.sourcingRunId },
        select: { organizationId: true },
      });
      validateRecordBelongsToOrg(run, parsed.organizationId, "SOURCING_RUN");
    }
    const item = await prisma.evidenceItem.create({
      data: {
        organizationId: parsed.organizationId,
        sourcingRunId: parsed.sourcingRunId,
        relatedType: parsed.relatedType,
        relatedId: parsed.relatedId,
        evidenceType: parsed.evidenceType as any,
        title: parsed.title,
        description: parsed.description,
        content: parsed.content,
        fileUrl: parsed.fileUrl,
        externalUrl: parsed.externalUrl,
        hash: parsed.hash,
        metadata: parsed.metadata,
        capturedBy: context.actorUserId,
      },
      select: { id: true },
    });
    return { id: item.id };
  },
});

export const evidenceAttachToRunSchema = z
  .object({
    organizationId: z.string().min(1),
    evidenceId: z.string().min(1),
    sourcingRunId: z.string().min(1),
  })
  .strict();

export const evidenceAttachToRunAction = registerAction<
  z.infer<typeof evidenceAttachToRunSchema>,
  { id: string; sourcingRunId: string }
>({
  name: "evidence.attachToRun",
  description: "Attach an existing evidence item to a sourcing run.",
  riskLevel: "LOW",
  allowedRoles: DEFAULT_LOW_RISK_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = evidenceAttachToRunSchema.parse(input);
    const item = await prisma.evidenceItem.findUnique({
      where: { id: parsed.evidenceId },
      select: { organizationId: true },
    });
    validateRecordBelongsToOrg(item, parsed.organizationId, "EVIDENCE_ITEM");
    const run = await prisma.sourcingRun.findUnique({
      where: { id: parsed.sourcingRunId },
      select: { organizationId: true },
    });
    validateRecordBelongsToOrg(run, parsed.organizationId, "SOURCING_RUN");
    const updated = await prisma.evidenceItem.update({
      where: { id: parsed.evidenceId },
      data: { sourcingRunId: parsed.sourcingRunId },
      select: { id: true, sourcingRunId: true },
    });
    return { id: updated.id, sourcingRunId: updated.sourcingRunId! };
  },
});

export const evidenceExportLedgerSchema = z
  .object({
    organizationId: z.string().min(1),
    sourcingRunId: z.string().min(1).optional(),
    relatedType: z.string().max(64).optional(),
    relatedId: z.string().optional(),
  })
  .strict();

export const evidenceExportLedgerAction = registerAction<
  z.infer<typeof evidenceExportLedgerSchema>,
  { items: unknown[]; count: number }
>({
  name: "evidence.exportLedger",
  description:
    "Export evidence ledger for a sourcing run or entity. Requires AAL2.",
  riskLevel: "MEDIUM",
  allowedRoles: DEFAULT_ADMIN_ROLES,
  requiresApprovalForAI: false,
  handler: async (input, context) => {
    const parsed = evidenceExportLedgerSchema.parse(input);
    const where: Record<string, unknown> = {
      organizationId: parsed.organizationId,
    };
    if (parsed.sourcingRunId) where.sourcingRunId = parsed.sourcingRunId;
    if (parsed.relatedType) where.relatedType = parsed.relatedType;
    if (parsed.relatedId) where.relatedId = parsed.relatedId;
    const items = await prisma.evidenceItem.findMany({
      where: where as any,
      orderBy: { capturedAt: "desc" },
      select: {
        id: true,
        evidenceType: true,
        title: true,
        description: true,
        capturedAt: true,
        metadata: true,
        fileUrl: true,
        hash: true,
      },
    });
    const redacted = items.map((item) => ({
      ...item,
      metadata: item.metadata ? { exists: true, sensitive: true } : undefined,
    }));
    return { items: redacted, count: redacted.length };
  },
});
