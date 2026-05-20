import { prisma, type UserRole } from '@tradeos/database';

export type SessionContext = {
  userId: string;
  organizationId: string;
  role: UserRole;
  email: string;
  authProvider: 'supabase' | 'demo';
};

export const DEMO_ORG_ID = 'demo-org';
export const DEMO_USER_EMAIL = 'owner@tradeos.local';

export function allowDemoAuth() {
  return process.env.ALLOW_DEMO_AUTH === 'true' || process.env.NODE_ENV !== 'production';
}

export async function getDemoSession(): Promise<SessionContext> {
  const user = await prisma.user.findUnique({ where: { email: DEMO_USER_EMAIL } });

  if (!user) {
    return {
      userId: 'demo-user',
      organizationId: DEMO_ORG_ID,
      role: 'OWNER',
      email: DEMO_USER_EMAIL,
      authProvider: 'demo',
    };
  }

  return {
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
    email: user.email,
    authProvider: 'demo',
  };
}

export async function requireDemoSession() {
  return getDemoSession();
}
