import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tradeos/database";
import { createSupabaseServerClient } from "../../../lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const orgName = (body.orgName ?? "").trim();
    const country = (body.country ?? "Vietnam").trim();
    const industry = (body.industry ?? "").trim();

    if (!orgName) {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: user.email },
    });
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    const orgId = `org-${Date.now()}`;
    const userId = `user-${Date.now()}`;

    await prisma.$transaction([
      prisma.organization.create({
        data: {
          id: orgId,
          name: orgName,
          type: "ASSOCIATION",
          country,
          website: "",
        },
      }),
      prisma.user.create({
        data: {
          id: userId,
          organizationId: orgId,
          email: user.email,
          name: user.user_metadata?.name ?? user.email.split("@")[0],
          role: "OWNER",
        },
      }),
      prisma.organizationMember.create({
        data: {
          userId,
          organizationId: orgId,
          roleId: "system-owner",
          status: "ACTIVE",
          acceptedAt: new Date(),
        },
      }),
      prisma.auditLog.create({
        data: {
          organizationId: orgId,
          actorUserId: userId,
          actionName: "organization.create",
          input: { email: user.email, orgName, method: "onboarding" },
          riskLevel: "LOW",
        },
      }),
    ]);

    return NextResponse.json({ orgId, userId });
  } catch (err) {
    console.error("Onboarding error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}