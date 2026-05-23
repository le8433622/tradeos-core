import { runTradeAgent } from "@tradeos/ai-core";
import { ingestInboundMessage } from "@tradeos/inbox-core";
import {
  getWebhookEventOrThrow,
  markWebhookFailed,
  markWebhookProcessed,
  recordWebhookIntermediateResult,
} from "@tradeos/webhook-core";
import type { ClaimedJob } from "@tradeos/job-core";

export async function processWebhookEvent(job: ClaimedJob): Promise<void> {
  const { webhookEventId } = (job.payload ?? {}) as Record<string, unknown>;
  if (!webhookEventId || typeof webhookEventId !== "string") {
    throw new Error("Missing webhookEventId in job payload");
  }

  const event = await getWebhookEventOrThrow(
    webhookEventId,
    job.organizationId,
  );

  if (
    event.status === "PROCESSED" ||
    event.status === "DUPLICATE" ||
    event.status === "BLOCKED"
  ) {
    return;
  }

  const payload = (event.payload ?? {}) as Record<string, unknown>;

  const text = extractText(event.channel, payload);
  if (!text) {
    throw new Error("No message text found in webhook payload");
  }

  const externalId = extractExternalId(event.channel, payload);
  const customerName = extractCustomerName(event.channel, payload);
  const customerPhone = extractCustomerPhone(event.channel, payload);
  const customerEmail = extractCustomerEmail(event.channel, payload);

  try {
    const priorResult =
      event.result &&
      typeof event.result === "object" &&
      !Array.isArray(event.result)
        ? (event.result as Record<string, unknown>)
        : {};
    let inboxId =
      typeof priorResult.inboxId === "string" ? priorResult.inboxId : undefined;

    if (!inboxId) {
      const inbox = await ingestInboundMessage({
        organizationId: event.organizationId,
        channel: event.channel,
        externalId: externalId || undefined,
        title: `Inbound ${event.channel}`,
        content: text,
        metadata: JSON.parse(JSON.stringify(payload)),
      });
      inboxId = inbox.message.id;
      await recordWebhookIntermediateResult({
        eventId: webhookEventId,
        organizationId: event.organizationId,
        result: { inboxId },
      });
    }

    const agent = await runTradeAgent(
      {
        organizationId: event.organizationId,
        channel: event.channel.toLowerCase() as
          | "web"
          | "zalo"
          | "whatsapp"
          | "email"
          | "manual",
        text,
        customerName,
        customerPhone,
        customerEmail,
      },
      {
        actorUserId: undefined,
        organizationId: event.organizationId,
        role: "OPERATOR",
        source: "ai",
        mfaLevel: "aal1",
      },
    );

    await markWebhookProcessed({
      eventId: webhookEventId,
      result: { inboxId, intent: agent.plan.intent },
    });
  } catch (error) {
    await markWebhookFailed({
      eventId: webhookEventId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

function extractText(
  channel: string,
  payload: Record<string, unknown>,
): string {
  switch (channel) {
    case "ZALO": {
      const msg = payload.message as Record<string, unknown> | undefined;
      return String(msg?.text ?? payload.text ?? "");
    }
    case "WHATSAPP": {
      const entry = (payload.entry as Record<string, unknown>[]) ?? [];
      const msg = entry[0];
      const change = (msg as Record<string, unknown> | undefined)?.changes as
        | Record<string, unknown>[]
        | undefined;
      const value = change?.[0]?.value as Record<string, unknown> | undefined;
      const messages = value?.messages as Record<string, unknown>[] | undefined;
      const firstMsg = messages?.[0] as Record<string, unknown> | undefined;
      const textBody = firstMsg?.text as Record<string, unknown> | undefined;
      return String(textBody?.body ?? payload.text ?? "");
    }
    case "EMAIL":
      return String(payload.text ?? payload.content ?? payload.body ?? "");
    default:
      return String(payload.text ?? payload.message ?? payload.content ?? "");
  }
}

function extractExternalId(
  channel: string,
  payload: Record<string, unknown>,
): string {
  switch (channel) {
    case "ZALO": {
      const sender = payload.sender as Record<string, unknown> | undefined;
      return String(sender?.id ?? payload.externalId ?? "");
    }
    case "WHATSAPP": {
      const entry = (payload.entry as Record<string, unknown>[]) ?? [];
      const msg = entry[0];
      const change = (msg as Record<string, unknown> | undefined)?.changes as
        | Record<string, unknown>[]
        | undefined;
      const value = change?.[0]?.value as Record<string, unknown> | undefined;
      const messages = value?.messages as Record<string, unknown>[] | undefined;
      const firstMsg = messages?.[0] as Record<string, unknown> | undefined;
      return String(firstMsg?.from ?? payload.externalId ?? "");
    }
    case "EMAIL":
      return String(payload.messageId ?? payload.externalId ?? "");
    default:
      return String(payload.externalId ?? "");
  }
}

function extractCustomerName(
  channel: string,
  payload: Record<string, unknown>,
): string | undefined {
  switch (channel) {
    case "ZALO": {
      const sender = payload.sender as Record<string, unknown> | undefined;
      return String(sender?.name ?? "") || undefined;
    }
    case "WHATSAPP": {
      const entry = (payload.entry as Record<string, unknown>[]) ?? [];
      const msg = entry[0];
      const change = (msg as Record<string, unknown> | undefined)?.changes as
        | Record<string, unknown>[]
        | undefined;
      const value = change?.[0]?.value as Record<string, unknown> | undefined;
      const contacts = value?.contacts as Record<string, unknown>[] | undefined;
      const contact = contacts?.[0] as Record<string, unknown> | undefined;
      const profile = contact?.profile as Record<string, unknown> | undefined;
      return String(profile?.name ?? "") || undefined;
    }
    case "EMAIL": {
      const from = payload.from as Record<string, unknown> | undefined;
      return String(from?.name ?? payload.sender ?? "") || undefined;
    }
    default:
      return String(payload.customerName ?? payload.name ?? "") || undefined;
  }
}

function extractCustomerPhone(
  channel: string,
  payload: Record<string, unknown>,
): string | undefined {
  switch (channel) {
    case "ZALO": {
      const sender = payload.sender as Record<string, unknown> | undefined;
      return String(sender?.phone ?? payload.phone ?? "") || undefined;
    }
    default:
      return String(payload.customerPhone ?? payload.phone ?? "") || undefined;
  }
}

function extractCustomerEmail(
  channel: string,
  payload: Record<string, unknown>,
): string | undefined {
  switch (channel) {
    case "EMAIL": {
      const from = payload.from as Record<string, unknown> | undefined;
      return String(from?.email ?? payload.senderEmail ?? "") || undefined;
    }
    default:
      return String(payload.customerEmail ?? payload.email ?? "") || undefined;
  }
}
