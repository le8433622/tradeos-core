#!/usr/bin/env node
// Full end-to-end pipeline test

const API_KEY = process.env.NVIDIA_API_KEY;
const BASE_URL = "https://integrate.api.nvidia.com/v1";
const MODEL = process.env.MODEL || "meta/llama-3.1-70b-instruct";

function calcLC(fob, qty, mode) {
  mode = mode || "air";
  const sw = qty * 0.05;
  const sc = sw * (mode === "sea" ? 0.35 : 4.5);
  const dt = fob * qty * 0.0;
  const ins = fob * qty * 0.01;
  const f = fob * qty * 0.02;
  const g = fob * qty + sc + dt + ins + f;
  return {
    fobTotal: Math.round(fob * qty * 100) / 100,
    shippingCost: Math.round(sc * 100) / 100,
    dutiesTotal: Math.round(dt * 100) / 100,
    insuranceCost: Math.round(ins * 100) / 100,
    paymentFees: Math.round(f * 100) / 100,
    grandTotal: Math.round(g * 100) / 100,
    costPerUnit: Math.round((g / qty) * 100) / 100,
  };
}

const suppliers = [
  {
    name: "Shenzhen Yiersen Technology Co., Ltd.",
    product: "Bluetooth 5.3 Earhook Earbuds TWS",
    price: 8.5,
    moq: 500,
    rating: 4.1,
    reviews: 68,
    certs: ["CE", "FCC", "ROHS"],
    certVerified: false,
    audit: false,
  },
  {
    name: "Dongguan Taiwin Electronics Co., Ltd.",
    product: "Bluetooth 5.3 Earhook Earbuds OEM/ODM",
    price: 6.8,
    moq: 1000,
    rating: 4.6,
    reviews: 312,
    certs: ["CE", "FCC"],
    certVerified: true,
    audit: true,
  },
  {
    name: "Shenzhen Joinwin Technology Co., Ltd.",
    product: "Wireless Earhook Earbuds BT 5.3",
    price: 4.2,
    moq: 200,
    rating: 3.8,
    reviews: 12,
    certs: ["CE"],
    certVerified: false,
    audit: false,
  },
];

async function main() {
  console.log("=== FULL PIPELINE TEST: 3 Suppliers ===\n");

  for (const s of suppliers) {
    const lc = calcLC(s.price, s.moq, "air");

    const prompt = [
      "Analyze this supplier for procurement decision:",
      "Supplier: " + s.name,
      "Product: " + s.product,
      "FOB Price: $" + s.price + "/unit, MOQ: " + s.moq,
      "Rating: " + s.rating + "/5 (" + s.reviews + " reviews)",
      "Certifications claimed: " + s.certs.join(", "),
      "Certifications verified: " + s.certVerified,
      "Factory audit available: " + s.audit,
      "",
      "Landed cost estimate (air freight to US):",
      "  FOB total: $" + lc.fobTotal,
      "  Shipping: $" + lc.shippingCost,
      "  Duties: $" + lc.dutiesTotal + " (electronics: 0%)",
      "  Insurance + fees: $" + (lc.insuranceCost + lc.paymentFees),
      "  GRAND TOTAL: $" +
        lc.grandTotal +
        " ($" +
        lc.costPerUnit +
        "/unit all-in)",
      "",
      "Rules: If evidence is missing (unverified certs, no audit, low reviews), flag it. Never fabricate. Only output JSON.",
    ].join("\n");

    const res = await fetch(BASE_URL + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + API_KEY,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              'You analyze suppliers for procurement. Output ONLY valid JSON: {supplierName, overallRisk: "high|medium|low", evidenceQuality: "high|medium|low", riskFlags: [{type, detail, severity}], recommendation: {verdict: "avoid|proceed_with_caution|needs_verification", rationale, humanMustDecide: [string]}, missingEvidence: [string]}. If data is missing, say NOT_EXTRACTED. Never fabricate.',
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 800,
      }),
    });

    const result = await res.json();
    let text = result.choices[0].message.content;
    text = text
      .replace(/```json\s*/gi, "")
      .replace(/```/g, "")
      .trim();

    try {
      const parsed = JSON.parse(text);
      console.log("--- " + s.name + " ---");
      console.log(
        "  FOB: $" + s.price + "/unit  →  ALL-IN: $" + lc.costPerUnit + "/unit",
      );
      console.log(
        "  Risk: " +
          parsed.overallRisk +
          "  |  Evidence: " +
          parsed.evidenceQuality,
      );
      console.log("  Verdict: " + (parsed.recommendation?.verdict || "?"));

      if (parsed.riskFlags?.length) {
        parsed.riskFlags.forEach((f) =>
          console.log("  \u26a0 " + f.detail + " [" + f.severity + "]"),
        );
      }
      if (parsed.missingEvidence?.length) {
        parsed.missingEvidence.forEach((m) =>
          console.log("  \u2753 Missing: " + m),
        );
      }
    } catch (e) {
      console.log("--- " + s.name + " [PARSE ERROR] ---");
      console.log(text.slice(0, 300));
    }
    console.log("");
  }
}

main().catch(console.error);
