import { prisma, type UserRole } from '@tradeos/database';
import { allowDemoAuth, getDemoSession, type SessionContext } from './demo';
import { getBearerToken, getSupabaseUserFromToken } from './supabase';

export async function resolveSessionFromEmail(email: string): Promise<SessionContext> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new Error('USER_NOT_MAPPED_TO_TENANT');
  }

  return {
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
    email: user.email,
    authProvider: 'supabase',
  };
}

export async function requireSessionFromRequest(request: Request): Promise<SessionContext> {
  const token = getBearerToken(request);

  if (token) {
    const supabaseUser = await getSupabaseUserFromToken(token);
    return resolveSessionFromEmail(supabaseUser.email!);
  }

  if (allowDemoAuth()) {
    return getDemoSession();
  }

  throw new Error('AUTH_REQUIRED');
}

export function assertSameOrganization(session: SessionContext, organizationId: string) {
  if (session.organizationId !== organizationId) {
    throw new Error('ORGANIZATION_ACCESS_DENIED');
  }
}

export function assertRole(session: SessionContext, allowedRoles: UserRole[]) {
  if (!allowedRoles.includes(session.role)) {
    throw new Error('ROLE_ACCESS_DENIED');
  }
}
