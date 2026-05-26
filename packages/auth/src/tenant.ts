import { prisma, type UserRole } from "@tradeos/database";
import { allowDemoAuth, getDemoSession, type SessionContext } from "./demo";
import {
  getAccessTokenFromRequestCookies,
  getBearerToken,
  getSessionAal,
  getSupabaseUserFromToken,
} from "./supabase";

export async function resolveSessionFromEmail(
  rawEmail: string,
  activeOrganizationId?: string,
  mfaLevel?: "aal1" | "aal2",
): Promise<SessionContext> {
  const email = rawEmail.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new Error("USER_NOT_MAPPED_TO_TENANT");
  }

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    include: {
      organization: { select: { id: true, name: true } },
      role: {
        include: {
          permissions: {
            include: { permission: { select: { key: true } } },
          },
        },
      },
    },
  });

  const requestedMembership = activeOrganizationId
    ? memberships.find((m) => m.organizationId === activeOrganizationId)
    : undefined;
  if (activeOrganizationId && !requestedMembership) {
    throw new Error("ORGANIZATION_ACCESS_DENIED");
  }

  const activeMembership =
    requestedMembership ??
    (memberships.length > 0 ? memberships[0] : undefined);
  const targetOrgId = activeMembership?.organizationId ?? user.organizationId;

  const permissions =
    activeMembership?.role?.permissions.map((rp) => rp.permission.key) ?? [];

  const membershipsList = memberships.map((m) => ({
    organizationId: m.organizationId,
    organizationName: m.organization?.name ?? "",
  }));

  return {
    userId: user.id,
    organizationId: targetOrgId,
    role: (activeMembership?.role?.name ?? user.role) as UserRole,
    roleId: activeMembership?.roleId ?? undefined,
    roleName: activeMembership?.role?.name ?? user.role,
    permissions,
    memberships: membershipsList,
    email: user.email,
    authProvider: "supabase",
    mfaLevel: mfaLevel ?? "aal1",
  };
}

export async function requireSessionFromRequest(
  request: Request,
): Promise<SessionContext> {
  const token =
    getBearerToken(request) ?? getAccessTokenFromRequestCookies(request);

  if (token) {
    const supabaseUser = await getSupabaseUserFromToken(token);
    const mfaLevel = getSessionAal(token);
    return resolveSessionFromEmail(supabaseUser.email!, undefined, mfaLevel);
  }

  if (allowDemoAuth()) {
    return getDemoSession(request);
  }

  throw new Error("AUTH_REQUIRED");
}

export function assertSameOrganization(
  session: SessionContext,
  organizationId: string,
) {
  if (session.organizationId !== organizationId) {
    throw new Error("ORGANIZATION_ACCESS_DENIED");
  }
}

export function assertRole(session: SessionContext, allowedRoles: UserRole[]) {
  if (!allowedRoles.includes(session.role)) {
    throw new Error("ROLE_ACCESS_DENIED");
  }
}
