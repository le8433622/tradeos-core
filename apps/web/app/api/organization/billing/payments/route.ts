import { NextResponse } from "next/server";
import { prisma } from "@tradeos/database";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../../lib/api-errors";

export async function GET(request: Request) {
  try {
    const auth = await withApiPermission(request, "billing.read");
    if (auth.response) return auth.response;
    const { session } = auth;

    const payments = await prisma.payment.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { paidAt: "desc" },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        paidAt: true,
        provider: true,
        checkpointId: true,
        invoiceId: true,
      },
    });

    return NextResponse.json({ payments });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}
