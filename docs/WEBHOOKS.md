# Webhook Gateway

TradeOS Core supports inbound message ingestion into AI Inbox, then passes the message into the Trade Agent.

## Routes

```txt
POST /api/webhooks/inbox
POST /api/webhooks/zalo
POST /api/webhooks/whatsapp
POST /api/webhooks/email
```

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

## Production Security Needed

Before public deployment:

1. Verify webhook signatures.
2. Add per-channel secrets.
3. Rate limit inbound routes.
4. Store raw payload only when necessary.
5. Add idempotency keys.
6. Replace demo session with real tenant resolver.
