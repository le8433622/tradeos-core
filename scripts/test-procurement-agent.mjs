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
  console.error("FATAL: NVIDIA_API_KEY required\n  export NVIDIA_API_KEY=...");
  process.exit(1);
}

const client = new OpenAI({ baseURL: BASE_URL, apiKey: API_KEY });

/* ------------------------------------------------------------------ */
/*  Tool implementations                                               */
/* ------------------------------------------------------------------ */

async function webFetch(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "TradeOS-Agent/1.0",
        Accept: "text/html,application/json",
      },
      signal: AbortSignal.timeout(15_000),
    });
    const text = await res.text();
    const clean = text
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return JSON.stringify({ url, ok: true, content: clean.slice(0, 10_000) });
  } catch (err) {
    return JSON.stringify({ url, ok: false, error: err.message });
  }
}

async function webSearch(query) {
  // Use public search — fallback: fetch from a search engine
  // For now, returns guidance since no search API key is available
  return JSON.stringify({
    note: "No search API configured. Try web_fetch with specific URLs.",
    suggestion:
      "Use known supplier platforms: Alibaba (alibaba.com), Global Sources (globalsources.com), Made-in-China (made-in-china.com)",
    query,
  });
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "web_fetch",
      description:
        "Fetch content from a URL to get supplier info, pricing, product details.",
      parameters: {
        type: "object",
        properties: { url: { type: "string" } },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for suppliers, pricing, or product info.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
];

const HANDLERS = {
  web_fetch: (a) => webFetch(a.url),
  web_search: (a) => webSearch(a.query),
};

/* ------------------------------------------------------------------ */
/*  Agent loop                                                         */
/* ------------------------------------------------------------------ */

async function runAgent(userQuery, maxIters = 12) {
  const msgs = [
    {
      role: "system",
      content: `You are TradeOS Procurement Agent.

YOUR MISSION:
You do procurement labor — finding suppliers, comparing prices, verifying claims, assessing risk — so a human can make a better decision.

EVIDENCE RULES (never violate):
1. Distinguish: CONFIRMED (multiple sources agree) | CLAIMED (single source) | UNCERTAIN (no source)
2. Every claim needs a source URL. If no source, mark "MISSING EVIDENCE".
3. Never present uncertain info as fact.
4. Flag cheap-but-risky patterns, missing proof, and suspicious claims.

HUMAN TRUTH:
- Buyer wants cheap + fast + safe, but these conflict.
- Buyer fears choosing wrong and losing face.
- Buyer distrusts claims without evidence.
- Buyer gets confused by too many options without clear comparison.
- Price alone is a trap. Total landed cost + risk + evidence quality = real value.

OUTPUT FORMAT (final answer):
\`\`\`json
{
  "query": "...",
  "suppliers": [
    {
      "name": "...",
      "source_url": "...",
      "price_info": { "claimed": "...", "confidence": "confirmed|claimed|uncertain", "total_landed_cost_estimate": "..." },
      "evidence_quality": "high|medium|low|none",
      "risk_flags": ["..."],
      "missing_evidence": ["..."]
    }
  ],
  "comparison_summary": "...",
  "recommendation": { "best_option": "...", "rationale": "...", "residual_risk": "..." },
  "human_approval_needed": ["..."]
}
\`\`\``,
    },
    { role: "user", content: userQuery },
  ];

  for (let i = 0; i < maxIters; i++) {
    process.stderr.write(`\n--- Iteration ${i + 1} ---\n`);

    const res = await client.chat.completions.create({
      model: MODEL,
      messages: msgs,
      tools: TOOLS,
      tool_choice: "auto",
      parallel_tool_calls: false,
      temperature: 0.2,
      max_tokens: 4096,
    });

    const msg = res.choices[0].message;
    const preview = (msg.content || "(tool call)").slice(0, 160);
    process.stderr.write(`[model] ${preview}\n`);

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return msg.content;
    }

    msgs.push(msg);

    for (const tc of msg.tool_calls) {
      const fn = tc.function;
      const args = JSON.parse(fn.arguments);
      process.stderr.write(
        `  → ${fn.name}(${JSON.stringify(args).slice(0, 120)})\n`,
      );
      const handler = HANDLERS[fn.name];
      const result = handler ? await handler(args) : `Unknown tool: ${fn.name}`;
      msgs.push({ role: "tool", tool_call_id: tc.id, content: result });
    }
  }

  return "MAX ITERATIONS REACHED without final answer";
}

/* ------------------------------------------------------------------ */
/*  Evaluation (based on HUMAN_NATURE_AXIOMS.md)                       */
/* ------------------------------------------------------------------ */

function evaluate(text) {
  const checks = [
    {
      id: "sources",
      desc: "Cites URLs / sources",
      weight: 2,
      check: /https?:\/\/[^\s)\]]+/.test(text),
    },
    {
      id: "missing_evid",
      desc: "Flags missing / uncertain evidence",
      weight: 2,
      check: /miss(ing|ed)|uncertain|unconfirmed|no (source|evidence)/i.test(
        text,
      ),
    },
    {
      id: "structured",
      desc: "Structured comparison (table/json)",
      weight: 2,
      check: /\{.*"suppliers"/s.test(text) || /\|.*\|.*\|/.test(text),
    },
    {
      id: "risk",
      desc: "Risk flags / red flags",
      weight: 2,
      check: /risk|red flag|warning|caut/i.test(text),
    },
    {
      id: "recommendation",
      desc: "Has recommendation with rationale",
      weight: 1,
      check: /recommend|best option|suggest/i.test(text),
    },
    {
      id: "human_approval",
      desc: "Identifies where human must decide",
      weight: 1,
      check: /human.?(approve|decide|review)|approval need/i.test(text),
    },
  ];
  const passed = checks.filter((c) => c.check);
  const score = passed.reduce((s, c) => s + c.weight, 0);
  const max = checks.reduce((s, c) => s + c.weight, 0);
  return {
    score,
    max,
    pct: Math.round((score / max) * 100),
    passed: passed.map((c) => ({ id: c.id, desc: c.desc })),
    failed: checks
      .filter((c) => !c.check)
      .map((c) => ({ id: c.id, desc: c.desc })),
  };
}

/* ------------------------------------------------------------------ */
/*  MAIN                                                                */
/* ------------------------------------------------------------------ */

const TEST_QUERY =
  process.argv[2] ||
  `I need to source "Bluetooth 5.3 earhook earbuds" for my business (OEM/ODM, minimum 500 units per model).

Please:
1. Find real supplier information from public data
2. Compare at least 3 suppliers on: price, credibility, evidence quality
3. Assess risks for each
4. Give a structured recommendation

Start by fetching real supplier data. Try Alibaba, Global Sources, or similar platforms.`;

process.stderr.write(`\n=== TradeOS Procurement Agent Test ===`);
process.stderr.write(`\nModel: ${MODEL}`);
process.stderr.write(`\nBase:  ${BASE_URL}`);
process.stderr.write(`\n======================================\n\n`);

const report = await runAgent(TEST_QUERY);

console.log("\n\n=========== FINAL REPORT ===========");
console.log(report);
console.log("===================================\n");

const ev = evaluate(report);
console.log(`\n=== EVALUATION: ${ev.score}/${ev.max} (${ev.pct}%) ===`);
console.log("PASSED:");
ev.passed.forEach((p) => console.log(`  ✓ ${p.desc}`));
console.log("FAILED:");
ev.failed.forEach((f) => console.log(`  ✗ ${f.desc}`));

writeFileSync(
  "procurement-agent-test-output.json",
  JSON.stringify(
    {
      model: MODEL,
      query: TEST_QUERY,
      report,
      evaluation: ev,
      timestamp: new Date().toISOString(),
    },
    null,
    2,
  ),
);

process.stderr.write("\nOutput → procurement-agent-test-output.json\n");
