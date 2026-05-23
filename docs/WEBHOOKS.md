# Webhook Gateway

TradeOS Core supports inbound message ingestion into AI Inbox, then passes the message into the Trade Agent.

## Routes

```txt
POST /api/webhooks/inbox
POST /api/webhooks/zalo
POST /api/webhooks/whatsapp
POST /api/webhooks/email
```

## Tenant Resolution

In production, webhook tenant is resolved from the **Webhook Integration Registry** instead of the caller-controlled `x-organization-id` header. Each incoming webhook extracts a provider-specific account ID from the request body and looks up the registered integration:

| Channel  | Provider Account ID Source                        |
| -------- | ------------------------------------------------- |
| Zalo     | `body.oa_id` or `body.app_id`                     |
| WhatsApp | `value.metadata.phone_number_id` or `entry[0].id` |
| Email    | `body.recipient` or `body.to`                     |

If the integration is found and the channel signature verifies, the org is resolved from the integration record. In non-production environments, `x-organization-id` header fallback is available with `WEBHOOK_SECRET` verification.

## Generic Inbox Test

```bash
curl -X POST http://localhost:3000/api/webhooks/inbox \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "web",
    "externalId": "demo-thread-1",
    "customerName": "Demo Buyer",
    "customerEmail": "buyer@example.com",
    "text": "Tôi cần báo giá sản phẩm xuất khẩu sang Singapore"
  }'
```

Expected result:

1. Conversation is created or updated.
2. Message is stored.
3. Trade Agent runs.
4. A lead or quotation draft may be created depending on intent.
5. Audit log is written.

## Zalo Test

```bash
curl -X POST http://localhost:3000/api/webhooks/zalo \
  -H "Content-Type: application/json" \
  -d '{
    "sender": { "id": "zalo-user-1", "name": "Khách Zalo" },
    "message": { "text": "Tôi cần tìm nhà cung cấp Việt Nam" }
  }'
```

## WhatsApp Test

```bash
curl -X POST http://localhost:3000/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "contacts": [{ "profile": { "name": "WhatsApp Buyer" } }],
          "messages": [{ "from": "84900000000", "text": { "body": "Please send quotation for export products" } }]
        }
      }]
    }]
  }'
```

## Email Test

```bash
curl -X POST http://localhost:3000/api/webhooks/email \
  -H "Content-Type: application/json" \
  -d '{
    "messageId": "email-1",
    "fromEmail": "buyer@example.com",
    "fromName": "Email Buyer",
    "subject": "Need quotation",
    "text": "We need quotation, MOQ, and shipping time."
  }'
```

## Environment Variables

| Variable                   | Purpose                                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------------------- |
| `WEBHOOK_SECRET`           | Shared secret for inbox and legacy fallback routes                                                       |
| `ZALO_APP_SECRET`          | Zalo OA app secret, used for HMAC-SHA256 signature verification via `X-Zalo-Signature` header            |
| `WHATSAPP_APP_SECRET`      | WhatsApp Cloud API app secret, used for HMAC-SHA256 verification via `X-Hub-Signature-256` header        |
| `EMAIL_WEBHOOK_SECRET`     | Email webhook secret; checks `X-Mailgun-Signature` HMAC-SHA256 or falls back to generic `WEBHOOK_SECRET` |
| `WEBHOOK_ENCRYPTION_KEY`   | 32-byte hex key for AES-256-GCM encryption of integration secrets at rest                                |
| `ALLOW_WEBHOOK_ORG_HEADER` | Temporary legacy escape hatch. Must be unset/false in production unless explicitly approved.             |

## Per-Channel Signature Verification

- **Zalo**: `verifyZaloSignature` reads `x-zalo-signature` header, computes HMAC-SHA256 of raw body with the integration secret (or `ZALO_APP_SECRET` env var fallback), and rejects mismatch.
- **WhatsApp**: `verifyWhatsAppSignature` reads `x-hub-signature-256` header, strips `sha256=` prefix, computes HMAC-SHA256 of raw body with the integration secret (or `WHATSAPP_APP_SECRET` env var fallback), and rejects mismatch.
- **Email**: Uses integration registry secret. Non-production may fall back to `EMAIL_WEBHOOK_SECRET` or generic shared secret.
- **Inbox**: Uses `verifyWebhookSecret` with shared `WEBHOOK_SECRET`; production `x-organization-id` tenant selection is disabled unless `ALLOW_WEBHOOK_ORG_HEADER=true` is explicitly approved.

## Webhook Integration Registry

Each tenant can register channel integrations:

```prisma
model WebhookIntegration {
  id                String            @id @default(cuid())
  organizationId    String
  channel           ChannelType
  providerAccountId String
  secretHash        String            // AES-256-GCM encrypted channel secret
  status            IntegrationStatus // ACTIVE or DISABLED
  createdAt         DateTime
  rotatedAt         DateTime?
}
```

- `secretHash` is the channel secret (e.g., Zalo App Secret) encrypted with AES-256-GCM using `WEBHOOK_ENCRYPTION_KEY`.
- A unique constraint on `(channel, providerAccountId)` prevents duplicate registrations.
- Setting `status` to `DISABLED` immediately stops processing for that integration.
- In production, if no integration is found or the signature check fails, the webhook returns `401` without revealing whether the integration exists.

## Secret Rotation

To rotate a channel secret:

1. Encrypt the new secret:

```ts
import { encryptWebhookSecret } from "@tradeos/webhook-core";
const encrypted = encryptWebhookSecret("new-channel-secret");
```

2. Update the integration record:

```sql
UPDATE "WebhookIntegration"
SET "secretHash" = '<encrypted-value>', "rotatedAt" = NOW()
WHERE "channel" = 'ZALO' AND "providerAccountId" = '<oa-id>';
```

3. Verify the new secret works with a test webhook.
4. If rotation fails, restore the previous `secretHash` from backup.

## Production Security Status

- [x] Zalo: HMAC-SHA256 signature verification
- [x] WhatsApp: `X-Hub-Signature-256` verification
- [x] Email: HMAC-SHA256 via `EMAIL_WEBHOOK_SECRET` with Mailgun header or generic fallback
- [x] Rate limiting: per-org, per-channel, 60 req/60s window
- [x] Idempotency: event key deduplication via `receiveWebhookEvent`
- [x] Raw payload stored for retry
- [x] Per-channel secrets fully separated
- [x] Tenant-scoped webhook integration registry
- [x] Secrets encrypted at rest (AES-256-GCM via `WEBHOOK_ENCRYPTION_KEY`)
- [x] Production webhook cannot choose arbitrary org via `x-organization-id`
- [x] Integration status can disable provider immediately
- [x] Secret rotation procedure defined
