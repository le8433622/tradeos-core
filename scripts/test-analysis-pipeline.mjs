#!/usr/bin/env node

// Test the analysis pipeline with SIMULATED extension data
// Tests: anti-hallucination, evidence quality, risk flags

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const BASE_URL =
  process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
const MODEL = process.env.MODEL || "meta/llama-3.1-70b-instruct";

if (!NVIDIA_API_KEY) {
  console.error("FATAL: NVIDIA_API_KEY required");
  process.exit(1);
}

// Simulate what the BROWSER EXTENSION extracts from a real Alibaba page
// (user's real browser session, no anti-bot)
const simulatedExtraction = {
  platform: "alibaba",
  url: "https://www.alibaba.com/product-detail/Bluetooth-5-3-Earhook-Earbuds_1601234567890.html",
  extractedAt: new Date().toISOString(),
  productName:
    "Wholesale Bluetooth 5.3 Earhook Earbuds TWS Wireless Earphones OEM ODM",
  priceRaw: "US $6.80 - $9.50 / piece",
  supplierName: "Shenzhen Fenda Technology Co., Ltd.",
  supplierUrl: "https://fenda.en.alibaba.com/",
  moq: "500 pieces",
  rating: "4.6",
  reviewCount: "312 reviews",
  certifications: ["CE", "FCC"],
  transactionHistory: "156 transactions in last 6 months",
  responseRate: "98%",
  pageTextSample: `Product Details
Bluetooth 5.3 Earhook Earbuds TWS Wireless Earphones OEM ODM
Price: US $6.80 - $9.50 / piece
MOQ: 500 pieces
Port: Shenzhen
Payment Terms: T/T
Supply Ability: 50000 pieces per month
Lead Time: 20-25 days
Certifications: CE, FCC, ROHS
Company: Shenzhen Fenda Technology Co., Ltd.
Year Established: 2014
Employees: 150-200
Factory Size: 3000 sqm
SGS Audit Report: Available
Main Markets: North America (30%), Europe (25%), Southeast Asia (20%)
Response Rate: 98%
Customer Reviews: 4.6/5 (312 reviews)
Transaction History: 156 transactions in last 6 months`,
};

const SYSTEM_PROMPT = `You are TradeOS Procurement Analysis Engine.

YOUR JOB: Analyze supplier data extracted from B2B platforms and produce a structured assessment.

CRITICAL RULES (these are your invariants):
1. If data is missing or unclear, say "NOT EXTRACTED" — never guess, never fabricate.
2. Evidence quality levels:
   - CONFIRMED: multiple sources agree or official cert numbers provided
   - CLAIMED: single source says so, no verification
   - UNCERTAIN: no source, implied, or ambiguous
   - NOT EXTRACTED: data was not available from the page
3. Every assessment must flag missing evidence explicitly.
4. Cheap price without supporting evidence = RISK FLAG. Flag it.
5. Missing certifications = RISK FLAG. Flag it.
6. Low reviews or transaction history = RISK FLAG. Flag it.
7. No factory audit = RISK FLAG. Flag it.

OUTPUT: ONLY valid JSON with this exact structure — no other text:
{
  "supplierName": "string",
  "productName": "string",
  "platform": "alibaba|made-in-china|globalsources|unknown",
  "priceAssessment": {
    "rawValue": "string",
    "confidence": "confirmed|claimed|uncertain|not_extracted",
    "estimatedTotalLandedCost": "string or null",
    "notes": ["string"]
  },
  "supplierCredibility": {
    "rating": "string or null",
    "reviewCount": "string or null",
    "transactionHistory": "string or null",
    "responseRate": "string or null",
    "confidence": "confirmed|claimed|uncertain|not_extracted"
  },
  "certifications": {
    "claimed": ["string"],
    "verified": ["string"],
    "missingEvidence": ["string"]
  },
  "riskFlags": [
    { "type": "missing_evidence|cheap_price|low_credibility|no_audit|other", "detail": "string", "severity": "high|medium|low" }
  ],
  "overallRisk": "high|medium|low",
  "recommendation": {
    "verdict": "proceed_with_caution|needs_verification|insufficient_data",
    "rationale": "string",
    "humanMustDecide": ["string"]
  },
  "evidenceQuality": "high|medium|low",
  "missingEvidence": ["string"]
}`;

async function test() {
  console.log("=== Test 1: Analysis with REAL extracted data ===\n");

  const extractedSummary = [
    `Product: ${simulatedExtraction.productName}`,
    `Supplier: ${simulatedExtraction.supplierName}`,
    `Price: ${simulatedExtraction.priceRaw}`,
    `Platform: ${simulatedExtraction.platform}`,
    `URL: ${simulatedExtraction.url}`,
    `MOQ: ${simulatedExtraction.moq}`,
    `Rating: ${simulatedExtraction.rating}`,
    `Reviews: ${simulatedExtraction.reviewCount}`,
    `Transactions: ${simulatedExtraction.transactionHistory}`,
    `Response Rate: ${simulatedExtraction.responseRate}`,
    `Certifications: ${simulatedExtraction.certifications.join(", ")}`,
    ``,
    `--- Page text (first 8000 chars) ---`,
    simulatedExtraction.pageTextSample.slice(0, 8000),
  ].join("\n");

  console.log("Prompt being sent (extracted data):");
  console.log(extractedSummary.slice(0, 500) + "...\n");

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${NVIDIA_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analyze this supplier data:\n\n${extractedSummary}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 2048,
    }),
  });

  const result = await res.json();
  let text = result.choices?.[0]?.message?.content || "";
  text = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*$/g, "")
    .trim();

  console.log("=== ANALYSIS RESULT ===");
  try {
    const parsed = JSON.parse(text);
    console.log(JSON.stringify(parsed, null, 2));

    // Evaluate
    console.log("\n=== EVALUATION ===");
    let passed = 0,
      total = 0;

    const checks = [
      { name: "Has supplierName", pass: !!parsed.supplierName },
      {
        name: "Has priceAssessment with confidence",
        pass: !!parsed.priceAssessment?.confidence,
      },
      {
        name: "price confidence !== not_extracted",
        pass: parsed.priceAssessment?.confidence !== "not_extracted",
      },
      {
        name: "Has riskFlags",
        pass: Array.isArray(parsed.riskFlags) && parsed.riskFlags.length > 0,
      },
      { name: "Has overallRisk", pass: !!parsed.overallRisk },
      {
        name: "Has recommendation.verdict",
        pass: !!parsed.recommendation?.verdict,
      },
      {
        name: "Has humanMustDecide items",
        pass: Array.isArray(parsed.recommendation?.humanMustDecide),
      },
      { name: "Has evidenceQuality", pass: !!parsed.evidenceQuality },
      {
        name: "Has missingEvidence array",
        pass: Array.isArray(parsed.missingEvidence),
      },
      {
        name: "certifications.claimed is array",
        pass: Array.isArray(parsed.certifications?.claimed),
      },
      {
        name: "certifications.missingEvidence is array",
        pass: Array.isArray(parsed.certifications?.missingEvidence),
      },
      {
        name: "Has total landed cost estimate",
        pass: !!parsed.priceAssessment?.estimatedTotalLandedCost,
      },
    ];

    checks.forEach((c) => {
      total++;
      if (c.pass) {
        console.log(`  ✓ ${c.name}`);
        passed++;
      } else {
        console.log(`  ✗ ${c.name}`);
      }
    });

    console.log(
      `\nScore: ${passed}/${total} (${Math.round((passed / total) * 100)}%)`,
    );

    // Check for hallucination
    const hasHallucination =
      !parsed.supplierName || parsed.supplierName.includes("NOT EXTRACTED");
    if (hasHallucination) {
      console.log(
        "\n⚠ WARNING: Model failed to extract basic data that was provided",
      );
    } else {
      console.log(
        "\n✓ Model correctly extracted provided data without hallucination",
      );
    }
  } catch (e) {
    console.log("PARSE ERROR:", e.message);
    console.log("RAW OUTPUT:", text);
  }

  // --- TEST 2: Empty data (anti-hallucination test) ---
  console.log("\n\n=== Test 2: ANTI-HALLUCINATION test with EMPTY data ===\n");

  const emptyData = [
    `Product: NOT EXTRACTED`,
    `Supplier: NOT EXTRACTED`,
    `Price: NOT EXTRACTED`,
    `Platform: alibaba`,
    `URL: NOT EXTRACTED`,
    ``,
    `--- Page text ---`,
    `The page did not load any product data. Content unavailable.`,
  ].join("\n");

  const res2 = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${NVIDIA_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Analyze this supplier data:\n\n${emptyData}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 2048,
    }),
  });

  const result2 = await res2.json();
  let text2 = result2.choices?.[0]?.message?.content || "";
  text2 = text2
    .replace(/```json\s*/gi, "")
    .replace(/```\s*$/g, "")
    .trim();

  console.log("=== RESULT WITH EMPTY DATA ===");
  try {
    const parsed2 = JSON.parse(text2);
    console.log(JSON.stringify(parsed2, null, 2));

    // Check for hallucination
    const hallucinated =
      (parsed2.supplierName && !parsed2.supplierName.includes("NOT")) ||
      (parsed2.productName && !parsed2.productName.includes("NOT")) ||
      (parsed2.priceAssessment?.rawValue &&
        !parsed2.priceAssessment?.rawValue.includes("NOT"));

    if (hallucinated) {
      console.log(
        "\n❌ HALLUCINATION DETECTED: Model fabricated data from empty input",
      );
    } else {
      console.log(
        "\n✓ Anti-hallucination PASSED: Model correctly reported no data",
      );
    }
  } catch (e) {
    console.log("PARSE ERROR:", e.message);
    console.log("RAW:", text2);
  }
}

test().catch(console.error);
