import { NextResponse } from "next/server";
import { prisma } from "@tradeos/database";
import { executeAction } from "@tradeos/policy-core";
import "@tradeos/quote-core";
import { apiErrorResponse, withApiSession } from "../../../../lib/api-errors";
import type { UserRole } from "@tradeos/database";

const ALLOWED_ROLES: UserRole[] = ["OWNER", "ADMIN"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await withApiSession(request, ALLOWED_ROLES);
    if (auth.response) return auth.response;
    const { session } = auth;

    const quote = await prisma.quoteDraft.findFirst({
      where: { id, organizationId: session.organizationId },
    });

    if (!quote) {
      return NextResponse.json({ error: "QUOTE_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json(quote);
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await withApiSession(request, ALLOWED_ROLES);
    if (auth.response) return auth.response;
    const { session } = auth;

    const body = await request.json();
    const { action, ...actionInput } = body;

    if (!action) {
      return NextResponse.json(
        {
          error:
            "action is required (approve|mark-sent|customer-accept|customer-reject)",
        },
        { status: 400 },
      );
    }

    const actionNameMap: Record<string, string> = {
      approve: "quote.approve",
      "mark-sent": "quote.markSent",
      "customer-accept": "quote.customerAccept",
      "customer-reject": "quote.customerReject",
    };

    const resolvedAction = actionNameMap[action];
    if (!resolvedAction) {
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 },
      );
    }

    const input: Record<string, unknown> = {
      organizationId: session.organizationId,
      quoteId: id,
      ...actionInput,
    };

    if (action === "customer-reject" && !input.rejectReason) {
      return NextResponse.json(
        { error: "rejectReason is required for customer-reject" },
        { status: 400 },
      );
    }

    const result = await executeAction(resolvedAction, input, {
      actorUserId: session.userId,
      organizationId: session.organizationId,
      role: session.role,
      source: "manual",
      mfaLevel: session.mfaLevel,
    });

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}
