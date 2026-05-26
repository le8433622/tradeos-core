#!/usr/bin/env node

/**
 * Audit chain validation script.
 *
 * Usage:
 *   node scripts/verify-audit-chain.mjs --organizationId=<id>
 *   node scripts/verify-audit-chain.mjs --organizationId=<id> --subjectType=sourcingRun --subjectId=<id>
 */

import { createHash } from "node:crypto";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.join("=")];
  }),
);

const { organizationId, subjectType, subjectId } = args;

if (!organizationId) {
  console.error("Usage: node scripts/verify-audit-chain.mjs --organizationId=<orgId> [--subjectType=<type> --subjectId=<id>]");
  process.exit(1);
}

function canonicalJson(value) {
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
    const keys = Object.keys(value).sort();
    const pairs = keys
      .filter((k) => value[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`);
    return `{${pairs.join(",")}}`;
  }
  return "null";
}

function computeEventHash(event) {
  const stable = canonicalJson({
    organizationId: event.organizationId,
    actorUserId: event.actorUserId ?? null,
    eventType: event.eventType,
    subjectType: event.subjectType,
    subjectId: event.subjectId,
    actionName: event.actionName ?? null,
    riskLevel: event.riskLevel ?? null,
    inputHash: event.inputHash ?? null,
    resultHash: event.resultHash ?? null,
    evidenceIds: event.evidenceIds ?? null,
    payload: event.payload ?? null,
    redactedPayload: event.redactedPayload ?? null,
    previousHash: event.previousHash ?? null,
    createdAt: new Date(event.createdAt).toISOString(),
  });
  return createHash("sha256").update(stable).digest("hex");
}

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    const where = { organizationId };
    if (subjectType && subjectId) {
      where.subjectType = subjectType;
      where.subjectId = subjectId;
    }

    const events = await prisma.immutableAuditEvent.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });

    console.log(`\nVerifying ${events.length} events for org ${organizationId}${subjectType ? ` (${subjectType}:${subjectId})` : ""}:\n`);

    if (events.length === 0) {
      console.log("No events found.");
      process.exit(0);
    }

    let isValid = true;
    let expectedPreviousHash = null;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const line = `[${i + 1}/${events.length}] ${event.eventType.padEnd(30)} ${event.id.slice(0, 12)}...`;

      if (event.previousHash !== expectedPreviousHash) {
        console.log(`${line} ❌ Previous hash mismatch`);
        console.log(`     Expected: ${expectedPreviousHash ?? "null"}`);
        console.log(`     Got:      ${event.previousHash ?? "null"}`);
        isValid = false;
        continue;
      }

      const recomputed = computeEventHash(event);
      if (recomputed !== event.eventHash) {
        console.log(`${line} ❌ Event hash mismatch`);
        console.log(`     Computed: ${recomputed.slice(0, 16)}...`);
        console.log(`     Stored:   ${event.eventHash.slice(0, 16)}...`);
        isValid = false;
        continue;
      }

      expectedPreviousHash = event.eventHash;
      console.log(`${line} ✅`);
    }

    console.log(`\n${isValid ? "✅ Chain valid" : "❌ Chain invalid"} — ${events.length} events verified.\n`);
    process.exit(isValid ? 0 : 1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
