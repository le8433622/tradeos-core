import crypto from "node:crypto";
import {
  prisma,
  Prisma,
  type ChannelType,
  type UserRole,
} from "@tradeos/database";

import { DEFAULT_RETENTION_DAYS, MAX_EVENT_KEY_TEXT_LENGTH } from "./constants";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const hex = process.env.WEBHOOK_ENCRYPTION_KEY;
  if (!hex) throw new Error("WEBHOOK_ENCRYPTION_KEY_NOT_CONFIGURED");
  return Buffer.from(hex, "hex");
}

export function encryptWebhookSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptWebhookSecret(encoded: string): string {
  const key = getEncryptionKey();
  const parts = encoded.split(":");
  if (parts.length !== 3) throw new Error("INVALID_ENCRYPTED_SECRET_FORMAT");
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const decipher = crypto.createDecipheriv(
    ENCRYPTION_ALGORITHM,
    key,
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  return (
    decipher.update(Buffer.from(ciphertextHex, "hex"), undefined, "utf8") +
    decipher.final("utf8")
  );
}

export type VerifyWebhookSecretInput = {
  requestSecret?: string | null;
  expectedSecret?: string | null;
};

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export { isProduction };

export function allowDemoAuth() {
  return process.env.ALLOW_DEMO_AUTH === "true" || !isProduction();
}

function requireSecretOrThrow(
  envVar: string,
  label: string,
): string | undefined {
  const value = process.env[envVar];
  if (!value && isProduction()) {
    throw new Error(`${label}_NOT_CONFIGURED`);
  }
  return value;
}

export function verifyWebhookSecret(input: VerifyWebhookSecretInput) {
  if (!input.expectedSecret) return true;
  return Boolean(
    input.requestSecret &&
    safeTimingEqual(input.requestSecret, input.expectedSecret),
  );
}

function safeTimingEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function buildWebhookEventKey(params: {
  channel: ChannelType;
  externalId?: string;
  messageId?: string;
  text?: string;
}) {
  const raw = [
    params.channel,
    params.externalId,
    params.messageId,
    params.text?.slice(0, MAX_EVENT_KEY_TEXT_LENGTH),
  ]
    .filter(Boolean)
    .join(":");
  return raw || `${params.channel}:${Date.now()}`;
}

export async function receiveWebhookEvent(params: {
  organizationId: string;
  channel: ChannelType;
  eventKey: string;
  sourceIp?: string | null;
  payload?: unknown;
}) {
  try {
    const event = await prisma.webhookEvent.create({
      data: {
        organizationId: params.organizationId,
        channel: params.channel,
        eventKey: params.eventKey,
        sourceIp: params.sourceIp ?? undefined,
        payload:
          params.payload === undefined
            ? undefined
            : JSON.parse(JSON.stringify(params.payload)),
        status: "RECEIVED",
      },
    });
    return { event, duplicate: false };
  } catch (error) {
    const existing = await prisma.webhookEvent.findFirst({
      where: {
        organizationId: params.organizationId,
        channel: params.channel,
        eventKey: params.eventKey,
      },
    });

    if (existing) {
      return { event: existing, duplicate: true };
    }

    throw error;
  }
}

export async function markWebhookProcessed(params: {
  eventId: string;
  result?: unknown;
}) {
  return prisma.webhookEvent.update({
    where: { id: params.eventId },
    data: {
      status: "PROCESSED",
      result:
        params.result === undefined
          ? undefined
          : JSON.parse(JSON.stringify(params.result)),
      processedAt: new Date(),
    },
  });
}

export async function markWebhookFailed(params: {
  eventId: string;
  error: string;
  result?: unknown;
}) {
  return prisma.webhookEvent.update({
    where: { id: params.eventId },
    data: {
      status: "FAILED",
      error: params.error,
      result:
        params.result === undefined
          ? undefined
          : JSON.parse(JSON.stringify(params.result)),
      processedAt: new Date(),
    },
  });
}

export async function checkWebhookRateLimit(params: {
  organizationId: string;
  channel: ChannelType;
  sourceIp?: string | null;
  windowSeconds?: number;
  maxEvents?: number;
}) {
  const windowSeconds = params.windowSeconds ?? 60;
  const maxEvents = params.maxEvents ?? 60;
  const since = new Date(Date.now() - windowSeconds * 1000);

  const count = await prisma.webhookEvent.count({
    where: {
      organizationId: params.organizationId,
      channel: params.channel,
      receivedAt: { gte: since },
      ...(params.sourceIp ? { sourceIp: params.sourceIp } : {}),
    },
  });

  return {
    allowed: count < maxEvents,
    count,
    maxEvents,
    windowSeconds,
  };
}

export function getRequestSecret(request: Request) {
  return (
    request.headers.get("x-tradeos-webhook-secret") ??
    request.headers.get("x-webhook-secret")
  );
}

export async function verifyZaloSignature(
  request: Request,
  secretOverride?: string,
): Promise<void> {
  const secret =
    secretOverride ??
    requireSecretOrThrow("ZALO_APP_SECRET", "ZALO_APP_SECRET");
  if (!secret) return;

  const signature =
    request.headers.get("x-zalo-signature") ??
    request.headers.get("x-zalo-signed");
  if (!signature) throw new Error("ZALO_SIGNATURE_MISSING");

  const rawBody = await request.clone().text();
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  if (!safeTimingEqual(signature.toLowerCase(), expectedSig.toLowerCase())) {
    throw new Error("ZALO_SIGNATURE_INVALID");
  }
}

export async function verifyWhatsAppSignature(
  request: Request,
  secretOverride?: string,
): Promise<void> {
  const secret =
    secretOverride ??
    requireSecretOrThrow("WHATSAPP_APP_SECRET", "WHATSAPP_APP_SECRET");
  if (!secret) return;

  const header =
    request.headers.get("x-hub-signature-256") ??
    request.headers.get("x-hub-signature");
  if (!header) throw new Error("WHATSAPP_SIGNATURE_MISSING");

  const rawBody = await request.clone().text();
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const prefix = header.startsWith("sha256=") ? "sha256=" : "";
  if (!prefix) throw new Error("WHATSAPP_SIGNATURE_INVALID_FORMAT");
  const receivedSig = header.slice(prefix.length);

  if (!safeTimingEqual(receivedSig.toLowerCase(), expectedSig.toLowerCase())) {
    throw new Error("WHATSAPP_SIGNATURE_INVALID");
  }
}

export async function verifyEmailSignature(
  request: Request,
  secretOverride?: string,
): Promise<void> {
  const secret =
    secretOverride ??
    requireSecretOrThrow("EMAIL_WEBHOOK_SECRET", "EMAIL_WEBHOOK_SECRET");
  if (!secret) return;

  const mailgunSig = request.headers.get("x-mailgun-signature");
  if (mailgunSig) {
    const rawBody = await request.clone().text();
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    if (!safeTimingEqual(mailgunSig.toLowerCase(), expectedSig.toLowerCase())) {
      throw new Error("EMAIL_SIGNATURE_INVALID");
    }
    return;
  }

  const requestSecret = getRequestSecret(request);
  if (!requestSecret || !safeTimingEqual(requestSecret, secret)) {
    throw new Error("EMAIL_SIGNATURE_INVALID");
  }
}

export function extractZaloProviderAccountId(
  body: Record<string, unknown>,
): string | null {
  return String(body?.oa_id ?? body?.app_id ?? "") || null;
}

export function extractWhatsAppProviderAccountId(
  body: Record<string, unknown>,
): string | null {
  const entry = (body.entry as Record<string, unknown>[] | undefined)?.[0];
  const changes = (
    entry?.changes as Record<string, unknown>[] | undefined
  )?.[0];
  const value = changes?.value as Record<string, unknown> | undefined;
  const metadata = value?.metadata as Record<string, unknown> | undefined;
  const phoneNumberId = metadata?.phone_number_id;
  const wabaId = entry?.id;
  return String(phoneNumberId ?? wabaId ?? "") || null;
}

export function extractEmailProviderAccountId(
  body: Record<string, unknown>,
): string | null {
  return String(body?.recipient ?? body?.to ?? "") || null;
}

export async function resolveWebhookTenantFromIntegration(
  request: Request,
  channel: ChannelType,
  providerAccountId: string,
) {
  const integration = await prisma.webhookIntegration.findUnique({
    where: { channel_providerAccountId: { channel, providerAccountId } },
  });

  if (!integration || integration.status === "DISABLED") {
    throw new Error("WEBHOOK_INTEGRATION_NOT_FOUND");
  }

  const secret = decryptWebhookSecret(integration.secretHash);

  switch (channel) {
    case "ZALO":
      await verifyZaloSignature(request, secret);
      break;
    case "WHATSAPP":
      await verifyWhatsAppSignature(request, secret);
      break;
    case "EMAIL":
      await verifyEmailSignature(request, secret);
      break;
    default:
      throw new Error("WEBHOOK_CHANNEL_NOT_SUPPORTED");
  }

  return {
    organizationId: integration.organizationId,
    userId: "webhook",
    role: "OPERATOR" as UserRole,
    email: `webhook-${channel.toLowerCase()}@tradeos.local`,
  };
}

export function getSourceIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")
  );
}

export async function getWebhookEventOrThrow(
  eventId: string,
  organizationId: string,
) {
  const event = await prisma.webhookEvent.findUnique({
    where: { id: eventId },
  });
  if (!event) throw new Error("WEBHOOK_EVENT_NOT_FOUND");
  if (event.organizationId !== organizationId)
    throw new Error("ORGANIZATION_ACCESS_DENIED");
  return event;
}

export async function resetWebhookForRetry(
  eventId: string,
  organizationId: string,
) {
  const event = await getWebhookEventOrThrow(eventId, organizationId);
  if (event.status !== "FAILED") return { event, reset: false };

  const updated = await prisma.webhookEvent.update({
    where: { id: eventId },
    data: {
      status: "RECEIVED",
      error: null,
      processedAt: null,
    },
  });
  return { event: updated, reset: true };
}

export async function recordWebhookIntermediateResult(params: {
  eventId: string;
  organizationId: string;
  result: Record<string, unknown>;
}) {
  const event = await getWebhookEventOrThrow(
    params.eventId,
    params.organizationId,
  );
  const existing =
    event.result &&
    typeof event.result === "object" &&
    !Array.isArray(event.result)
      ? (event.result as Record<string, unknown>)
      : {};
  return prisma.webhookEvent.update({
    where: { id: params.eventId },
    data: {
      result: JSON.parse(JSON.stringify({ ...existing, ...params.result })),
    },
  });
}

export function getRetentionArchiveDays(): number {
  const val = process.env.RETENTION_ARCHIVE_DAYS;
  if (!val) return DEFAULT_RETENTION_DAYS;
  const days = parseInt(val, 10);
  return Number.isFinite(days) && days > 0 ? days : DEFAULT_RETENTION_DAYS;
}

export async function redactWebhookPayload(
  eventId: string,
  organizationId: string,
): Promise<void> {
  const event = await getWebhookEventOrThrow(eventId, organizationId);
  if (!event.payload) return;

  await prisma.webhookEvent.update({
    where: { id: eventId },
    data: {
      payload: Prisma.DbNull,
      result: Prisma.DbNull,
    },
  });
}

const DEMO_ORG_ID = "demo-org";

export async function requireWebhookTenant(request: Request) {
  const envSecret = process.env.WEBHOOK_SECRET;
  if (envSecret) {
    const requestSecret = getRequestSecret(request);
    if (!requestSecret || !safeTimingEqual(requestSecret, envSecret)) {
      throw new Error("WEBHOOK_SECRET_INVALID");
    }
  } else if (isProduction()) {
    throw new Error("WEBHOOK_SECRET_NOT_CONFIGURED");
  }

  const orgId = request.headers.get("x-organization-id");
  if (orgId) {
    if (isProduction() && process.env.ALLOW_WEBHOOK_ORG_HEADER !== "true") {
      throw new Error("WEBHOOK_TENANT_HEADER_DISABLED");
    }
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new Error("ORGANIZATION_NOT_FOUND");
    return {
      organizationId: orgId,
      userId: "webhook",
      role: "OPERATOR" as UserRole,
      email: "webhook@tradeos.local",
    };
  }

  if (allowDemoAuth()) {
    const user = await prisma.user.findUnique({
      where: { email: "owner@tradeos.local" },
    });
    if (user) {
      return {
        userId: user.id,
        organizationId: user.organizationId,
        role: user.role,
        email: user.email,
      };
    }
    return {
      userId: "demo-user",
      organizationId: DEMO_ORG_ID,
      role: "OWNER" as UserRole,
      email: "owner@tradeos.local",
    };
  }

  throw new Error("WEBHOOK_TENANT_REQUIRED");
}

export { processWebhookRequest, type WebhookPipelineInput } from "./pipeline";
