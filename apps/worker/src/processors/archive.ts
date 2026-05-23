import { prisma, Prisma } from "@tradeos/database";
import {
  redactWebhookPayload,
  getRetentionArchiveDays,
} from "@tradeos/webhook-core";
import type { ClaimedJob } from "@tradeos/job-core";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function archiveWebhookPayloads(job: ClaimedJob): Promise<void> {
  const payload = (job.payload ?? {}) as Record<string, unknown>;
  const organizationId = (payload.organizationId ??
    job.organizationId) as string;

  const retentionDays = getRetentionArchiveDays();
  const cutoff = new Date(Date.now() - retentionDays * ONE_DAY_MS);

  const events = await prisma.webhookEvent.findMany({
    where: {
      organizationId,
      receivedAt: { lt: cutoff },
      payload: { not: Prisma.DbNull },
    },
    select: { id: true },
    take: 500,
  });

  if (events.length === 0) return;

  for (const event of events) {
    await redactWebhookPayload(event.id, organizationId);
  }

  const remaining = await prisma.webhookEvent.count({
    where: {
      organizationId,
      receivedAt: { lt: cutoff },
      payload: { not: Prisma.DbNull },
    },
  });

  if (remaining > 0) {
    throw new Error(
      `Archived ${events.length} events, ${remaining} remaining — batch complete, will continue next run`,
    );
  }
}
