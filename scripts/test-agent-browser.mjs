#!/usr/bin/env node

import puppeteer from "puppeteer";
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

/* ================================================================== */
/*  Browser-based fetch — renders JS, extracts real content             */
/* ================================================================== */

let browser;

async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
      ],
    });
  }
  return browser;
}

async function browserFetch(url, waitSec = 5) {
  const b = await getBrowser();
  const page = await b.newPage();
  try {
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    );
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });
    // Override navigator.webdriver flag
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    // Extra wait for dynamic content
    const ms = waitSec * 1000;
    await page.evaluate((t) => new Promise((r) => setTimeout(r, t)), ms);

    // Extract meaningful text
    const data = await page.evaluate(() => {
      // Remove script, style, nav, footer noise
      const clean = document.body.cloneNode(true);
      [
        "script",
        "style",
        "nav",
        "footer",
        "header",
        ".header",
        ".footer",
        ".nav",
        "noscript",
        "svg",
        "path",
        "img",
        "iframe",
      ].forEach((sel) => {
        try {
          const els = clean.querySelectorAll(sel);
          els.forEach((el) => el.remove());
        } catch (e) {}
      });
      return clean.innerText || clean.textContent || "";
    });

    const cleaned = data.replace(/\s+/g, " ").trim();
    return JSON.stringify({
      url,
      ok: true,
      content: cleaned.slice(0, 12000),
      length: cleaned.length,
    });
  } catch (err) {
    return JSON.stringify({ url, ok: false, error: err.message });
  } finally {
    await page.close();
  }
}

/* ================================================================== */
/*  Agent                                                               */
/* ================================================================== */

const TOOLS = [
  {
    type: "function",
    function: {
      name: "fetch_supplier_page",
      description:
        "Fetch a supplier/product page from the web using a real browser (renders JavaScript). Use for Alibaba, Global Sources, supplier websites.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "Full URL of the supplier page" },
          wait_for_seconds: {
            type: "number",
            description:
              "Seconds to wait for dynamic content to load (default 5)",
          },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_suppliers",
      description:
        "Get a search results page from a supplier platform. Uses browser rendering to get real results.",
      parameters: {
        type: "object",
        properties: {
          product: { type: "string", description: "Product to search for" },
          platform: {
            type: "string",
            enum: ["alibaba", "made-in-china", "globalsources"],
            description: "Platform to search",
          },
        },
        required: ["product"],
      },
    },
  },
];

const HANDLERS = {
  fetch_supplier_page: async (a) =>
    browserFetch(a.url, a.wait_for_seconds || 5),
  search_suppliers: async (a) => {
    const platform = a.platform || "alibaba";
    let url;
    if (platform === "alibaba") {
      url = `https://www.alibaba.com/trade/search?fsb=y&IndexArea=product_en&CatId=&SearchText=${encodeURIComponent(a.product)}`;
    } else if (platform === "made-in-china") {
      url = `https://www.made-in-china.com/products/${encodeURIComponent(a.product.replace(/\s+/g, "-"))}.html`;
    } else if (platform === "globalsources") {
      url = `https://www.globalsources.com/search/${encodeURIComponent(a.product)}/`;
    }
    if (url) return browserFetch(url, 8);
    return JSON.stringify({ error: `Unsupported platform: ${platform}` });
  },
};

async function runAgent(productQuery, maxIters = 15) {
  const msgs = [
    {
      role: "system",
      content: `You are TradeOS Procurement Agent.

MISSION: Find real suppliers from public data, compare them, and help human decide.

CRITICAL RULES:
1. If a fetch returns no useful data, say "NO DATA EXTRACTED" — never fabricate.
2. If content is unclear, say "CONTENT UNCLEAR — could not extract structured data".
3. Distinguish: CONFIRMED (multiple sources agree) | CLAIMED (single source) | UNCERTAIN (no source).
4. Never present uncertain info as fact.
5. Every claim needs source URL.

OUTPUT: Structured JSON with suppliers, prices, evidence quality, risk flags, recommendation.

HUMAN TRUTH: Buyer wants cheap + fast + safe. These conflict. Cheap hides risk. Missing evidence IS risk.`,
    },
    { role: "user", content: productQuery },
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
      // Truncate content for display
      const previewResult =
        result.length > 200 ? result.slice(0, 200) + "..." : result;
      process.stderr.write(`  ← result: ${previewResult}\n`);
      msgs.push({ role: "tool", tool_call_id: tc.id, content: result });
    }
  }

  return "MAX ITERATIONS REACHED";
}

/* ================================================================== */
/*  Evaluate                                                            */
/* ================================================================== */

function evaluate(content) {
  const checks = [
    {
      id: "sources",
      desc: "Cites URLs",
      w: 2,
      c: /https?:\/\/[^\s)\]]+/.test(content),
    },
    {
      id: "missing_evid",
      desc: "Flags missing/uncertain evidence",
      w: 3,
      c: /miss|uncertain|no (data|source|evidence|info|cert)/i.test(content),
    },
    {
      id: "no_fabrication",
      desc: "No hallucination (admits no data)",
      w: 3,
      c:
        /no data extract|content unclear|could not|cannot (verify|confirm)|need (more|real) data/i.test(
          content,
        ) || /miss|uncertain/i.test(content),
    },
    {
      id: "structured",
      desc: "Structured comparison output",
      w: 2,
      c:
        /\{.*supplier|supplier.*\{/is.test(content) ||
        /\|.*\|.*\|/.test(content),
    },
    {
      id: "risk",
      desc: "Risk flags",
      w: 2,
      c: /risk|red flag|warn|caut/i.test(content),
    },
    {
      id: "recommend",
      desc: "Recommendation with reasoning",
      w: 2,
      c: /recommend|best|suggest/i.test(content),
    },
    {
      id: "landed_cost",
      desc: "Total landed cost consideration",
      w: 1,
      c: /total.*land|all.?in cost|landed.*cost/i.test(content),
    },
    {
      id: "human",
      desc: "Human approval boundary",
      w: 1,
      c: /approve|human.*decide|review.*need/i.test(content),
    },
  ];
  let score = 0,
    max = 0;
  const passed = [],
    failed = [];
  checks.forEach((ch) => {
    max += ch.w;
    if (ch.c) {
      score += ch.w;
      passed.push(ch);
    } else failed.push(ch);
  });
  return {
    score,
    max,
    pct: Math.round((score / max) * 100),
    passed: passed.map((c) => c.desc),
    failed: failed.map((c) => c.desc),
  };
}

/* ================================================================== */
/*  MAIN                                                                */
/* ================================================================== */

const QUERY =
  process.argv[2] ||
  `I need to source Bluetooth 5.3 earhook earbuds (OEM/ODM, min 500 units).

Please search for real suppliers across multiple platforms:
1. Try Alibaba (alibaba.com)
2. Try Made-in-China (made-in-china.com)
3. Try Global Sources (globalsources.com)

For each platform, search for suppliers and fetch individual product pages if possible.
Compare what you find and give me a structured recommendation.

IMPORTANT: If a platform blocks you, say "BLOCKED" and try the next one. Never fabricate data.`;

process.stderr.write(`\n=== BROWSER-ENABLED PROCUREMENT AGENT TEST ===`);
process.stderr.write(`\nModel: ${MODEL}`);
process.stderr.write(`\n===============================================\n\n`);

try {
  const report = await runAgent(QUERY);

  console.log("\n\n=========== FINAL REPORT ===========");
  console.log(report);
  console.log("===================================\n");

  const ev = evaluate(report);
  console.log(`\n=== EVALUATION: ${ev.score}/${ev.max} (${ev.pct}%) ===`);
  console.log("PASSED:");
  ev.passed.forEach((d) => console.log(`  ✓ ${d}`));
  console.log("FAILED:");
  ev.failed.forEach((f) => console.log(`  ✗ ${f}`));

  writeFileSync(
    "procurement-agent-browser-test.json",
    JSON.stringify(
      {
        model: MODEL,
        query: QUERY,
        report,
        evaluation: ev,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  process.stderr.write("\nOutput → procurement-agent-browser-test.json\n");
} finally {
  if (browser) await browser.close();
}
