import { type ChannelType, type UserRole } from "@tradeos/database";
import { runTradeAgent, type IncomingMessage } from "@tradeos/ai-core";
import { ingestInboundMessage, normalizeChannel } from "@tradeos/inbox-core";
import { enqueueJob } from "@tradeos/job-core";
import {
  processWebhookRequest,
  type WebhookPipelineInput,
} from "@tradeos/webhook-core";
import { requireWebhookTenant } from "@tradeos/webhook-core";

function getBodyChannel(body: unknown): ChannelType {
  const b = body as Record<string, unknown>;
  return normalizeChannel(String(b?.channel ?? "")) as ChannelType;
}

export async function POST(request: Request) {
  const rawBody = await request
    .clone()
    .json()
    .catch(() => ({}));
  const channel = getBodyChannel(rawBody);

  return processWebhookRequest({
    request,
    channel,
    extractMessage: (body: unknown) => {
      const b = body as Record<string, unknown>;
      return {
        text: String(b.text ?? b.message ?? b.content ?? ""),
        externalId: String(
          b.externalId ?? b.threadId ?? b.conversationId ?? "",
        ),
        messageId: String(b.messageId ?? ""),
        customerName: String(b.customerName ?? b.name ?? ""),
        customerPhone: String(b.customerPhone ?? b.phone ?? ""),
        customerEmail: String(b.customerEmail ?? b.email ?? ""),
      };
    },
    tenantResolver: async () => {
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
            channel: channel.toLowerCase() as IncomingMessage["channel"],
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
    buildIngestTitle: (body: unknown, _ch: ChannelType) => {
      const b = body as Record<string, unknown>;
      return String(b.title ?? "") || `Inbound ${getBodyChannel(body)}`;
    },
    buildAgentChannel: (_ch: ChannelType) =>
      channel.toLowerCase() as IncomingMessage["channel"],
  });
}
