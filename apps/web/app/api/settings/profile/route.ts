import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tradeos/database";
import { createSupabaseServerClient } from "../../../../lib/supabase-server";
import { resolveSessionFromEmail } from "@tradeos/auth";

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await resolveSessionFromEmail(authUser.email);
    const body = await request.json();

    const updateData: Record<string, string> = {};
    if (body.orgName) updateData.name = body.orgName.trim();
    if (body.country) updateData.country = body.country.trim();
    if (body.type) updateData.type = body.type;

    if (Object.keys(updateData).length > 0) {
      await prisma.organization.update({
        where: { id: session.organizationId },
        data: updateData,
      });
    }

    await prisma.auditLog.create({
      data: {
        organizationId: session.organizationId,
        actorUserId: session.userId,
        actionName: "settings.profile.update",
        input: body,
        riskLevel: "LOW",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Profile update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}