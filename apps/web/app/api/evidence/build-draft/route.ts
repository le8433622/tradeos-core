import { NextResponse } from "next/server";
import { prisma } from "@tradeos/database";
import {
  detectPain,
  type ParsedEvidence,
  type EvidenceSourceType,
  type EvidenceQualityLevel,
  type MissingProofFlag,
} from "@tradeos/evidence-core";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../lib/api-errors";

type DraftParsedEvidence = {
  sourceType: string;
  productName?: string;
  supplierName?: string;
  price?: number;
  currency?: string;
  unit?: string;
  quantity?: number;
  originCountry?: string;
  landedCost?: number;
  paymentTerms?: string;
  deliveryTerms?: string;
  evidenceQuality: string;
  evidenceQualityScore: number;
  missingProofFlags: string[];
  rawEvidenceRef: string;
};

export type DraftSuggestion = {
  evidenceItemId: string;
  evidenceTitle: string;
  suggestedTitle: string;
  suggestedProduct: string;
  suggestedSupplier: string;
  suggestedPrice: string;
  suggestedCurrency: string;
  suggestedUnit: string;
  suggestedQuantity: string;
  suggestedOrigin: string;
  suggestedSourceCountry: string;
  suggestedPainCategories: string[];
  suggestedNextStep:
    | "CREATE_CASE_DRAFT"
    | "NEEDS_MORE_EVIDENCE"
    | "NEEDS_SUPPLIER_IDENTITY"
    | "REQUEST_MORE_EVIDENCE"
    | "WAIT";
  suggestedReason: string;
  painFlags: string[];
  dependencyFlags: string[];
  missingProofFlags: string[];
  evidenceQuality: string;
  evidenceQualityScore: number;
  rawText: string;
};

export async function GET(request: Request) {
  try {
    const auth = await withApiPermission(request, "evidence.upload");
    if (auth.response) return auth.response;
    const { session } = auth;

    const url = new URL(request.url);
    const evidenceItemId = url.searchParams.get("evidenceItemId");

    if (!evidenceItemId) {
      return NextResponse.json(
        { error: "evidenceItemId is required" },
        { status: 400 },
      );
    }

    const evidence = await prisma.evidenceItem.findFirst({
      where: { id: evidenceItemId, organizationId: session.organizationId },
      select: {
        id: true,
        title: true,
        content: true,
        metadata: true,
        organizationId: true,
      },
    });

    if (!evidence) {
      return NextResponse.json(
        { error: "EVIDENCE_NOT_FOUND" },
        { status: 404 },
      );
    }

    const metadata = evidence.metadata as Record<string, unknown> | null;
    const rawParsed = metadata?.parsedEvidence as
      | DraftParsedEvidence
      | undefined;
    const rawText = (metadata?.rawText as string) ?? evidence.content ?? "";

    if (!rawParsed) {
      return NextResponse.json(
        {
          error:
            "Evidence has no parsed data. Parse it first via /api/evidence/parse.",
        },
        { status: 400 },
      );
    }

    const productName = rawParsed.productName ?? "";
    const supplierName = rawParsed.supplierName ?? "";
    const priceStr =
      rawParsed.price != null
        ? `${rawParsed.currency ?? "USD"} ${rawParsed.price}${rawParsed.unit ? `/${rawParsed.unit}` : ""}`
        : "";

    const parsed: ParsedEvidence = {
      sourceType: rawParsed.sourceType as EvidenceSourceType,
      productName: rawParsed.productName,
      supplierName: rawParsed.supplierName,
      price: rawParsed.price,
      currency: rawParsed.currency,
      unit: rawParsed.unit,
      quantity: rawParsed.quantity,
      originCountry: rawParsed.originCountry,
      landedCost: rawParsed.landedCost,
      paymentTerms: rawParsed.paymentTerms,
      deliveryTerms: rawParsed.deliveryTerms,
      evidenceQuality: rawParsed.evidenceQuality as EvidenceQualityLevel,
      evidenceQualityScore: rawParsed.evidenceQualityScore,
      missingProofFlags: rawParsed.missingProofFlags as MissingProofFlag[],
      confidence: {},
      rawEvidenceRef: rawParsed.rawEvidenceRef ?? "",
    };

    const painResult = detectPain(parsed);

    const suggestion: DraftSuggestion = {
      evidenceItemId: evidence.id,
      evidenceTitle: evidence.title,
      suggestedTitle: `${productName ? `${productName} — ` : ""}Sourcing${supplierName ? ` from ${supplierName}` : ""}`,
      suggestedProduct: productName,
      suggestedSupplier: supplierName,
      suggestedPrice: priceStr,
      suggestedCurrency: rawParsed.currency ?? "USD",
      suggestedUnit: rawParsed.unit ?? "",
      suggestedQuantity:
        rawParsed.quantity != null ? String(rawParsed.quantity) : "",
      suggestedOrigin: rawParsed.originCountry ?? "",
      suggestedSourceCountry: rawParsed.originCountry ?? "",
      suggestedPainCategories:
        painResult.painFlags.length > 0
          ? painResult.painFlags
          : ["General Price Check"],
      suggestedNextStep: painResult.suggestedNextStep,
      suggestedReason: painResult.suggestedReason,
      painFlags: painResult.painFlags,
      dependencyFlags: painResult.dependencyFlags,
      missingProofFlags: rawParsed.missingProofFlags,
      evidenceQuality: rawParsed.evidenceQuality,
      evidenceQualityScore: rawParsed.evidenceQualityScore,
      rawText,
    };

    return NextResponse.json(suggestion);
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}
