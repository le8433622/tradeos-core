export type QueueClass =
  | "ai-extraction"
  | "webhook"
  | "billing"
  | "notification"
  | "analytics"
  | "maintenance";

export type QueueConfig = {
  concurrency: number;
  timeoutMs: number;
  maxRetries: number;
  backoffBaseMs: number;
  backoffCapMs: number;
  rateLimitPerOrg: number;
  rateLimitWindowMs: number;
  maxPayloadSizeBytes: number;
  requireIdempotency: boolean;
  deadLetterEnabled: boolean;
  maxDepth: number;
};

const DEFAULT_BACKOFF_CAP = 5 * 60 * 1000;

export const QUEUE_CONFIGS: Record<QueueClass, QueueConfig> = {
  "ai-extraction": {
    concurrency: 2,
    timeoutMs: 5 * 60 * 1000,
    maxRetries: 2,
    backoffBaseMs: 5000,
    backoffCapMs: 2 * 60 * 1000,
    rateLimitPerOrg: 5,
    rateLimitWindowMs: 60 * 1000,
    maxPayloadSizeBytes: 5 * 1024 * 1024,
    requireIdempotency: true,
    deadLetterEnabled: true,
    maxDepth: 3,
  },
  webhook: {
    concurrency: 10,
    timeoutMs: 30 * 1000,
    maxRetries: 3,
    backoffBaseMs: 1000,
    backoffCapMs: DEFAULT_BACKOFF_CAP,
    rateLimitPerOrg: 50,
    rateLimitWindowMs: 60 * 1000,
    maxPayloadSizeBytes: 1 * 1024 * 1024,
    requireIdempotency: true,
    deadLetterEnabled: true,
    maxDepth: 5,
  },
  billing: {
    concurrency: 1,
    timeoutMs: 30 * 1000,
    maxRetries: 5,
    backoffBaseMs: 2000,
    backoffCapMs: 30 * 1000,
    rateLimitPerOrg: 20,
    rateLimitWindowMs: 60 * 1000,
    maxPayloadSizeBytes: 512 * 1024,
    requireIdempotency: true,
    deadLetterEnabled: true,
    maxDepth: 1,
  },
  notification: {
    concurrency: 10,
    timeoutMs: 10 * 1000,
    maxRetries: 2,
    backoffBaseMs: 1000,
    backoffCapMs: 30 * 1000,
    rateLimitPerOrg: 100,
    rateLimitWindowMs: 60 * 1000,
    maxPayloadSizeBytes: 256 * 1024,
    requireIdempotency: false,
    deadLetterEnabled: false,
    maxDepth: 1,
  },
  analytics: {
    concurrency: 1,
    timeoutMs: 10 * 60 * 1000,
    maxRetries: 2,
    backoffBaseMs: 10000,
    backoffCapMs: 60 * 1000,
    rateLimitPerOrg: 5,
    rateLimitWindowMs: 60 * 1000,
    maxPayloadSizeBytes: 10 * 1024 * 1024,
    requireIdempotency: true,
    deadLetterEnabled: true,
    maxDepth: 1,
  },
  maintenance: {
    concurrency: 1,
    timeoutMs: 30 * 60 * 1000,
    maxRetries: 1,
    backoffBaseMs: 60000,
    backoffCapMs: 5 * 60 * 1000,
    rateLimitPerOrg: 1,
    rateLimitWindowMs: 3600 * 1000,
    maxPayloadSizeBytes: 10 * 1024 * 1024,
    requireIdempotency: true,
    deadLetterEnabled: false,
    maxDepth: 1,
  },
};

export function getQueueConfig(queue: QueueClass): QueueConfig {
  return QUEUE_CONFIGS[queue];
}

export function getQueueForJobType(type: string): QueueClass {
  if (type.startsWith("AI_") || type.startsWith("EXTRACT_")) return "ai-extraction";
  if (type.startsWith("WEBHOOK_") || type.startsWith("PROCESS_WEBHOOK")) return "webhook";
  if (type.startsWith("BILLING_") || type.startsWith("INVOICE_") || type.startsWith("PAYMENT_")) return "billing";
  if (type.startsWith("NOTIFY_") || type.startsWith("SEND_")) return "notification";
  if (type.startsWith("ANALYTICS_") || type.startsWith("REPORT_")) return "analytics";
  return "maintenance";
}

export class RateLimiter {
  private window: Map<string, number[]> = new Map();

  isRateLimited(orgId: string, config: QueueConfig): boolean {
    const now = Date.now();
    const timestamps = this.window.get(orgId) ?? [];
    const recent = timestamps.filter((t) => now - t < config.rateLimitWindowMs);
    this.window.set(orgId, recent);
    return recent.length >= config.rateLimitPerOrg;
  }

  record(orgId: string): void {
    const timestamps = this.window.get(orgId) ?? [];
    timestamps.push(Date.now());
    this.window.set(orgId, timestamps);
  }

  reset(): void {
    this.window.clear();
  }
}

export function validatePayloadSize(payload: unknown, maxBytes: number): boolean {
  const serialized = JSON.stringify(payload);
  return new TextEncoder().encode(serialized).length <= maxBytes;
}

export function validateDepth(input: {
  parentJobId?: string | null;
  depth?: number | null;
  maxDepth: number;
}): boolean {
  const currentDepth = input.depth ?? 0;
  return currentDepth < input.maxDepth;
}

export function validateQueueConfig(config: QueueConfig): string[] {
  const errors: string[] = [];
  if (config.concurrency < 1) errors.push("concurrency must be >= 1");
  if (config.timeoutMs < 100) errors.push("timeoutMs must be >= 100");
  if (config.maxRetries < 0) errors.push("maxRetries must be >= 0");
  if (config.backoffBaseMs < 100) errors.push("backoffBaseMs must be >= 100");
  if (config.backoffCapMs < config.backoffBaseMs) errors.push("backoffCapMs must be >= backoffBaseMs");
  if (config.rateLimitPerOrg < 1) errors.push("rateLimitPerOrg must be >= 1");
  if (config.rateLimitWindowMs < 1000) errors.push("rateLimitWindowMs must be >= 1000");
  if (config.maxPayloadSizeBytes < 1024) errors.push("maxPayloadSizeBytes must be >= 1024");
  if (config.maxDepth < 1) errors.push("maxDepth must be >= 1");
  return errors;
}

export function validateAllConfigs(): Record<string, string[]> {
  const results: Record<string, string[]> = {};
  for (const [name, config] of Object.entries(QUEUE_CONFIGS)) {
    const errors = validateQueueConfig(config);
    if (errors.length > 0) results[name] = errors;
  }
  return results;
}
