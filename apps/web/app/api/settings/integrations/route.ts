import { NextResponse } from "next/server";
import { prisma } from "@tradeos/database";
import { encryptWebhookSecret } from "@tradeos/webhook-core";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../lib/api-errors";

export async function GET(request: Request) {
  try {
    const auth = await withApiPermission(request, "integration.manage");
    if (auth.response) return auth.response;
    const { session } = auth;

    const integrations = await prisma.webhookIntegration.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        channel: true,
        providerAccountId: true,
        status: true,
        createdAt: true,
        rotatedAt: true,
      },
    });

    return NextResponse.json({ integrations });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await withApiPermission(request, "integration.manage");
    if (auth.response) return auth.response;
    const { session } = auth;

    const body = await request.json();
    const { channel, providerAccountId, secret } = body;

    if (!channel || !providerAccountId || !secret) {
      return NextResponse.json(
        { error: "MISSING_REQUIRED_FIELDS" },
        { status: 400 },
      );
    }

    const secretHash = encryptWebhookSecret(secret);

    const integration = await prisma.webhookIntegration.create({
      data: {
        organizationId: session.organizationId,
        channel,
        providerAccountId,
        secretHash,
      },
      select: {
        id: true,
        channel: true,
        providerAccountId: true,
        status: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actionName: "webhook.integration.create",
        organizationId: session.organizationId,
        actorUserId: session.userId,
        input: JSON.parse(JSON.stringify({ channel, providerAccountId })),
      },
    });

    return NextResponse.json({ integration }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}
