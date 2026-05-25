import { NextResponse } from "next/server";
import { prisma } from "@tradeos/database";
import { encryptWebhookSecret } from "@tradeos/webhook-core";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../../lib/api-errors";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await withApiPermission(request, "integration.manage");
    if (auth.response) return auth.response;
    const { session } = auth;
    const { id } = await params;

    const existing = await prisma.webhookIntegration.findFirst({
      where: { id, organizationId: session.organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: "INTEGRATION_NOT_FOUND" }, { status: 404 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};
    const meta: Record<string, unknown> = {};

    if (body.secret) {
      updateData.secretHash = encryptWebhookSecret(body.secret);
      updateData.rotatedAt = new Date();
      meta.secretRotated = true;
    }
    if (body.status) {
      updateData.status = body.status;
      meta.newStatus = body.status;
    }

    const integration = await prisma.webhookIntegration.update({
      where: { id },
      data: updateData,
      select: { id: true, channel: true, providerAccountId: true, status: true, rotatedAt: true },
    });

    await prisma.auditLog.create({
      data: {
        actionName: "webhook.integration.update",
        organizationId: session.organizationId,
        actorUserId: session.userId,
        input: JSON.parse(JSON.stringify(meta)),
      },
    });

    return NextResponse.json({ integration });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await withApiPermission(request, "integration.manage");
    if (auth.response) return auth.response;
    const { session } = auth;
    const { id } = await params;

    const existing = await prisma.webhookIntegration.findFirst({
      where: { id, organizationId: session.organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: "INTEGRATION_NOT_FOUND" }, { status: 404 });
    }

    await prisma.webhookIntegration.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        actionName: "webhook.integration.delete",
        organizationId: session.organizationId,
        actorUserId: session.userId,
        input: { channel: existing.channel, providerAccountId: existing.providerAccountId },
      },
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}
