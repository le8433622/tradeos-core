import { NextResponse } from "next/server";
import { prisma } from "@tradeos/database";
import { executeAction } from "@tradeos/policy-core";
import { apiErrorResponse, withApiPermission } from "../../../lib/api-errors";
import {
  createProductSchema,
  stripSessionManagedFields,
} from "../../../lib/validate";
import { z } from "zod";
import "@tradeos/trade-core";

export async function GET(request: Request) {
  try {
    const auth = await withApiPermission(request, "product.read");
    if (auth.response) return auth.response;
    const { session } = auth;

    const products = await prisma.product.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { name: "asc" },
      take: 100,
    });
    return NextResponse.json({ products });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await withApiPermission(request, "product.write");
    if (auth.response) return auth.response;
    const { session } = auth;

    let body: Record<string, unknown>;
    try {
      body = createProductSchema.parse(
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
    const result = await executeAction(
      "trade.createProduct",
      {
        organizationId: session.organizationId,
        name: body.name as string,
        category: body.category as string | undefined,
        description: body.description as string | undefined,
        originCountry: body.originCountry as string | undefined,
        priceRange: body.priceRange as string | undefined,
        moq: body.moq as string | undefined,
        certification: body.certification as string | undefined,
      },
      {
        actorUserId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        source: "manual",
        mfaLevel: session.mfaLevel,
      },
    );
    return NextResponse.json({ product: result }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}
