import { NextResponse } from "next/server";
import { z } from "zod";
import { runTradeAgent } from "@tradeos/ai-core";
import { apiErrorResponse, withApiPermission } from "../../../lib/api-errors";
import {
  agentExecutionSchema,
  stripSessionManagedFields,
} from "../../../lib/validate";

export async function POST(request: Request) {
  try {
    const auth = await withApiPermission(request, "ai.use");
    if (auth.response) return auth.response;
    const { session } = auth;

    let body: Record<string, unknown>;
    try {
      body = agentExecutionSchema.parse(
        await request.json(),
      ) as unknown as Record<string, unknown>;
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

    body = stripSessionManagedFields(body);

    const channel = (body.channel as string) ?? "web";
    const result = await runTradeAgent(
      {
        organizationId: session.organizationId,
        channel: channel as "web" | "zalo" | "whatsapp" | "email" | "manual",
        text: body.text as string,
        customerName: body.customerName as string | undefined,
        customerPhone: body.customerPhone as string | undefined,
        customerEmail: body.customerEmail as string | undefined,
      },
      {
        actorUserId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        source: "ai",
        approved: false,
        mfaLevel: session.mfaLevel,
      },
    );

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}
