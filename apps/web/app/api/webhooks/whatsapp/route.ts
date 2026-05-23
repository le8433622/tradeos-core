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
  extractWhatsAppProviderAccountId,
  requireWebhookTenant,
  resolveWebhookTenantFromIntegration,
  verifyWhatsAppSignature,
} from "@tradeos/webhook-core";

const channel = "WHATSAPP" as ChannelType;

export async function POST(request: Request) {
  return processWebhookRequest({
    request,
    channel,
    extractMessage: (body: unknown) => {
      const b = body as Record<string, unknown>;
      const entry = (b.entry as Record<string, unknown>[] | undefined)?.[0];
      const changes = (
        entry?.changes as Record<string, unknown>[] | undefined
      )?.[0];
      const value = changes?.value as Record<string, unknown> | undefined;
      const messages = value?.messages as Record<string, unknown>[] | undefined;
      const message = messages?.[0];
      const msgText = message?.text as Record<string, unknown> | undefined;
      const contacts = value?.contacts as Record<string, unknown>[] | undefined;
      const contactProfile = contacts?.[0]?.profile as
        | Record<string, unknown>
        | undefined;
      return {
        text: String(msgText?.body ?? b.text ?? b.message ?? ""),
        externalId: String(message?.from ?? b.from ?? b.threadId ?? ""),
        messageId: String(message?.id ?? b.messageId ?? ""),
        customerName: String(contactProfile?.name ?? b.name ?? ""),
        customerPhone: String(message?.from ?? b.phone ?? ""),
      };
    },
    tenantResolver: async () => {
      const jsonBody = await request.clone().json();
      const providerAccountId = extractWhatsAppProviderAccountId(jsonBody);
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
      await verifyWhatsAppSignature(request);
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
            channel: "whatsapp",
            text: params.text,
            customerName: params.customerName,
            customerPhone: params.customerPhone,
          },
          {
            actorUserId: "webhook-system",
            organizationId: params.organizationId,
            role: "OPERATOR" as UserRole,
            source: "ai",
          },
        ),
    },
    textRequiredErrorCode: "WHATSAPP_MESSAGE_TEXT_REQUIRED",
  });
}
