import { NextResponse } from "next/server";
import { prisma } from "@tradeos/database";
import { apiErrorResponse, withApiSession } from "../../../lib/api-errors";
import { calculateLandedCost, parsePriceRange } from "../../../lib/landed-cost";
import { z } from "zod";

const NVIDIA_BASE_URL =
  process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const MODEL = process.env.ANALYSIS_MODEL || "meta/llama-3.1-70b-instruct";

const supplierDataSchema = z.object({
  platform: z.string().optional(),
  url: z.string().optional(),
  productName: z.string().optional(),
  priceRaw: z.string().optional(),
  supplierName: z.string().optional(),
  supplierUrl: z.string().optional(),
  moq: z.string().optional(),
  rating: z.string().optional(),
  reviewCount: z.string().optional(),
  certifications: z.array(z.string()).optional(),
  transactionHistory: z.string().optional(),
  responseRate: z.string().optional(),
  pageTextSample: z.string().optional(),
  blocked: z.boolean().optional(),
});

const requestSchema = z.object({
  supplierData: supplierDataSchema,
});

const SYSTEM_PROMPT = `You are TradeOS Procurement Analysis Engine.

YOUR JOB: Analyze supplier data extracted from B2B platforms and produce a structured assessment.

CRITICAL RULES:
1. If data is missing or unclear, say "NOT EXTRACTED" — never guess, never fabricate.
2. If the page text contains "unusual traffic", "detected", "verify you are human", "blocked", or anti-bot messages, flag HIGH risk.
3. Evidence quality: CONFIRMED (multiple sources/verified) | CLAIMED (single source) | UNCERTAIN | NOT_EXTRACTED
4. Every assessment must flag missing evidence explicitly.
5. Cheap price without supporting evidence = RISK FLAG.
6. Missing certifications = RISK FLAG.
7. Low reviews or transaction history = RISK FLAG.
8. No factory audit = RISK FLAG.
9. Low response rate (<80%) = RISK FLAG.

OUTPUT: ONLY valid JSON with this exact structure — no other text:
{
  "supplierName": "string",
  "productName": "string",
  "platform": "string",
  "priceAssessment": {
    "rawValue": "string",
    "confidence": "confirmed|claimed|uncertain|not_extracted",
    "estimatedTotalLandedCost": "string or null",
    "landedCostBreakdown": { "fobPerUnit": "number or null", "shippingPerUnit": "number or null", "dutiesPerUnit": "number or null", "totalPerUnit": "number or null" } | null,
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
    { "type": "missing_evidence|cheap_price|low_credibility|no_audit|blocked|other", "detail": "string", "severity": "high|medium|low" }
  ],
  "overallRisk": "high|medium|low",
  "recommendation": {
    "verdict": "avoid|proceed_with_caution|needs_verification|insufficient_data",
    "rationale": "string",
    "humanMustDecide": ["string"]
  },
  "evidenceQuality": "high|medium|low",
  "missingEvidence": ["string"]
}`;

export async function POST(request: Request) {
  try {
    const auth = await withApiSession(request);
    if (auth.response) return auth.response;
    const { session } = auth;

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { supplierData } = parsed.data;

    if (supplierData.blocked) {
      // Platform blocked — save as evidence with blocked status
      const evidenceItem = await prisma.evidenceItem.create({
        data: {
          organizationId: session.organizationId,
          relatedType: "supplier_analysis",
          evidenceType: "COMPARISON_TABLE",
          title: `Blocked: ${supplierData.url || "unknown URL"}`,
          description:
            "Platform blocked automated access during extraction attempt",
          content: JSON.stringify({
            error: "PLATFORM_BLOCKED",
            url: supplierData.url,
            platform: supplierData.platform,
            extractedAt: new Date().toISOString(),
            humanApproved: false,
          }),
          externalUrl: supplierData.url || null,
          capturedBy: session.userId,
          metadata: {
            platform: supplierData.platform || "unknown",
            status: "blocked",
            modelUsed: "none",
          },
        },
      });

      return NextResponse.json({
        id: evidenceItem.id,
        analysis: null,
        extractedData: supplierData,
        error: "PLATFORM_BLOCKED",
        message:
          "Platform blocked extraction. Try refreshing the page or opening a direct product page.",
        needsHumanApproval: false,
      });
    }

    // 1. Try to parse price for landed cost calculation
    let landedCost = null;
    if (supplierData.priceRaw) {
      const priceRange = parsePriceRange(supplierData.priceRaw);
      if (priceRange) {
        landedCost = calculateLandedCost({
          fobPricePerUnit: priceRange.avg,
          quantity:
            parseInt(supplierData.moq?.replace(/[^0-9]/g, "") || "500") || 500,
          unitWeightKg: 0.05, // default: 50g per earbud set
          unitVolumeCbm: 0.0003, // default: small electronics
          shipMode: "air",
          originCountry: "CN",
          destCountry: "US",
          productCategory: "electronics",
        });
      }
    }

    // 2. Build analysis payload
    const extractedSummary = [
      `Product: ${supplierData.productName || "NOT EXTRACTED"}`,
      `Supplier: ${supplierData.supplierName || "NOT EXTRACTED"}`,
      `Price: ${supplierData.priceRaw || "NOT EXTRACTED"}`,
      `Platform: ${supplierData.platform || "unknown"}`,
      `URL: ${supplierData.url || "NOT EXTRACTED"}`,
      `MOQ: ${supplierData.moq || "NOT EXTRACTED"}`,
      `Rating: ${supplierData.rating || "NOT EXTRACTED"}`,
      `Reviews: ${supplierData.reviewCount || "NOT EXTRACTED"}`,
      `Transactions: ${supplierData.transactionHistory || "NOT EXTRACTED"}`,
      `Response Rate: ${supplierData.responseRate || "NOT EXTRACTED"}`,
      `Certifications: ${(supplierData.certifications || []).join(", ") || "NOT EXTRACTED"}`,
      ``,
      `--- Total landed cost estimate ---`,
      landedCost
        ? `FOB: $${landedCost.fobTotal} | Shipping: $${landedCost.shippingCost} | Duties: $${landedCost.dutiesTotal} | Insurance: $${landedCost.insuranceCost} | Fees: $${landedCost.paymentFees}`
        : "Could not calculate (no price data)",
      landedCost
        ? `Estimated cost per unit (all-in): $${landedCost.costPerUnit}`
        : "",
      landedCost ? `Confidence: ${landedCost.confidence}` : "",
      ``,
      `--- Page text ---`,
      (supplierData.pageTextSample || "").slice(0, 6000),
    ].join("\n");

    // 3. Call NVIDIA API
    const nvidiaRes = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
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

    if (!nvidiaRes.ok) {
      const errText = await nvidiaRes.text();
      return NextResponse.json(
        { error: "AI analysis failed", detail: errText },
        { status: 502 },
      );
    }

    const nvidiaResult = await nvidiaRes.json();
    let analysisText = nvidiaResult.choices?.[0]?.message?.content || "";
    analysisText = analysisText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*$/g, "")
      .trim();

    let analysis: Record<string, unknown> = {};
    try {
      analysis = JSON.parse(analysisText);
    } catch {
      analysis = {
        _parseWarning: "Raw text stored",
        rawText: analysisText,
        overallRisk: "uncertain",
        evidenceQuality: "low",
        recommendation: {
          verdict: "insufficient_data",
          rationale: "Parse error",
        },
      };
    }

    // 4. Merge landed cost into analysis
    if (landedCost) {
      (analysis as any).priceAssessment = {
        ...((analysis as any).priceAssessment || {}),
        landedCostBreakdown: {
          fobPerUnit:
            landedCost.fobTotal /
            (parseInt(supplierData.moq?.replace(/[^0-9]/g, "") || "500") ||
              500),
          shippingPerUnit:
            landedCost.shippingCost /
            (parseInt(supplierData.moq?.replace(/[^0-9]/g, "") || "500") ||
              500),
          dutiesPerUnit:
            landedCost.dutiesTotal /
            (parseInt(supplierData.moq?.replace(/[^0-9]/g, "") || "500") ||
              500),
          totalPerUnit: landedCost.costPerUnit,
        },
        estimatedTotalLandedCost: `$${landedCost.costPerUnit}/unit (all-in)`,
        notes: [
          ...((analysis as any).priceAssessment?.notes || []),
          `Landed cost calculated at MOQ ${supplierData.moq || "500"} units`,
          ...landedCost.assumptions,
        ],
      };
    }

    // 5. Save to evidence ledger
    const evidenceItem = await prisma.evidenceItem.create({
      data: {
        organizationId: session.organizationId,
        relatedType: "supplier_analysis",
        evidenceType: "COMPARISON_TABLE",
        title: `Analysis: ${supplierData.supplierName || supplierData.productName || "Unknown"}`,
        description: `AI analysis of supplier data from ${supplierData.platform || "unknown"}`,
        content: JSON.stringify({
          extractedData: supplierData,
          analysis,
          landedCost,
          humanApproved: false,
        }),
        externalUrl: supplierData.url || null,
        capturedBy: session.userId,
        metadata: {
          platform: supplierData.platform || "unknown",
          modelUsed: MODEL,
          evidenceQuality: (analysis as any).evidenceQuality || "low",
          overallRisk: (analysis as any).overallRisk || "uncertain",
          hasLandedCost: !!landedCost,
        },
      },
    });

    return NextResponse.json({
      id: evidenceItem.id,
      analysisId: evidenceItem.id,
      analysis,
      landedCost: landedCost
        ? {
            fobTotal: landedCost.fobTotal,
            shippingCost: landedCost.shippingCost,
            dutiesTotal: landedCost.dutiesTotal,
            insuranceCost: landedCost.insuranceCost,
            paymentFees: landedCost.paymentFees,
            grandTotal: landedCost.grandTotal,
            costPerUnit: landedCost.costPerUnit,
            confidence: landedCost.confidence,
            assumptions: landedCost.assumptions,
          }
        : null,
      extractedData: supplierData,
      evidenceItemId: evidenceItem.id,
      needsHumanApproval: true,
      message:
        "Review the analysis and approve to save to your evidence ledger.",
    });
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "analyze-supplier" });
}
