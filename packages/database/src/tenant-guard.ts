export const TENANT_SCOPED_MODELS = [
  "SourcingRun",
  "SupplierCandidate",
  "SupplierQuote",
  "PurchaseBaseline",
  "SupplierAlternative",
  "SwitchDecisionReport",
  "EvidenceItem",
  "WorkCheckpoint",
  "Payment",
  "ApprovalRequest",
  "AuditLog",
  "HumanHandover",
  "PlanLimit",
  "OutcomeRecord",
  "Lead",
  "Company",
  "Contact",
  "Conversation",
  "Message",
  "Deal",
  "Quotation",
  "QuotationLineItem",
  "IntroductionRequest",
  "Task",
  "Notification",
  "Job",
  "WebhookEvent",
  "WebhookIntegration",
  "ReportSnapshot",
  "AiUsageEvent",
  "Invitation",
  "Product",
  "OrganizationMember",
] as const;

type PrismaAction =
  | "findMany"
  | "findFirst"
  | "findUnique"
  | "create"
  | "createMany"
  | "update"
  | "updateMany"
  | "upsert"
  | "delete"
  | "deleteMany"
  | "count"
  | "aggregate"
  | "groupBy";

const MULTI_RECORD_ACTIONS: PrismaAction[] = [
  "findMany",
  "findFirst",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
];

const WRITE_ACTIONS: PrismaAction[] = [
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
];

function hasOrgInWhere(args: unknown): boolean {
  if (!args || typeof args !== "object") return false;
  const a = args as Record<string, unknown>;
  const where = a.where as Record<string, unknown> | undefined;
  if (!where || typeof where !== "object") return false;
  if ("organizationId" in where) return true;
  for (const val of Object.values(where)) {
    if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === "object" && item != null && "organizationId" in (item as Record<string, unknown>)) {
          return true;
        }
      }
    } else if (typeof val === "object" && val != null) {
      const nested = val as Record<string, unknown>;
      if ("organizationId" in nested) return true;
    }
  }
  return false;
}

function hasOrgInData(args: unknown): boolean {
  if (!args || typeof args !== "object") return false;
  const a = args as Record<string, unknown>;
  const data = a.data ?? a.create;
  if (!data) return false;
  if (Array.isArray(data)) {
    return data.length > 0 && typeof data[0] === "object" && data[0] != null && "organizationId" in (data[0] as Record<string, unknown>);
  }
  if (typeof data === "object") {
    return "organizationId" in (data as Record<string, unknown>);
  }
  return false;
}

export function createTenantGuard() {
  return async (
    params: { model?: string; action: string; args: unknown },
    next: (params: { model?: string; action: string; args: unknown }) => Promise<unknown>,
  ): Promise<unknown> => {
    const { model, action } = params;
    if (!model || !(TENANT_SCOPED_MODELS as readonly string[]).includes(model)) {
      return next(params);
    }
    const prismaAction = action as PrismaAction;

    if (MULTI_RECORD_ACTIONS.includes(prismaAction)) {
      if (!hasOrgInWhere(params.args)) {
        throw new Error(
          `TENANT_SCOPE_REQUIRED: ${model}.${action} requires organizationId in where clause`,
        );
      }
    }

    if (WRITE_ACTIONS.includes(prismaAction)) {
      if (prismaAction === "create" || prismaAction === "createMany") {
        if (!hasOrgInData(params.args)) {
          throw new Error(
            `TENANT_SCOPE_REQUIRED: ${model}.${action} requires organizationId in data`,
          );
        }
      } else if (prismaAction === "upsert") {
        if (!hasOrgInWhere(params.args)) {
          throw new Error(
            `TENANT_SCOPE_REQUIRED: ${model}.upsert requires organizationId in where`,
          );
        }
        if (!hasOrgInData(params.args)) {
          throw new Error(
            `TENANT_SCOPE_REQUIRED: ${model}.upsert requires organizationId in create data`,
          );
        }
      } else {
        if (!hasOrgInWhere(params.args)) {
          throw new Error(
            `TENANT_SCOPE_REQUIRED: ${model}.${action} requires organizationId in where clause`,
          );
        }
      }
    }

    return next(params);
  };
}

export function applyTenantGuard(prisma: unknown): void {
  const p = prisma as { $use?: (fn: unknown) => void };
  if (typeof p.$use === "function") {
    p.$use(createTenantGuard());
  }
}
