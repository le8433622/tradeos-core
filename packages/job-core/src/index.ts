import { prisma, type Job, type JobType, type Prisma } from "@tradeos/database";

export type { Job, JobType } from "@tradeos/database";

const MAX_BACKOFF_MS = 5 * 60 * 1000;

export type EnqueueJobInput = {
  organizationId: string;
  type: JobType;
  payload?: Record<string, unknown>;
  maxAttempts?: number;
  runAt?: Date;
};

export async function enqueueJob(input: EnqueueJobInput): Promise<Job> {
  return prisma.job.create({
    data: {
      organizationId: input.organizationId,
      type: input.type,
      status: "PENDING",
      payload: (input.payload ?? {}) as Prisma.InputJsonValue,
      maxAttempts: input.maxAttempts ?? 3,
      nextRunAt: input.runAt ?? new Date(),
    },
  });
}

export type ClaimedJob = {
  id: string;
  organizationId: string;
  type: JobType;
  payload: Record<string, unknown> | null;
  attempt: number;
};

export async function claimNextJob(): Promise<ClaimedJob | null> {
  const job = await prisma.job.findFirst({
    where: {
      status: "PENDING",
      nextRunAt: { lte: new Date() },
    },
    orderBy: { nextRunAt: "asc" },
  });
  if (!job) return null;

  const result = await prisma.job.updateMany({
    where: { id: job.id, status: "PENDING" },
    data: { status: "RUNNING", attempts: { increment: 1 } },
  });
  if (result.count === 0) return null;

  return {
    id: job.id,
    organizationId: job.organizationId,
    type: job.type,
    payload: job.payload as Record<string, unknown> | null,
    attempt: job.attempts + 1,
  };
}

export async function recoverStaleRunningJobs(
  timeoutMs = 5 * 60 * 1000,
): Promise<number> {
  const staleBefore = new Date(Date.now() - timeoutMs);
  const result = await prisma.job.updateMany({
    where: {
      status: "RUNNING",
      updatedAt: { lt: staleBefore },
    },
    data: {
      status: "PENDING",
      lastError: "Recovered stale RUNNING job after worker timeout",
      nextRunAt: new Date(),
    },
  });
  return result.count;
}

export async function completeJob(id: string): Promise<void> {
  await prisma.job.update({
    where: { id },
    data: { status: "COMPLETED" },
  });
}

export function calculateBackoff(retryCount: number): number {
  const delayMs = 1000 * Math.pow(2, retryCount - 1);
  return Math.min(delayMs, MAX_BACKOFF_MS);
}

export async function failJob(id: string, error: string): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) return;

  if (job.attempts >= job.maxAttempts) {
    await prisma.job.update({
      where: { id },
      data: { status: "FAILED", lastError: error },
    });
  } else {
    const nextDelay = calculateBackoff(job.attempts);
    await prisma.job.update({
      where: { id },
      data: {
        status: "PENDING",
        lastError: error,
        nextRunAt: new Date(Date.now() + nextDelay),
      },
    });
  }
}

export async function cancelJob(id: string): Promise<void> {
  await prisma.job.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
}

export type JobProcessor = (job: ClaimedJob) => Promise<void>;

const processors = new Map<JobType, JobProcessor>();

export function registerProcessor(
  type: JobType,
  processor: JobProcessor,
): void {
  processors.set(type, processor);
}

const DEFAULT_POLL_INTERVAL_MS = 1000;

export async function runWorkerLoop(options?: {
  pollIntervalMs?: number;
}): Promise<void> {
  const pollInterval = options?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  let running = true;

  const shutdown = () => {
    running = false;
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  while (running) {
    await recoverStaleRunningJobs();
    const job = await claimNextJob();
    if (job) {
      const processor = processors.get(job.type);
      if (!processor) {
        await failJob(job.id, `No processor registered for ${job.type}`);
        continue;
      }
      try {
        await processor(job);
        await completeJob(job.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await failJob(job.id, message);
      }
    } else {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }
}
