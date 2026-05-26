import { assertKillSwitchEnabled } from "@tradeos/policy-core";
import { prisma, type Job, type JobType, type Prisma } from "@tradeos/database";
import {
  getQueueConfig,
  getQueueForJobType,
  RateLimiter,
  validatePayloadSize,
  validateDepth,
  QUEUE_CONFIGS,
  type QueueClass,
  type QueueConfig,
} from "./queue-config";

export {
  getQueueConfig,
  getQueueForJobType,
  RateLimiter,
  validatePayloadSize,
  validateDepth,
};
export {
  validateQueueConfig,
  validateAllConfigs,
  QUEUE_CONFIGS,
} from "./queue-config";
export type { QueueClass, QueueConfig } from "./queue-config";
export type { Job, JobType } from "@tradeos/database";

const MAX_BACKOFF_MS = 5 * 60 * 1000;

export type EnqueueJobInput = {
  organizationId: string;
  type: JobType;
  payload?: Record<string, unknown>;
  maxAttempts?: number;
  runAt?: Date;
  parentJobId?: string;
  depth?: number;
};

export async function enqueueJob(input: EnqueueJobInput): Promise<Job> {
  const queue = getQueueForJobType(input.type);
  const config = getQueueConfig(queue);

  if (input.payload) {
    if (!validatePayloadSize(input.payload, config.maxPayloadSizeBytes)) {
      throw new Error(
        `PAYLOAD_TOO_LARGE: ${input.type} exceeds ${config.maxPayloadSizeBytes} byte limit`,
      );
    }
  }

  if (
    !validateDepth({
      parentJobId: input.parentJobId,
      depth: input.depth,
      maxDepth: config.maxDepth,
    })
  ) {
    throw new Error(
      `DEPTH_EXCEEDED: ${input.type} exceeds max recursion depth of ${config.maxDepth}`,
    );
  }

  return prisma.job.create({
    data: {
      organizationId: input.organizationId,
      type: input.type,
      status: "PENDING",
      payload: (input.payload ?? {}) as Prisma.InputJsonValue,
      maxAttempts: input.maxAttempts ?? config.maxRetries,
      nextRunAt: input.runAt ?? new Date(),
      parentJobId: input.parentJobId,
      depth: input.depth ?? 0,
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

async function claimNextJobWhere(
  where: Prisma.JobWhereInput,
): Promise<ClaimedJob | null> {
  const job = await prisma.job.findFirst({
    where: {
      ...where,
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

export async function claimNextJob(): Promise<ClaimedJob | null> {
  return claimNextJobWhere({});
}

export async function claimNextJobForQueue(
  queue: QueueClass,
): Promise<ClaimedJob | null> {
  const types = getJobTypesForQueue(queue);
  return claimNextJobWhere({ type: { in: types } });
}

export function getJobTypesForQueue(queue: QueueClass): JobType[] {
  switch (queue) {
    case "ai-extraction":
      return [
        "AI_EXTRACTION",
        "EXTRACT_DOCUMENT",
        "EXTRACT_EMBEDDING",
        "EXTRACT_ANALYZE",
      ] as JobType[];
    case "webhook":
      return ["PROCESS_WEBHOOK_EVENT"] as JobType[];
    case "billing":
      return [
        "BILLING_PROCESS",
        "INVOICE_GENERATE",
        "PAYMENT_PROCESS",
      ] as JobType[];
    case "notification":
      return ["NOTIFY_EMAIL", "NOTIFY_SMS", "SEND_ALERT"] as JobType[];
    case "analytics":
      return [
        "ANALYTICS_REPORT",
        "REPORT_GENERATE",
        "ANALYTICS_EXPORT",
      ] as JobType[];
    case "maintenance":
      return [
        "ARCHIVE_WEBHOOK_PAYLOADS",
        "MAINTENANCE_CLEANUP",
        "MAINTENANCE_RECONCILE",
      ] as JobType[];
    default:
      return [];
  }
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

export function calculateBackoff(retryCount: number, baseMs = 1000): number {
  const delayMs = baseMs * Math.pow(2, retryCount - 1);
  return Math.min(delayMs, MAX_BACKOFF_MS);
}

export async function failJob(
  id: string,
  error: string,
  queue?: QueueClass,
): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) return;

  const config = queue ? getQueueConfig(queue) : null;
  const maxAttempts = config?.maxRetries ?? job.maxAttempts;

  if (job.attempts >= maxAttempts) {
    if (config?.deadLetterEnabled) {
      await prisma.job.update({
        where: { id },
        data: {
          status: "DEAD_LETTER",
          lastError: error,
        },
      });
    } else {
      await prisma.job.update({
        where: { id },
        data: { status: "FAILED", lastError: error },
      });
    }
  } else {
    const backoffBase = config?.backoffBaseMs ?? 1000;
    const nextDelay = calculateBackoff(job.attempts, backoffBase);
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

const processors = new Map<string, JobProcessor>();

export function registerProcessor(type: string, processor: JobProcessor): void {
  processors.set(type, processor);
}

function processJobWithTimeout(
  job: ClaimedJob,
  processor: JobProcessor,
  timeoutMs: number,
): Promise<void> {
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<void>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`JOB_TIMEOUT: ${job.type} exceeded ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([
    processor(job).finally(() => clearTimeout(timer!)),
    timeoutPromise,
  ]);
}

const rateLimiter = new RateLimiter();
const activeCounters: Record<string, number> = {};
const POLL_INTERVAL_MS = 1000;

export type WorkerOptions = {
  queues?: QueueClass[];
  pollIntervalMs?: number;
};

export async function runWorkerLoop(options?: WorkerOptions): Promise<void> {
  assertKillSwitchEnabled("WORKER_CONSUMING_ENABLED");
  const allQueues = Object.keys(QUEUE_CONFIGS) as QueueClass[];
  const queues = options?.queues ?? allQueues;

  const pollInterval = options?.pollIntervalMs ?? POLL_INTERVAL_MS;
  let running = true;

  const shutdown = () => {
    running = false;
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  const loops = queues.map((queue) =>
    runSingleQueueLoop(queue, pollInterval, () => running),
  );
  await Promise.all(loops);
}

async function runSingleQueueLoop(
  queue: QueueClass,
  pollInterval: number,
  isRunning: () => boolean,
): Promise<void> {
  const config = getQueueConfig(queue);
  const activeKey = `queue:${queue}`;
  activeCounters[activeKey] = 0;

  while (isRunning()) {
    await recoverStaleRunningJobs();

    if (activeCounters[activeKey] >= config.concurrency) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      continue;
    }

    const job = await claimNextJobForQueue(queue);
    if (!job) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      continue;
    }

    if (rateLimiter.isRateLimited(job.organizationId, config)) {
      await failJob(
        job.id,
        `RATE_LIMITED: ${job.organizationId} exceeded rate limit for ${queue}`,
        queue,
      );
      continue;
    }

    activeCounters[activeKey]++;

    processJob(job, queue, config, activeKey).finally(() => {
      activeCounters[activeKey]--;
    });
  }
}

async function processJob(
  job: ClaimedJob,
  queue: QueueClass,
  config: QueueConfig,
  _activeKey: string,
): Promise<void> {
  const processor = processors.get(job.type);
  if (!processor) {
    await failJob(job.id, `No processor registered for ${job.type}`, queue);
    return;
  }

  rateLimiter.record(job.organizationId);

  try {
    await processJobWithTimeout(job, processor, config.timeoutMs);
    await completeJob(job.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await failJob(job.id, message, queue);
  }
}
