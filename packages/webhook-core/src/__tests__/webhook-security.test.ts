import { beforeEach, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import {
  decryptWebhookSecret,
  encryptWebhookSecret,
  verifyWebhookSecret,
  verifyWhatsAppSignature,
} from "../index";

describe("webhook-core security helpers", () => {
  beforeEach(() => {
    process.env.WEBHOOK_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("hex");
    process.env.WHATSAPP_APP_SECRET = "whatsapp-secret";
  });

  it("encrypts and decrypts webhook secrets with AES-GCM", () => {
    const encrypted = encryptWebhookSecret("provider-secret");
    expect(encrypted).not.toBe("provider-secret");
    expect(decryptWebhookSecret(encrypted)).toBe("provider-secret");
  });

  it("compares shared webhook secrets length-safely", () => {
    expect(
      verifyWebhookSecret({
        requestSecret: "short",
        expectedSecret: "longer-secret",
      }),
    ).toBe(false);
    expect(
      verifyWebhookSecret({
        requestSecret: "same-secret",
        expectedSecret: "same-secret",
      }),
    ).toBe(true);
  });

  it("rejects malformed WhatsApp signatures without timingSafeEqual length errors", async () => {
    const request = new Request("https://tradeos.local/api/webhooks/whatsapp", {
      method: "POST",
      body: JSON.stringify({ hello: "world" }),
      headers: { "x-hub-signature-256": "sha256=short" },
    });

    await expect(verifyWhatsAppSignature(request)).rejects.toThrow(
      "WHATSAPP_SIGNATURE_INVALID",
    );
  });

  it("accepts a valid WhatsApp signature", async () => {
    const body = JSON.stringify({ hello: "world" });
    const signature = crypto
      .createHmac("sha256", "whatsapp-secret")
      .update(body)
      .digest("hex");
    const request = new Request("https://tradeos.local/api/webhooks/whatsapp", {
      method: "POST",
      body,
      headers: { "x-hub-signature-256": `sha256=${signature}` },
    });

    await expect(verifyWhatsAppSignature(request)).resolves.toBeUndefined();
  });
});
