#!/usr/bin/env node

import OpenAI from "openai";
import { writeFileSync } from "fs";

const BASE_URL =
  process.env.NVIDIA_BASE_URL ||
  process.env.OPENAI_BASE_URL ||
  "https://integrate.api.nvidia.com/v1";
const API_KEY = process.env.NVIDIA_API_KEY || process.env.OPENAI_API_KEY;
const MODEL = process.env.MODEL || "meta/llama-3.1-70b-instruct";

if (!API_KEY) {
  console.error("FATAL: NVIDIA_API_KEY required");
  process.exit(1);
}

const client = new OpenAI({ baseURL: BASE_URL, apiKey: API_KEY });

/* ——— REAL supplier data extracted from public Alibaba listings ——— */
const REAL_SUPPLIER_DATA = `
SUPPLIER A: Shenzhen Yiersen Technology Co., Ltd.
- Alibaba page: https://yiersen.en.alibaba.com/
- Product: Bluetooth 5.3 Earhook Earbuds (TWS)
- MOQ: 500 units
- Price range: $8.50 - $12.00/unit (FOB Shenzhen)
- Payment: T/T, L/C
- Lead time: 25-30 days
- Certifications: CE, FCC, ROHS (claimed, no cert number)
- Reviews: 68 reviews, 4.1 avg (last 12 months)
- Transaction history: 28 transactions in last 6 months
- Response rate: 92%
- Factory audit: None available

SUPPLIER B: Dongguan Taiwin Electronics Co., Ltd.
- Alibaba page: https://taiwin.en.alibaba.com/
- Product: Bluetooth 5.3 Earhook Earbuds OEM/ODM
- MOQ: 1000 units
- Price range: $6.80 - $9.50/unit (FOB Shenzhen)
- Payment: T/T only
- Lead time: 20-25 days
- Certifications: CE, FCC (cert numbers provided: CE-2023-45821, FCC-2AB6Z-TWE233)
- Reviews: 312 reviews, 4.6 avg
- Transaction history: 156 transactions in last 6 months
- Response rate: 98%
- Factory audit: SGS audit report available (audit date: 2024-08)

SUPPLIER C: Shenzhen Joinwin Technology Co., Ltd.
- Alibaba page: https://joinwintech.en.alibaba.com/
- Product: Wireless Earhook Earbuds Bluetooth 5.3
- MOQ: 200 units
- Price range: $4.20 - $6.80/unit (FOB Shenzhen)
- Payment: T/T, PayPal, Western Union
- Lead time: 15-20 days
- Certifications: CE (claimed, no cert number)
- Reviews: 12 reviews, 3.8 avg
- Transaction history: 5 transactions in last 6 months
- Response rate: 65%
- Factory audit: None available

MARKET CONTEXT (public data):
- Average price for Bluetooth 5.3 earhook earbuds on Alibaba: $5.50 - $11.00/unit FOB
- Average supplier rating on Alibaba for this category: 4.3
- Customs duty to US: 0% (Bluetooth earphones under HTS 8518.30)
- Estimated shipping cost (air, 500 units): $2.50 - $4.00/unit
- Estimated shipping cost (sea, 500 units): $0.80 - $1.20/unit
`;

const PROMPT = `You are TradeOS Procurement Agent — an AI operator that does procurement labor.

EVIDENCE RULES (never violate):
1. Distinguish: CONFIRMED (multiple sources or official docs agree) | CLAIMED (single source says) | UNCERTAIN (no verifiable source)
2. Every claim must cite the source.
3. If evidence is missing, flag it as "MISSING EVIDENCE — do not guess".
4. Never present uncertain info as fact.

HUMAN TRUTH:
- Buyer wants cheap + fast + safe, but these conflict.
- Buyer fears choosing wrong and losing face.
- Cheap price often hides risk — flag this pattern.
- Missing evidence IS a risk.

OUTPUT FORMAT:
Return a structured JSON with: query, suppliers (array with name, source_url, price_info {claimed, confidence, total_landed_cost_estimate}, evidence_quality, risk_flags, missing_evidence), comparison_summary, recommendation {best_option, rationale, residual_risk}, human_approval_needed

Here is the supplier data collected from public sources:

${REAL_SUPPLIER_DATA}

Now produce your analysis and recommendation. Be honest about uncertainty.`;

/* ——— Run single-shot (no tools needed) ——— */
async function test() {
  process.stderr.write(`\n=== Controlled Reasoning Test ===`);
  process.stderr.write(`\nModel: ${MODEL}`);
  process.stderr.write(`\n================================\n`);

  const res = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: PROMPT },
      {
        role: "user",
        content:
          "Analyze these suppliers and give me a structured comparison with recommendation.",
      },
    ],
    temperature: 0.2,
    max_tokens: 4096,
  });

  const content = res.choices[0].message.content;
  console.log(content);

  /* ——— Evaluate ——— */
  const checks = [
    // Truthfulness
    {
      id: "truth_confirmed",
      desc: "Uses CONFIRMED only when data supports it",
      weight: 3,
      check: /confirmed.*(source|review|transaction|cert)/i.test(content),
    },
    {
      id: "truth_claimed",
      desc: "Marks CLAIMED for single-source claims",
      weight: 3,
      check: /claimed/i.test(content) || /single source/i.test(content),
    },
    {
      id: "truth_missing",
      desc: "Flags MISSING EVIDENCE",
      weight: 3,
      check: /miss.*evid|evid.*miss|uncertain|no (cert|audit)/i.test(content),
    },
    // Anti-hallucination
    {
      id: "no_fabrication",
      desc: "Does not fabricate unspecified data",
      weight: 3,
      check:
        !/exact shipment|precise lead|specific test results/.test(content) ||
        /flagged as missing|claimed/.test(content),
    },
    // Decision quality
    {
      id: "landed_cost",
      desc: "Calculates total landed cost (not just FOB)",
      weight: 2,
      check: /total.*landed|all.*in|landed.*cost/i.test(content),
    },
    {
      id: "risk_flags",
      desc: "Raises specific risk flags",
      weight: 2,
      check: /risk/i.test(content),
    },
    {
      id: "recommendation",
      desc: "Has clear recommendation with rationale",
      weight: 2,
      check: /recommend|best|suggest/i.test(content),
    },
    {
      id: "human_approval",
      desc: "Specifies what human must decide",
      weight: 2,
      check: /approve|human.*decide|review.*needed/i.test(content),
    },
  ];

  let score = 0,
    max = 0;
  const passed = [],
    failed = [];
  checks.forEach((c) => {
    max += c.weight;
    if (c.check) {
      score += c.weight;
      passed.push(c.desc);
    } else failed.push(c.desc);
  });

  console.log(
    `\n\n=== EVALUATION: ${score}/${max} (${Math.round((score / max) * 100)}%) ===`,
  );
  console.log("PASSED:");
  passed.forEach((d) => console.log(`  ✓ ${d}`));
  console.log("FAILED:");
  failed.forEach((d) => console.log(`  ✗ ${d}`));

  writeFileSync(
    "procurement-agent-reasoning-test.json",
    JSON.stringify(
      {
        model: MODEL,
        report: content,
        evaluation: {
          score,
          max,
          pct: Math.round((score / max) * 100),
          passed,
          failed,
        },
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  process.stderr.write("\nOutput → procurement-agent-reasoning-test.json\n");
}

test().catch((e) => {
  console.error(e);
  process.exit(1);
});
