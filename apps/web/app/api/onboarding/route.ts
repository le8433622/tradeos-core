import { NextRequest, NextResponse } from "next/server";
import { ensureSystemRoles, prisma, type Prisma } from "@tradeos/database";
import { redactForAudit } from "@tradeos/policy-core";
import { z, ZodError } from "zod";
import { createLogger, getRequestId } from "../../../lib/logger";
import { createSupabaseServerClient } from "../../../lib/supabase-server";

const onboardingSchema = z
  .object({
    orgName: z.string().trim().min(1).max(256),
    country: z.string().trim().max(128).default("Vietnam"),
    industry: z.string().trim().max(256).optional(),
  })
  .strict();

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const logger = createLogger(requestId);

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = onboardingSchema.parse(await request.json());
    const email = user.email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 },
      );
    }

    await ensureSystemRoles(prisma);

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: body.orgName,
          type: "ASSOCIATION",
          country: body.country,
          plan: "PILOT",
          website: "",
          metadata: body.industry ? { industry: body.industry } : undefined,
        },
      });

      const appUser = await tx.user.create({
        data: {
          organizationId: org.id,
          email,
          name: user.user_metadata?.name ?? email.split("@")[0],
          role: "OWNER",
        },
      });

      await tx.organizationMember.create({
        data: {
          userId: appUser.id,
          organizationId: org.id,
          roleId: "system-owner",
          status: "ACTIVE",
          acceptedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: org.id,
          actorUserId: appUser.id,
          actionName: "organization.create",
          input: redactForAudit({
            email,
            orgName: body.orgName,
            method: "onboarding",
          }) as Prisma.InputJsonValue,
          result: { created: true },
          riskLevel: "LOW",
          approved: true,
        },
      });

      return { orgId: org.id, userId: appUser.id };
    });

    return NextResponse.json(result, {
      headers: { "X-Request-Id": requestId },
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "INVALID_REQUEST_BODY", issues: err.issues, requestId },
        { status: 400, headers: { "X-Request-Id": requestId } },
      );
    }

    logger.error("onboarding_failed", {
      code: err instanceof Error ? err.message : "UNKNOWN_ERROR",
    });
    return NextResponse.json(
      { error: "Internal server error", requestId },
      { status: 500, headers: { "X-Request-Id": requestId } },
    );
  }
}
