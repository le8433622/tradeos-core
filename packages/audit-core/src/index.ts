import { createHash } from "node:crypto";
import { prisma, type ImmutableAuditEventType, type ActionRiskLevel } from "@tradeos/database";

export type { ImmutableAuditEventType } from "@tradeos/database";

export type AppendAuditEventParams = {
  organizationId: string;
  actorUserId?: string;
  eventType: ImmutableAuditEventType;
  subjectType: string;
  subjectId: string;
  actionName?: string;
  riskLevel?: ActionRiskLevel;
  inputHash?: string;
  resultHash?: string;
  evidenceIds?: string[];
  payload?: unknown;
  redactedPayload?: unknown;
};

export type AuditEventRecord = {
  id: string;
  organizationId: string;
  actorUserId: string | null;
  eventType: ImmutableAuditEventType;
  subjectType: string;
  subjectId: string;
  actionName: string | null;
  riskLevel: ActionRiskLevel | null;
  inputHash: string | null;
  resultHash: string | null;
  evidenceIds: string | null;
  payload: unknown;
  redactedPayload: unknown;
  previousHash: string | null;
  eventHash: string;
  createdAt: Date;
};

export function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (Number.isFinite(value)) return String(value);
    return "null";
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    const items = value.map(canonicalJson);
    return `[${items.join(",")}]`;
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const pairs = keys
      .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`);
    return `{${pairs.join(",")}}`;
  }
  return "null";
}

function hashPayload(payload: string): string {
  return createHash("sha256").update(payload).digest("hex");
}

function computeEventHash(params: {
  organizationId: string;
  actorUserId: string | undefined;
  eventType: string;
  subjectType: string;
  subjectId: string;
  actionName: string | undefined;
  riskLevel: string | undefined;
  inputHash: string | undefined;
  resultHash: string | undefined;
  evidenceIds: string | undefined;
  payload: unknown;
  redactedPayload: unknown;
  previousHash: string | null;
  createdAt: string;
}): string {
  const stable = canonicalJson({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId ?? null,
    eventType: params.eventType,
    subjectType: params.subjectType,
    subjectId: params.subjectId,
    actionName: params.actionName ?? null,
    riskLevel: params.riskLevel ?? null,
    inputHash: params.inputHash ?? null,
    resultHash: params.resultHash ?? null,
    evidenceIds: params.evidenceIds ?? null,
    payload: params.payload ?? null,
    redactedPayload: params.redactedPayload ?? null,
    previousHash: params.previousHash ?? null,
    createdAt: params.createdAt,
  });
  return hashPayload(stable);
}

async function getLatestEvent(
  organizationId: string,
): Promise<Pick<AuditEventRecord, "eventHash"> | null> {
  return prisma.immutableAuditEvent.findFirst({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: { eventHash: true },
  });
}

export async function appendAuditEvent(
  params: AppendAuditEventParams,
): Promise<AuditEventRecord> {
  const previous = await getLatestEvent(params.organizationId);
  const previousHash = previous?.eventHash ?? null;
  const createdAt = new Date().toISOString();

  const eventHash = computeEventHash({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    eventType: params.eventType,
    subjectType: params.subjectType,
    subjectId: params.subjectId,
    actionName: params.actionName,
    riskLevel: params.riskLevel,
    inputHash: params.inputHash,
    resultHash: params.resultHash,
    evidenceIds: params.evidenceIds ? JSON.stringify(params.evidenceIds) : undefined,
    payload: params.payload,
    redactedPayload: params.redactedPayload,
    previousHash,
    createdAt,
  });

  return prisma.immutableAuditEvent.create({
    data: {
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      eventType: params.eventType,
      subjectType: params.subjectType,
      subjectId: params.subjectId,
      actionName: params.actionName,
      riskLevel: params.riskLevel,
      inputHash: params.inputHash,
      resultHash: params.resultHash,
      evidenceIds: params.evidenceIds ? JSON.stringify(params.evidenceIds) : undefined,
      payload: params.payload !== undefined ? JSON.parse(JSON.stringify(params.payload)) : undefined,
      redactedPayload: params.redactedPayload !== undefined ? JSON.parse(JSON.stringify(params.redactedPayload)) : undefined,
      previousHash,
      eventHash,
    },
  }) as unknown as AuditEventRecord;
}

export async function getChain(params: {
  organizationId: string;
  subjectType?: string;
  subjectId?: string;
  limit?: number;
}): Promise<AuditEventRecord[]> {
  return prisma.immutableAuditEvent.findMany({
    where: {
      organizationId: params.organizationId,
      ...(params.subjectType && params.subjectId
        ? { subjectType: params.subjectType, subjectId: params.subjectId }
        : {}),
    },
    orderBy: { createdAt: "asc" },
    take: params.limit ?? 100,
  }) as unknown as AuditEventRecord[];
}

export type ValidationResult = {
  valid: boolean;
  totalEvents: number;
  errors: Array<{ id: string; index: number; reason: string }>;
};

export async function validateChain(params: {
  organizationId: string;
  subjectType?: string;
  subjectId?: string;
}): Promise<ValidationResult> {
  const events = await getChain({
    organizationId: params.organizationId,
    subjectType: params.subjectType,
    subjectId: params.subjectId,
    limit: 10000,
  });

  const errors: ValidationResult["errors"] = [];
  let expectedPreviousHash: string | null = null;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    if (event.previousHash !== expectedPreviousHash) {
      errors.push({
        id: event.id,
        index: i,
        reason: `Previous hash mismatch: expected ${expectedPreviousHash ?? "null"}, got ${event.previousHash ?? "null"}`,
      });
    }

    const recomputedHash = computeEventHash({
      organizationId: event.organizationId,
      actorUserId: event.actorUserId ?? undefined,
      eventType: event.eventType,
      subjectType: event.subjectType,
      subjectId: event.subjectId,
      actionName: event.actionName ?? undefined,
      riskLevel: event.riskLevel ?? undefined,
      inputHash: event.inputHash ?? undefined,
      resultHash: event.resultHash ?? undefined,
      evidenceIds: event.evidenceIds ?? undefined,
      payload: event.payload,
      redactedPayload: event.redactedPayload,
      previousHash: event.previousHash,
      createdAt: event.createdAt.toISOString(),
    });

    if (recomputedHash !== event.eventHash) {
      errors.push({
        id: event.id,
        index: i,
        reason: `Event hash mismatch: recomputed ${recomputedHash}, stored ${event.eventHash}`,
      });
    }

    expectedPreviousHash = event.eventHash;
  }

  return {
    valid: errors.length === 0,
    totalEvents: events.length,
    errors,
  };
}

export function computeHashForVerification(event: AuditEventRecord): string {
  return computeEventHash({
    organizationId: event.organizationId,
    actorUserId: event.actorUserId ?? undefined,
    eventType: event.eventType,
    subjectType: event.subjectType,
    subjectId: event.subjectId,
    actionName: event.actionName ?? undefined,
    riskLevel: event.riskLevel ?? undefined,
    inputHash: event.inputHash ?? undefined,
    resultHash: event.resultHash ?? undefined,
    evidenceIds: event.evidenceIds ?? undefined,
    payload: event.payload,
    redactedPayload: event.redactedPayload,
    previousHash: event.previousHash,
    createdAt: event.createdAt.toISOString(),
  });
}
