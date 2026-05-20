import { prisma } from '@tradeos/database';

export type ActorRole = 'OWNER' | 'ADMIN' | 'SALES' | 'OPERATOR' | 'VIEWER';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ActionContext = {
  actorUserId?: string;
  organizationId?: string;
  role: ActorRole;
  source: 'manual' | 'ai' | 'system';
  approved?: boolean;
};

export type RegisteredAction<Input = unknown, Output = unknown> = {
  name: string;
  description: string;
  riskLevel: RiskLevel;
  allowedRoles: ActorRole[];
  requiresApprovalForAI: boolean;
  handler: (input: Input, context: ActionContext) => Promise<Output> | Output;
};

const actions = new Map<string, RegisteredAction>();

export function registerAction(action: RegisteredAction) {
  if (actions.has(action.name)) {
    return actions.get(action.name)!;
  }
  actions.set(action.name, action);
  return action;
}

export function listActions() {
  return Array.from(actions.values()).map(({ handler: _handler, ...action }) => action);
}

export function getAction(name: string) {
  return actions.get(name);
}

export function canExecuteAction(action: RegisteredAction, context: ActionContext) {
  if (!action.allowedRoles.includes(context.role)) {
    return { allowed: false, reason: 'ROLE_NOT_ALLOWED' } as const;
  }

  if (context.source === 'ai' && action.requiresApprovalForAI && !context.approved) {
    return { allowed: false, reason: 'AI_REQUIRES_HUMAN_APPROVAL' } as const;
  }

  return { allowed: true, reason: 'ALLOWED' } as const;
}

async function writeAuditLog(params: {
  actionName: string;
  riskLevel: RiskLevel;
  context: ActionContext;
  input: unknown;
  result?: unknown;
  approved: boolean;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: params.context.organizationId,
        actorUserId: params.context.actorUserId,
        actionName: params.actionName,
        riskLevel: params.riskLevel,
        input: params.input === undefined ? undefined : JSON.parse(JSON.stringify(params.input)),
        result: params.result === undefined ? undefined : JSON.parse(JSON.stringify(params.result)),
        approved: params.approved,
      },
    });
  } catch (error) {
    console.error('AUDIT_LOG_WRITE_FAILED', error);
  }
}

export async function executeAction<Input, Output>(
  name: string,
  input: Input,
  context: ActionContext,
): Promise<Output> {
  const action = actions.get(name) as RegisteredAction<Input, Output> | undefined;
  if (!action) throw new Error(`Unknown action: ${name}`);

  const decision = canExecuteAction(action, context);
  if (!decision.allowed) {
    await writeAuditLog({
      actionName: action.name,
      riskLevel: action.riskLevel,
      context,
      input,
      result: { blocked: true, reason: decision.reason },
      approved: false,
    });
    throw new Error(`Action blocked: ${decision.reason}`);
  }

  const result = await action.handler(input, context);
  await writeAuditLog({
    actionName: action.name,
    riskLevel: action.riskLevel,
    context,
    input,
    result,
    approved: Boolean(context.approved) || !action.requiresApprovalForAI,
  });

  return result;
}

export const DEFAULT_LOW_RISK_ROLES: ActorRole[] = ['OWNER', 'ADMIN', 'SALES', 'OPERATOR'];
export const DEFAULT_ADMIN_ROLES: ActorRole[] = ['OWNER', 'ADMIN'];
