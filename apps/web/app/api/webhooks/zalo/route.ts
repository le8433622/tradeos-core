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
  extractZaloProviderAccountId,
  requireWebhookTenant,
  resolveWebhookTenantFromIntegration,
  verifyZaloSignature,
} from "@tradeos/webhook-core";

const channel = "ZALO" as ChannelType;

export async function POST(request: Request) {
  return processWebhookRequest({
    request,
    channel,
    extractMessage: (body: unknown) => {
      const b = body as Record<string, unknown>;
      const msg = b.message as Record<string, unknown> | undefined;
      const sender = b.sender as Record<string, unknown> | undefined;
      return {
        text: String(msg?.text ?? b.text ?? msg ?? b.event_name ?? ""),
        externalId: String(
          sender?.id ?? b.user_id ?? b.oa_id ?? b.thread_id ?? "",
        ),
        messageId: String(msg?.msg_id ?? b.msg_id ?? b.event_id ?? ""),
        customerName: String(sender?.name ?? b.name ?? ""),
        customerPhone: String(b.phone ?? ""),
        customerEmail: String(b.email ?? ""),
      };
    },
    tenantResolver: async () => {
      const jsonBody = await request.clone().json();
      const providerAccountId = extractZaloProviderAccountId(jsonBody);
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
      await verifyZaloSignature(request);
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
            channel: "zalo",
            text: params.text,
            customerName: params.customerName,
            customerPhone: params.customerPhone,
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
    textRequiredErrorCode: "ZALO_MESSAGE_TEXT_REQUIRED",
  });
}
