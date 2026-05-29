import { NextResponse } from "next/server";
import { executeAction } from "@tradeos/policy-core";
import { prisma } from "@tradeos/database";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../../lib/api-errors";
import { z } from "zod";
import { sendReportDeliveryNotification } from "../../../../../lib/email";
import { createLogger, getRequestId } from "../../../../../lib/logger";
import "@tradeos/sourcing-core";

const assignSchema = z
  .object({
    sourcingRunId: z.string().min(1),
    assignedToEmail: z.string().email().max(256),
    notes: z.string().max(1024).optional(),
  })
  .strict();

export async function POST(request: Request) {
  try {
    const auth = await withApiPermission(request, "sourcing.manage");
    if (auth.response) return auth.response;
    const { session } = auth;
    const logger = createLogger(getRequestId(request));

    let body: Record<string, unknown>;
    try {
      body = assignSchema.parse(await request.json()) as unknown as Record<
        string,
        unknown
      >;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return Response.json(
          {
            error: "VALIDATION_ERROR",
            issues: error.issues.map((i) => ({
              path: i.path.join("."),
              message: i.message,
            })),
          },
          { status: 400 },
        );
      }
      throw error;
    }

    const assignedToEmail = (body.assignedToEmail as string)
      .trim()
      .toLowerCase();
    const result = await executeAction(
      "sourcing.assignBuyerReport",
      {
        organizationId: session.organizationId,
        sourcingRunId: body.sourcingRunId as string,
        assignedToEmail,
        notes: body.notes as string | undefined,
      },
      {
        actorUserId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        source: "manual",
        mfaLevel: session.mfaLevel,
      },
    );

    // Send notification email to buyer
    const run = await prisma.sourcingRun.findUnique({
      where: { id: body.sourcingRunId as string },
      select: { title: true, organization: { select: { name: true } } },
    });
    if (run) {
      const appUrl = process.env.APP_URL ?? "https://tradeos-core.vercel.app";
      sendReportDeliveryNotification(
        assignedToEmail,
        run.title,
        run.organization.name,
        `${appUrl}/buyer/reports/${body.sourcingRunId}`,
        body.notes as string | undefined,
      ).catch((err) =>
        logger.error("[assign] email notification failed", {
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}
