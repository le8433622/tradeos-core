import { type ChannelType, type UserRole } from "@tradeos/database";
import {
  buildWebhookEventKey,
  checkWebhookRateLimit,
  getSourceIp,
  markWebhookFailed,
  markWebhookProcessed,
  receiveWebhookEvent,
} from "./index";
import {
  DEFAULT_RATE_LIMIT_WINDOW_SECONDS,
  DEFAULT_RATE_LIMIT_MAX_EVENTS,
} from "./constants";

const MAX_PAYLOAD_BYTES = 256 * 1024;

function workerEnabled(): boolean {
  return process.env.WORKER_ENABLED === "true";
}

async function readBody(
  request: Request,
): Promise<{ text: string; error?: Response }> {
  const text = await request.clone().text();
  if (Buffer.byteLength(text, "utf-8") > MAX_PAYLOAD_BYTES) {
    return {
      text: "",
      error: Response.json(
        {
          error: "PAYLOAD_TOO_LARGE",
          message: `Payload exceeds ${MAX_PAYLOAD_BYTES / 1024}KB`,
        },
        { status: 413 },
      ),
    };
  }
  return { text };
}

function errorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
  if (
    message === "WEBHOOK_UNAUTHORIZED" ||
    message === "WEBHOOK_SECRET_INVALID"
  ) {
    return Response.json({ error: "WEBHOOK_UNAUTHORIZED" }, { status: 401 });
  }
  return Response.json({ error: message || "INTERNAL_ERROR" }, { status: 500 });
}

type WebhookProcessMessage = {
  text: string;
  externalId?: string;
  messageId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
};

type WebhookProcessTenant = {
  organizationId: string;
  userId: string;
  role: UserRole;
};

type WebhookProcessAdapters = {
  ingestMessage: (params: {
    organizationId: string;
    channel: ChannelType;
    externalId?: string;
    title: string;
    content: string;
    metadata: Record<string, unknown>;
  }) => Promise<{ message: { id: string } }>;
  enqueueJob?: (params: {
    organizationId: string;
    type: string;
    payload: Record<string, unknown>;
  }) => Promise<void>;
  runAgent?: (params: {
    organizationId: string;
    channel: string;
    text: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
  }) => Promise<unknown>;
};

export type WebhookPipelineInput = {
  request: Request;
  channel: ChannelType;
  extractMessage: (body: unknown) => WebhookProcessMessage;
  tenantResolver: () => Promise<WebhookProcessTenant>;
  adapters: WebhookProcessAdapters;
  buildIngestTitle?: (body: unknown, channel: ChannelType) => string;
  buildAgentChannel?: (channel: ChannelType) => string;
  textRequiredErrorCode?: string;
};

export async function processWebhookRequest(
  input: WebhookPipelineInput,
): Promise<Response> {
  const { request, channel, extractMessage, tenantResolver, adapters } = input;
  const buildIngestTitle =
    input.buildIngestTitle ??
    ((_body: unknown, ch: ChannelType) => `Inbound ${ch} conversation`);
  const buildAgentChannel =
    input.buildAgentChannel ?? ((ch: ChannelType) => ch.toLowerCase());

  const sourceIp = getSourceIp(request);
  let eventId: string | undefined;
  let body: unknown;

  const bodyResult = await readBody(request);
  if (bodyResult.error) return bodyResult.error;

  try {
    body = JSON.parse(bodyResult.text);
  } catch {
    return Response.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  let tenant: WebhookProcessTenant;
  try {
    tenant = await tenantResolver();
  } catch {
    return Response.json({ error: "WEBHOOK_UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const parsed = extractMessage(body);

    if (!parsed.text) {
      return Response.json(
        { error: input.textRequiredErrorCode ?? "MESSAGE_TEXT_REQUIRED" },
        { status: 400 },
      );
    }

    const rateLimit = await checkWebhookRateLimit({
      organizationId: tenant.organizationId,
      channel,
      sourceIp,
      windowSeconds: DEFAULT_RATE_LIMIT_WINDOW_SECONDS,
      maxEvents: DEFAULT_RATE_LIMIT_MAX_EVENTS,
    });

    if (!rateLimit.allowed) {
      return Response.json(
        { error: "RATE_LIMITED", rateLimit },
        { status: 429 },
      );
    }

    const eventKey = buildWebhookEventKey({
      channel,
      externalId: parsed.externalId || undefined,
      messageId: parsed.messageId,
      text: parsed.text,
    });

    const received = await receiveWebhookEvent({
      organizationId: tenant.organizationId,
      channel,
      eventKey,
      sourceIp,
      payload: body,
    });

    eventId = received.event.id;

    if (received.duplicate) {
      if (
        workerEnabled() &&
        received.event.status !== "PROCESSED" &&
        received.event.status !== "BLOCKED"
      ) {
        if (adapters.enqueueJob) {
          await adapters.enqueueJob({
            organizationId: tenant.organizationId,
            type: "PROCESS_WEBHOOK_EVENT",
            payload: { webhookEventId: eventId },
          });
        }
        return Response.json(
          { duplicate: true, queued: true, eventId },
          { status: 202 },
        );
      }
      return Response.json(
        { duplicate: true, event: received.event },
        { status: 200 },
      );
    }

    if (workerEnabled() && adapters.enqueueJob) {
      await adapters.enqueueJob({
        organizationId: tenant.organizationId,
        type: "PROCESS_WEBHOOK_EVENT",
        payload: { webhookEventId: eventId },
      });
      return Response.json({ queued: true, eventId }, { status: 202 });
    }

    const inbox = await adapters.ingestMessage({
      organizationId: tenant.organizationId,
      channel,
      externalId: parsed.externalId || undefined,
      title: buildIngestTitle(body, channel),
      content: parsed.text,
      metadata: body as Record<string, unknown>,
    });

    let agentResult: unknown;
    let agentError: Error | undefined;
    if (adapters.runAgent) {
      try {
        agentResult = await adapters.runAgent({
          organizationId: tenant.organizationId,
          channel: buildAgentChannel(channel),
          text: parsed.text,
          customerName: parsed.customerName,
          customerPhone: parsed.customerPhone,
          customerEmail: parsed.customerEmail,
        });
      } catch (error) {
        agentError =
          error instanceof Error ? error : new Error("Agent execution failed");
      }
    }

    if (agentError) {
      await markWebhookFailed({
        eventId,
        error: agentError.message,
      });
    } else {
      await markWebhookProcessed({
        eventId,
        result: {
          inboxId: inbox.message.id,
          intent: (agentResult as { plan?: { intent?: string } } | undefined)
            ?.plan?.intent,
        },
      });
    }

    const responseBody: Record<string, unknown> = {
      inbox,
      agent: agentResult,
      ok: true,
    };

    return Response.json(responseBody, { status: 200 });
  } catch (error) {
    if (eventId) {
      await markWebhookFailed({
        eventId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return errorResponse(error);
  }
}
