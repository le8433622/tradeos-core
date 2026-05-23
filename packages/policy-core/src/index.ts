import { prisma } from "@tradeos/database";

export type ActorRole = "OWNER" | "ADMIN" | "SALES" | "OPERATOR" | "VIEWER";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type TransactionClient = Record<
  string,
  Record<string, (...args: unknown[]) => unknown>
>;

export type ActionContext = {
  actorUserId?: string;
  organizationId?: string;
  role: ActorRole;
  source: "manual" | "ai" | "system";
  approved?: boolean;
  mfaLevel?: string;
  prismaTransactionClient?: TransactionClient;
};

export type RegisteredAction<Input = unknown, Output = unknown> = {
  name: string;
  description: string;
  riskLevel: RiskLevel;
  allowedRoles: ActorRole[];
  requiresApprovalForAI: boolean;
  handler: (input: Input, context: ActionContext) => Promise<Output> | Output;
};

const actions = new Map<string, RegisteredAction<any, any>>();

export function registerAction<Input = unknown, Output = unknown>(
  action: RegisteredAction<Input, Output>,
): RegisteredAction<Input, Output> {
  if (actions.has(action.name)) {
    return actions.get(action.name)! as RegisteredAction<Input, Output>;
  }
  actions.set(action.name, action);
  return action;
}

export function listActions() {
  return Array.from(actions.values()).map(
    ({ handler: _handler, ...action }) => action,
  );
}

export function getAction(name: string) {
  return actions.get(name);
}

export function canExecuteAction(
  action: RegisteredAction,
  context: ActionContext,
) {
  if (!action.allowedRoles.includes(context.role)) {
    return { allowed: false, reason: "ROLE_NOT_ALLOWED" } as const;
  }

  if (
    context.source === "ai" &&
    action.requiresApprovalForAI &&
    !context.approved
  ) {
    return { allowed: false, reason: "AI_REQUIRES_HUMAN_APPROVAL" } as const;
  }

  return { allowed: true, reason: "ALLOWED" } as const;
}

const SENSITIVE_FIELD_PATTERNS = [
  /^password$/i,
  /^secret$/i,
  /^token$/i,
  /^api[_-]?key$/i,
  /^authorization$/i,
  /^credit[Cc]ard$/i,
  /^ssn$/i,
  /^tax[_-]?id$/i,
];

function isSensitiveField(key: string): boolean {
  return SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(key));
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[\d\s\-().]{7,20}$/;

function maskEmail(value: string): string {
  const atIndex = value.indexOf("@");
  if (atIndex <= 0) return value;
  const localPart = value.slice(0, atIndex);
  const domain = value.slice(atIndex);
  const maskedLocal =
    localPart.length <= 2
      ? localPart[0] + "*"
      : localPart[0] +
        "*".repeat(localPart.length - 2) +
        localPart[localPart.length - 1];
  return maskedLocal + domain;
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 4) return value;
  const prefix = value.slice(0, Math.min(3, value.length - 4));
  const last4 = digits.slice(-4);
  const stars = "*".repeat(Math.max(3, value.length - prefix.length - 4));
  return prefix + stars + last4;
}

function redactStringValue(value: string): string {
  if (EMAIL_REGEX.test(value)) return maskEmail(value);
  if (PHONE_REGEX.test(value)) return maskPhone(value);
  return value;
}

const MAX_REDACT_DEPTH = 10;

export function redactAuditField(value: unknown, depth = 0): unknown {
  if (depth > MAX_REDACT_DEPTH) return value;
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactStringValue(value);
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map((item) => redactAuditField(item, depth + 1));
  }
  const obj = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    if (isSensitiveField(key)) {
      result[key] = "[REDACTED]";
    } else {
      result[key] = redactAuditField(obj[key], depth + 1);
    }
  }
  return result;
}

/** Alias for public API */
export const redactForAudit = redactAuditField;

type AuditClient = {
  auditLog: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
};

function getTopLevelOrganizationId(input: unknown): unknown {
  if (!input || typeof input !== "object" || Array.isArray(input))
    return undefined;
  return (input as Record<string, unknown>).organizationId;
}

function assertInputOrganizationMatchesContext(
  input: unknown,
  context: ActionContext,
): void {
  if (!context.organizationId) return;
  const inputOrganizationId = getTopLevelOrganizationId(input);
  if (inputOrganizationId === undefined || inputOrganizationId === null) return;
  if (inputOrganizationId !== context.organizationId) {
    throw new Error("ORGANIZATION_ACCESS_DENIED");
  }
}

async function writeAuditLog(
  db: AuditClient,
  params: {
    actionName: string;
    riskLevel: RiskLevel;
    context: ActionContext;
    input: unknown;
    result?: unknown;
    approved: boolean;
  },
) {
  await db.auditLog.create({
    data: {
      organizationId: params.context.organizationId,
      actorUserId: params.context.actorUserId,
      actionName: params.actionName,
      riskLevel: params.riskLevel,
      input:
        params.input === undefined
          ? undefined
          : JSON.parse(JSON.stringify(redactAuditField(params.input))),
      result:
        params.result === undefined
          ? undefined
          : JSON.parse(JSON.stringify(redactAuditField(params.result))),
      approved: params.approved,
    },
  });
}

function blockReasonForDecision(reason: string): string {
  if (reason === "ROLE_NOT_ALLOWED") return "role_denied";
  if (reason === "AI_REQUIRES_HUMAN_APPROVAL") return "ai_not_approved";
  return "policy_denied";
}

export async function executeAction<Input, Output>(
  name: string,
  input: Input,
  context: ActionContext,
): Promise<Output> {
  const action = actions.get(name) as RegisteredAction<any, any> | undefined;
  if (!action) throw new Error(`Unknown action: ${name}`);

  try {
    assertInputOrganizationMatchesContext(input, context);
  } catch (error) {
    await writeAuditLog(prisma as unknown as AuditClient, {
      actionName: action.name,
      riskLevel: action.riskLevel,
      context,
      input,
      result: {
        blocked: true,
        reason: "ORGANIZATION_ACCESS_DENIED",
        blockReason: "input_organization_mismatch",
      },
      approved: false,
    });
    throw error;
  }

  const decision = canExecuteAction(action, context);
  if (!decision.allowed) {
    await writeAuditLog(prisma as unknown as AuditClient, {
      actionName: action.name,
      riskLevel: action.riskLevel,
      context,
      input,
      result: {
        blocked: true,
        reason: decision.reason,
        blockReason: blockReasonForDecision(decision.reason),
      },
      approved: false,
    });
    throw new Error(`Action blocked: ${decision.reason}`);
  }

  if (context.organizationId && isActionMfaRequired(action.name)) {
    if (context.mfaLevel !== "aal2") {
      await writeAuditLog(prisma as unknown as AuditClient, {
        actionName: action.name,
        riskLevel: action.riskLevel,
        context,
        input,
        result: {
          blocked: true,
          reason: "MFA_REQUIRED",
          blockReason: "mfa_required",
        },
        approved: false,
      });
      throw new Error("MFA_REQUIRED");
    }
  } else if (
    context.organizationId &&
    (action.riskLevel === "HIGH" || action.riskLevel === "CRITICAL")
  ) {
    const org = await prisma.organization.findUnique({
      where: { id: context.organizationId },
      select: { mfaRequired: true },
    });
    if (org?.mfaRequired && context.mfaLevel !== "aal2") {
      await writeAuditLog(prisma as unknown as AuditClient, {
        actionName: action.name,
        riskLevel: action.riskLevel,
        context,
        input,
        result: {
          blocked: true,
          reason: "MFA_REQUIRED",
          blockReason: "mfa_required",
        },
        approved: false,
      });
      throw new Error("MFA_REQUIRED");
    }
  }

  return prisma.$transaction(async (tx) => {
    const txContext: ActionContext = {
      ...context,
      prismaTransactionClient: tx as unknown as TransactionClient,
    };

    const result = await action.handler(input, txContext);

    await writeAuditLog(tx as unknown as AuditClient, {
      actionName: action.name,
      riskLevel: action.riskLevel,
      context,
      input,
      result,
      approved: Boolean(context.approved) || !action.requiresApprovalForAI,
    });

    return result;
  });
}

export function validateRecordBelongsToOrg(
  record: { organizationId?: string | null } | null | undefined,
  expectedOrganizationId: string,
  label: string,
): void {
  if (!record) {
    throw new Error(`${label}_NOT_FOUND`);
  }
  if (!record.organizationId) {
    throw new Error(`${label}_HAS_NO_ORGANIZATION`);
  }
  if (record.organizationId !== expectedOrganizationId) {
    throw new Error(`${label}_BELONGS_TO_ANOTHER_ORGANIZATION`);
  }
}

export const DEFAULT_LOW_RISK_ROLES: ActorRole[] = [
  "OWNER",
  "ADMIN",
  "SALES",
  "OPERATOR",
];
export const DEFAULT_ADMIN_ROLES: ActorRole[] = ["OWNER", "ADMIN"];

export function hasPermission(
  permissions: string[],
  required: string,
): boolean {
  return permissions.includes(required);
}

export function assertPermission(
  permissions: string[],
  required: string,
): void {
  if (!permissions.includes(required)) {
    throw new Error("PERMISSION_DENIED");
  }
}

export function can(permissions: string[], required: string): boolean {
  return permissions.includes(required);
}

const ALWAYS_REQUIRE_MFA_ACTIONS = new Set([
  "privacy.anonymizePii",
  "privacy.legalHold",
  "privacy.export",
  // TODO: implement billing.manage action
  "billing.manage",
  "billing.export",
  "billing.planUpdate",
  "notification.sendBulk",
  "user.roleUpdate",
  "settings.security",
  "trade.approveIntroduction",
]);

export async function requireMfa(session: {
  mfaLevel?: string;
  organizationId: string;
}): Promise<void> {
  if (session.mfaLevel === "aal2") return;
  const org = await prisma.organization.findUnique({
    where: { id: session.organizationId },
    select: { mfaRequired: true },
  });
  if (org?.mfaRequired) {
    throw new Error("MFA_REQUIRED");
  }
}

export function isActionMfaRequired(actionName: string): boolean {
  return ALWAYS_REQUIRE_MFA_ACTIONS.has(actionName);
}
