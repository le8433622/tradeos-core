import { type ChannelType, type UserRole } from "@tradeos/database";
import { runTradeAgent } from "@tradeos/ai-core";
import { ingestInboundMessage } from "@tradeos/inbox-core";
import { enqueueJob } from "@tradeos/job-core";
import {
  processWebhookRequest,
  type WebhookPipelineInput,
} from "@tradeos/webhook-core";
import {
  allowDemoAuth,
  extractEmailProviderAccountId,
  requireWebhookTenant,
  resolveWebhookTenantFromIntegration,
  verifyEmailSignature,
} from "@tradeos/webhook-core";

const channel = "EMAIL" as ChannelType;

export async function POST(request: Request) {
  return processWebhookRequest({
    request,
    channel,
    extractMessage: (body: unknown) => {
      const b = body as Record<string, unknown>;
      const text = String(b.text ?? b.body ?? b.plain ?? b.html ?? "");
      return {
        text,
        externalId: String(b.messageId ?? b.threadId ?? b.from ?? ""),
        messageId: String(b.messageId ?? ""),
        customerName: String(b.fromName ?? b.name ?? ""),
        customerEmail: String(b.fromEmail ?? b.email ?? b.from ?? ""),
      };
    },
    tenantResolver: async () => {
      const jsonBody = await request.clone().json();
      const providerAccountId = extractEmailProviderAccountId(jsonBody);
      if (providerAccountId) {
        try {
          return await resolveWebhookTenantFromIntegration(
            request,
            channel,
            providerAccountId,
          );
        } catch {
          if (!allowDemoAuth()) throw new Error("WEBHOOK_UNAUTHORIZED");
        }
      }
      if (!allowDemoAuth()) throw new Error("WEBHOOK_UNAUTHORIZED");
      await verifyEmailSignature(request);
      return requireWebhookTenant(request);
    },
    adapters: {
      ingestMessage: (params) =>
        ingestInboundMessage(
          params as Parameters<typeof ingestInboundMessage>[0],
        ),
      enqueueJob: async (params) => {
        await enqueueJob(params as Parameters<typeof enqueueJob>[0]);
      },
      runAgent: async (params) =>
        runTradeAgent(
          {
            organizationId: params.organizationId,
            channel: "email",
            text: params.text,
            customerName: params.customerName,
            customerEmail: params.customerEmail,
          },
          {
            actorUserId: "webhook-system",
            organizationId: params.organizationId,
            role: "OPERATOR" as UserRole,
            source: "ai",
          },
        ),
    },
    buildIngestTitle: (body: unknown, _ch: ChannelType) => {
      const b = body as Record<string, unknown>;
      return String(b.subject ?? "") || "Inbound email conversation";
    },
    textRequiredErrorCode: "EMAIL_BODY_REQUIRED",
  });
}
