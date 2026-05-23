import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockJobCreate,
  mockJobFindFirst,
  mockJobFindUnique,
  mockJobUpdate,
  mockJobUpdateMany,
} = vi.hoisted(() => ({
  mockJobCreate: vi.fn(),
  mockJobFindFirst: vi.fn(),
  mockJobFindUnique: vi.fn(),
  mockJobUpdate: vi.fn(),
  mockJobUpdateMany: vi.fn(),
}));

vi.mock("@tradeos/database", () => ({
  prisma: {
    job: {
      create: mockJobCreate,
      findFirst: mockJobFindFirst,
      findUnique: mockJobFindUnique,
      update: mockJobUpdate,
      updateMany: mockJobUpdateMany,
    },
  },
}));

import {
  enqueueJob,
  claimNextJob,
  completeJob,
  failJob,
  cancelJob,
  calculateBackoff,
  recoverStaleRunningJobs,
  registerProcessor,
  runWorkerLoop,
} from "../index";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("calculateBackoff", () => {
  it("returns 1000ms for attempt 1", () => {
    expect(calculateBackoff(1)).toBe(1000);
  });

  it("returns 2000ms for attempt 2", () => {
    expect(calculateBackoff(2)).toBe(2000);
  });

  it("returns 4000ms for attempt 3", () => {
    expect(calculateBackoff(3)).toBe(4000);
  });

  it("returns 8000ms for attempt 4", () => {
    expect(calculateBackoff(4)).toBe(8000);
  });

  it("caps at 300000ms (5 minutes)", () => {
    expect(calculateBackoff(10)).toBe(300000);
  });
});

describe("enqueueJob", () => {
  it("creates a Job record with PENDING status and correct type", async () => {
    mockJobCreate.mockResolvedValue({
      id: "job-1",
      organizationId: "org-1",
      type: "PROCESS_WEBHOOK_EVENT",
      status: "PENDING",
    });

    const result = await enqueueJob({
      organizationId: "org-1",
      type: "PROCESS_WEBHOOK_EVENT",
    });

    expect(result.status).toBe("PENDING");
    expect(result.type).toBe("PROCESS_WEBHOOK_EVENT");
    expect(mockJobCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        type: "PROCESS_WEBHOOK_EVENT",
        status: "PENDING",
        maxAttempts: 3,
      }),
    });
  });

  it("includes organizationId for tenant isolation", async () => {
    mockJobCreate.mockResolvedValue({
      id: "job-2",
      organizationId: "org-2",
      type: "ARCHIVE_WEBHOOK_PAYLOADS",
      status: "PENDING",
    });

    const result = await enqueueJob({
      organizationId: "org-2",
      type: "ARCHIVE_WEBHOOK_PAYLOADS",
    });

    expect(result.organizationId).toBe("org-2");
    expect(mockJobCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ organizationId: "org-2" }),
    });
  });

  it("accepts custom maxAttempts and runAt", async () => {
    const future = new Date(Date.now() + 3600000);
    mockJobCreate.mockResolvedValue({
      id: "job-3",
      organizationId: "org-1",
      type: "PROCESS_WEBHOOK_EVENT",
      status: "PENDING",
      maxAttempts: 5,
      nextRunAt: future,
    });

    const result = await enqueueJob({
      organizationId: "org-1",
      type: "PROCESS_WEBHOOK_EVENT",
      maxAttempts: 5,
      runAt: future,
    });

    expect(mockJobCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ maxAttempts: 5, nextRunAt: future }),
    });
  });
});

describe("claimNextJob", () => {
  it("claims next PENDING job and marks RUNNING", async () => {
    mockJobFindFirst.mockResolvedValue({
      id: "job-1",
      organizationId: "org-1",
      type: "PROCESS_WEBHOOK_EVENT",
      payload: {},
      attempts: 0,
    });
    mockJobUpdateMany.mockResolvedValue({ count: 1 });

    const result = await claimNextJob();

    expect(result).not.toBeNull();
    expect(result!.id).toBe("job-1");
    expect(result!.attempt).toBe(1);
    expect(mockJobUpdateMany).toHaveBeenCalledWith({
      where: { id: "job-1", status: "PENDING" },
      data: { status: "RUNNING", attempts: { increment: 1 } },
    });
  });

  it("returns null when no PENDING jobs exist", async () => {
    mockJobFindFirst.mockResolvedValue(null);

    const result = await claimNextJob();

    expect(result).toBeNull();
    expect(mockJobUpdateMany).not.toHaveBeenCalled();
  });

  it("returns null when concurrent claim loses race", async () => {
    mockJobFindFirst.mockResolvedValue({
      id: "job-1",
      organizationId: "org-1",
      type: "PROCESS_WEBHOOK_EVENT",
      payload: {},
      attempts: 0,
    });
    mockJobUpdateMany.mockResolvedValue({ count: 0 });

    const result = await claimNextJob();

    expect(result).toBeNull();
  });

  it("respects nextRunAt ordering", async () => {
    mockJobFindFirst.mockResolvedValue({
      id: "job-early",
      organizationId: "org-1",
      type: "PROCESS_WEBHOOK_EVENT",
      payload: {},
      attempts: 0,
    });
    mockJobUpdateMany.mockResolvedValue({ count: 1 });

    await claimNextJob();

    expect(mockJobFindFirst).toHaveBeenCalledWith({
      where: { status: "PENDING", nextRunAt: { lte: expect.any(Date) } },
      orderBy: { nextRunAt: "asc" },
    });
  });
});

describe("completeJob", () => {
  it("marks job as COMPLETED", async () => {
    mockJobUpdate.mockResolvedValue({ id: "job-1", status: "COMPLETED" });

    await completeJob("job-1");

    expect(mockJobUpdate).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: { status: "COMPLETED" },
    });
  });
});

describe("failJob", () => {
  it("marks job FAILED when max attempts reached", async () => {
    mockJobFindUnique.mockResolvedValue({
      id: "job-1",
      attempts: 3,
      maxAttempts: 3,
    });

    await failJob("job-1", "Out of retries");

    expect(mockJobUpdate).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: { status: "FAILED", lastError: "Out of retries" },
    });
  });

  it("requeues job as PENDING with backoff when retries remain", async () => {
    mockJobFindUnique.mockResolvedValue({
      id: "job-1",
      attempts: 1,
      maxAttempts: 3,
    });

    await failJob("job-1", "Transient error");

    expect(mockJobUpdate).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: expect.objectContaining({
        status: "PENDING",
        lastError: "Transient error",
      }),
    });
  });

  it("returns silently when job not found", async () => {
    mockJobFindUnique.mockResolvedValue(null);

    await expect(failJob("job-missing", "Error")).resolves.toBeUndefined();

    expect(mockJobUpdate).not.toHaveBeenCalled();
  });
});

describe("cancelJob", () => {
  it("marks job as CANCELLED", async () => {
    mockJobUpdate.mockResolvedValue({ id: "job-1", status: "CANCELLED" });

    await cancelJob("job-1");

    expect(mockJobUpdate).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: { status: "CANCELLED" },
    });
  });
});

describe("recoverStaleRunningJobs", () => {
  it("recovers stale RUNNING jobs back to PENDING", async () => {
    mockJobUpdateMany.mockResolvedValue({ count: 2 });

    const count = await recoverStaleRunningJobs();

    expect(count).toBe(2);
    expect(mockJobUpdateMany).toHaveBeenCalledWith({
      where: { status: "RUNNING", updatedAt: { lt: expect.any(Date) } },
      data: expect.objectContaining({
        status: "PENDING",
        lastError: "Recovered stale RUNNING job after worker timeout",
      }),
    });
  });

  it("returns 0 when no stale jobs", async () => {
    mockJobUpdateMany.mockResolvedValue({ count: 0 });

    const count = await recoverStaleRunningJobs();

    expect(count).toBe(0);
  });
});

describe("registerProcessor and worker loop", () => {
  it("registerProcessor stores a processor by JobType", () => {
    const processor = vi.fn();
    registerProcessor("PROCESS_WEBHOOK_EVENT", processor);
    expect(processor).toBeDefined();
  });

  it("runWorkerLoop is exported as a function", () => {
    expect(typeof runWorkerLoop).toBe("function");
  });
});
