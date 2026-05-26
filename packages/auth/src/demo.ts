import { prisma, type UserRole } from "@tradeos/database";

export type Membership = {
  organizationId: string;
  organizationName: string;
};

export type SessionContext = {
  userId: string;
  organizationId: string;
  role: UserRole;
  roleId?: string;
  roleName?: string;
  permissions: string[];
  memberships: Membership[];
  email: string;
  authProvider: "supabase" | "demo";
  mfaLevel: "aal1" | "aal2";
  activeOrganizationId?: string;
};

export const DEMO_ORG_ID = "demo-org";
export const DEMO_USER_EMAIL = "owner@tradeos.local";

export function allowDemoAuth() {
  return (
    process.env.ALLOW_DEMO_AUTH === "true" ||
    process.env.NODE_ENV !== "production"
  );
}

export async function getDemoSession(
  request?: Request,
  emailOverride?: string,
): Promise<SessionContext> {
  const email =
    emailOverride ??
    request?.headers.get("x-demo-auth-email") ??
    DEMO_USER_EMAIL;
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return {
      userId: "demo-user",
      organizationId: DEMO_ORG_ID,
      role: "OWNER",
      permissions: [],
      memberships: [
        { organizationId: DEMO_ORG_ID, organizationName: "Demo Organization" },
      ],
      email: DEMO_USER_EMAIL,
      authProvider: "demo",
      mfaLevel: "aal1",
    };
  }

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    include: {
      organization: { select: { id: true, name: true } },
      role: {
        include: {
          permissions: { include: { permission: { select: { key: true } } } },
        },
      },
    },
  });

  const active = memberships.length > 0 ? memberships[0] : undefined;
  const permissions =
    active?.role?.permissions.map((rp) => rp.permission.key) ?? [];
  const targetOrgId = active?.organizationId ?? user.organizationId;

  return {
    userId: user.id,
    organizationId: targetOrgId,
    role: (active?.role?.name ?? user.role) as UserRole,
    roleId: active?.roleId ?? undefined,
    roleName: active?.role?.name ?? user.role,
    permissions,
    memberships: memberships.map((m) => ({
      organizationId: m.organizationId,
      organizationName: m.organization.name,
    })),
    email: user.email,
    authProvider: "demo",
    mfaLevel: "aal1",
  };
}

export async function requireDemoSession() {
  return getDemoSession();
}
