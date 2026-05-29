import { NextResponse } from "next/server";
import { prisma } from "@tradeos/database";
import {
  apiErrorResponse,
  withApiPermission,
} from "../../../../lib/api-errors";

type ParsedEvidence = {
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
  missingProofFlags: string[];
  evidenceQuality: string;
  evidenceQualityScore: number;
  rawText: string;
};

function suggestNextStep(
  quality: string,
  score: number,
  flags: string[],
  hasSupplier: boolean,
): DraftSuggestion["suggestedNextStep"] {
  const level = quality.split("_")[0] ?? "L0";
  if (level === "L0" || level === "L1") return "NEEDS_MORE_EVIDENCE";
  if (!hasSupplier) return "NEEDS_SUPPLIER_IDENTITY";
  if (
    flags.includes("NEEDS_LANDED_COST") ||
    flags.includes("NEEDS_ORIGIN_PRICE")
  )
    return "REQUEST_MORE_EVIDENCE";
  if (score >= 40) return "CREATE_CASE_DRAFT";
  return "WAIT";
}

function suggestPainCategories(flags: string[]): string[] {
  const categories: string[] = [];
  if (flags.includes("NEEDS_CURRENT_PRICE"))
    categories.push("Overpaying / Price Gap");
  if (flags.includes("NEEDS_SUPPLIER_IDENTITY"))
    categories.push("Single Supplier Dependency");
  if (flags.includes("NEEDS_LANDED_COST")) categories.push("Hidden Costs");
  if (flags.includes("NEEDS_ORIGIN_PRICE"))
    categories.push("Missing Price Evidence");
  if (flags.includes("NEEDS_MARKET_BENCHMARK"))
    categories.push("No Market Benchmark");
  return categories.length > 0 ? categories : ["General Price Check"];
}

export async function GET(request: Request) {
  try {
    const auth = await withApiPermission(request, "evidence.upload");
    if (auth.response) return auth.response;

    const url = new URL(request.url);
    const evidenceItemId = url.searchParams.get("evidenceItemId");

    if (!evidenceItemId) {
      return NextResponse.json(
        { error: "evidenceItemId is required" },
        { status: 400 },
      );
    }

    const evidence = await prisma.evidenceItem.findUnique({
      where: { id: evidenceItemId },
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
    const parsedEvidence = metadata?.parsedEvidence as
      | ParsedEvidence
      | undefined;
    const rawText = (metadata?.rawText as string) ?? evidence.content ?? "";

    if (!parsedEvidence) {
      return NextResponse.json(
        {
          error:
            "Evidence has no parsed data. Parse it first via /api/evidence/parse.",
        },
        { status: 400 },
      );
    }

    const hasSupplier = !!parsedEvidence.supplierName;
    const productName = parsedEvidence.productName ?? "";
    const supplierName = parsedEvidence.supplierName ?? "";
    const priceStr =
      parsedEvidence.price != null
        ? `${parsedEvidence.currency ?? "USD"} ${parsedEvidence.price}${parsedEvidence.unit ? `/${parsedEvidence.unit}` : ""}`
        : "";

    const suggestion: DraftSuggestion = {
      evidenceItemId: evidence.id,
      evidenceTitle: evidence.title,
      suggestedTitle: `${productName ? `${productName} — ` : ""}Sourcing${supplierName ? ` from ${supplierName}` : ""}`,
      suggestedProduct: productName,
      suggestedSupplier: supplierName,
      suggestedPrice: priceStr,
      suggestedCurrency: parsedEvidence.currency ?? "USD",
      suggestedUnit: parsedEvidence.unit ?? "",
      suggestedQuantity:
        parsedEvidence.quantity != null ? String(parsedEvidence.quantity) : "",
      suggestedOrigin: parsedEvidence.originCountry ?? "",
      suggestedSourceCountry: parsedEvidence.originCountry ?? "",
      suggestedPainCategories: suggestPainCategories(
        parsedEvidence.missingProofFlags,
      ),
      suggestedNextStep: suggestNextStep(
        parsedEvidence.evidenceQuality,
        parsedEvidence.evidenceQualityScore,
        parsedEvidence.missingProofFlags,
        hasSupplier,
      ),
      missingProofFlags: parsedEvidence.missingProofFlags,
      evidenceQuality: parsedEvidence.evidenceQuality,
      evidenceQualityScore: parsedEvidence.evidenceQualityScore,
      rawText,
    };

    return NextResponse.json(suggestion);
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}
