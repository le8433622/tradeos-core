import { NextResponse } from "next/server";
import { runTradeAgent } from "@tradeos/ai-core";
import { ingestInboundMessage, normalizeChannel } from "@tradeos/inbox-core";
import {
  markWebhookFailed,
  markWebhookProcessed,
  resetWebhookForRetry,
} from "@tradeos/webhook-core";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../../lib/api-errors";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await withApiPermission(request, "webhook.retry");
  if (auth.response) return auth.response;
  const { session } = auth;
  const params = await context.params;

  try {
    const { event, reset } = await resetWebhookForRetry(
      params.id,
      session.organizationId,
    );
    if (!reset) {
      return NextResponse.json(
        { error: "EVENT_NOT_FAILED", status: event.status },
        { status: 400 },
      );
    }

    const channel = normalizeChannel(event.channel);
    const body = (
      typeof event.payload === "object" && event.payload !== null
        ? event.payload
        : {}
    ) as Record<string, unknown>;
    const text = String(
      body.text ?? body.message ?? body.content ?? body.body ?? "",
    );

    if (!text) {
      await markWebhookFailed({
        eventId: params.id,
        error: "No processable text in stored payload",
      });
      return NextResponse.json({ error: "RETRY_NO_TEXT" }, { status: 400 });
    }

    const inbox = await ingestInboundMessage({
      organizationId: session.organizationId,
      channel,
      externalId: String(
        body.externalId ??
          body.threadId ??
          body.conversationId ??
          body.from ??
          "",
      ),
      title: String(body.title ?? `Retried ${channel}`),
      content: text,
      metadata: JSON.parse(JSON.stringify(event.payload)),
    });

    const agent = await runTradeAgent(
      {
        organizationId: session.organizationId,
        channel: channel.toLowerCase() as
          | "web"
          | "zalo"
          | "whatsapp"
          | "email"
          | "manual",
        text,
        customerName: String(body.customerName ?? body.name ?? ""),
        customerPhone: String(body.customerPhone ?? body.phone ?? ""),
        customerEmail: String(body.customerEmail ?? body.email ?? ""),
      },
      {
        actorUserId: session.userId,
        organizationId: session.organizationId,
        role: session.role,
        source: "ai",
      },
    );

    await markWebhookProcessed({
      eventId: params.id,
      result: { inboxId: inbox.message.id, intent: agent.plan.intent },
    });

    return NextResponse.json({ ok: true, inbox, agent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await markWebhookFailed({ eventId: params.id, error: message }).catch(
      (err) => {
        console.error("Failed to mark webhook as failed:", err);
      },
    );
    return apiErrorResponse(request, error);
  }
}
