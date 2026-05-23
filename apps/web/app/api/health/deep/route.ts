import { NextResponse } from "next/server";
import { prisma } from "@tradeos/database";
import { createLogger, getRequestId } from "../../../../lib/logger";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    const secret = process.env.HEALTHCHECK_SECRET;
    const provided = request.headers.get("x-healthcheck-secret");
    if (!secret || provided !== secret) {
      return NextResponse.json(
        { ok: false, error: "HEALTHCHECK_UNAUTHORIZED" },
        { status: 401 },
      );
    }
  }

  const log = createLogger(getRequestId(request));
  const checks: Record<string, unknown> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Database unreachable";
    log.error("Health check failed: database", { error: message });
    checks.database = { ok: false, error: "DATABASE_UNREACHABLE" };
  }

  try {
    const pendingJobs = await prisma.job.count({
      where: { status: "PENDING", nextRunAt: { lte: new Date() } },
    });
    const failedJobs24h = await prisma.job.count({
      where: {
        status: "FAILED",
        updatedAt: { gte: new Date(Date.now() - ONE_DAY_MS) },
      },
    });
    checks.queue = { ok: true, pendingJobs, failedJobs24h };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Queue check failed";
    log.error("Health check failed: queue", { error: message });
    checks.queue = { ok: false, error: "QUEUE_CHECK_FAILED" };
  }

  const allOk = Object.values(checks).every((c: any) => c.ok === true);
  const status = allOk ? 200 : 503;

  return NextResponse.json(
    {
      ok: allOk,
      service: "tradeos-core-web",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status },
  );
}
