import { prisma, type UserRole } from '@tradeos/database';

export type SessionContext = {
  userId: string;
  organizationId: string;
  role: UserRole;
  email: string;
};

export const DEMO_ORG_ID = 'demo-org';
export const DEMO_USER_EMAIL = 'owner@tradeos.local';

export async function getDemoSession(): Promise<SessionContext> {
  const user = await prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
  });

  if (!user) {
    return {
      userId: 'demo-user',
      organizationId: DEMO_ORG_ID,
      role: 'OWNER',
      email: DEMO_USER_EMAIL,
    };
  }

  return {
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
    email: user.email,
  };
}

export async function requireDemoSession() {
  return getDemoSession();
}

export function assertSameOrganization(session: SessionContext, organizationId: string) {
  if (session.organizationId !== organizationId) {
    throw new Error('ORGANIZATION_ACCESS_DENIED');
  }
}
