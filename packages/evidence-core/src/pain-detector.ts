import type {
  ParsedEvidence,
  PainFlag,
  DependencyFlag,
  PainDetectorResult,
} from "./types";

export type { PainFlag, DependencyFlag, PainDetectorResult };

export function detectPain(parsed: ParsedEvidence): PainDetectorResult {
  const painFlags: PainFlag[] = [];
  const dependencyFlags: DependencyFlag[] = [];
  const flags = parsed.missingProofFlags;
  const quality = parsed.evidenceQuality;
  const level = quality.split("_")[0] ?? "L0";
  const score = parsed.evidenceQualityScore;
  const hasSupplier = !!parsed.supplierName;
  const hasPrice = parsed.price != null;
  const hasLandedCost = parsed.landedCost != null;
  const hasDelivery = !!parsed.deliveryTerms;
  const hasPayment = !!parsed.paymentTerms;
  const needsOriginPrice = flags.includes("NEEDS_ORIGIN_PRICE");

  // --- Pain flags ---
  // CURRENT_PRICE_UNKNOWN: missing current buyer price
  if (!hasPrice || flags.includes("NEEDS_CURRENT_PRICE")) {
    painFlags.push("CURRENT_PRICE_UNKNOWN");
  }

  // ORIGIN_PRICE_UNKNOWN: missing origin/export price (independent of current price)
  if (needsOriginPrice) {
    painFlags.push("ORIGIN_PRICE_UNKNOWN");
  }

  // PRICE_GAP_POSSIBLE: buyer has current price but origin price is unknown
  if (hasPrice && needsOriginPrice) {
    painFlags.push("PRICE_GAP_POSSIBLE");
  }

  if (!hasLandedCost || flags.includes("NEEDS_LANDED_COST")) {
    painFlags.push("LANDED_COST_UNKNOWN");
  }

  if (!hasSupplier || flags.includes("NEEDS_SUPPLIER_IDENTITY")) {
    painFlags.push("SUPPLIER_PROOF_WEAK");
  }

  if (flags.includes("NEEDS_MARKET_BENCHMARK")) {
    painFlags.push("MARKET_BENCHMARK_MISSING");
  }

  if (flags.includes("NEEDS_QUALITY_PROOF")) {
    painFlags.push("QUALITY_PROOF_MISSING");
  }

  if (!hasDelivery || flags.includes("NEEDS_DELIVERY_TERMS")) {
    painFlags.push("DELIVERY_TERMS_MISSING");
  }

  if (!hasPayment || flags.includes("NEEDS_PAYMENT_TERMS")) {
    painFlags.push("PAYMENT_TERMS_MISSING");
  }

  if (level === "L0" || level === "L1" || (level === "L2" && score < 30)) {
    painFlags.push("EVIDENCE_WEAK");
  }

  // --- Dependency flags ---

  if (hasSupplier && !flags.includes("NEEDS_SUPPLIER_IDENTITY")) {
    dependencyFlags.push("SINGLE_SUPPLIER_DEPENDENCY");
  }

  if (!hasPrice) {
    dependencyFlags.push("ORIGIN_VALUE_BLINDNESS");
  }

  if (!hasSupplier) {
    dependencyFlags.push("SUPPLIER_INFORMATION_CONTROL");
  }

  if (level === "L0" || level === "L1") {
    dependencyFlags.push("OPERATOR_INTERPRETATION_DEPENDENCY");
  }

  // --- suggestedNextStep ---

  let suggestedNextStep: PainDetectorResult["suggestedNextStep"];
  if (level === "L0" || level === "L1") {
    suggestedNextStep = "NEEDS_MORE_EVIDENCE";
  } else if (!hasSupplier) {
    suggestedNextStep = "NEEDS_SUPPLIER_IDENTITY";
  } else if (
    flags.includes("NEEDS_LANDED_COST") ||
    flags.includes("NEEDS_ORIGIN_PRICE")
  ) {
    suggestedNextStep = "REQUEST_MORE_EVIDENCE";
  } else if (score >= 40) {
    suggestedNextStep = "CREATE_CASE_DRAFT";
  } else {
    suggestedNextStep = "WAIT";
  }

  // --- suggestedReason ---

  const reasonParts: string[] = [];
  if (painFlags.includes("CURRENT_PRICE_UNKNOWN")) {
    reasonParts.push(
      "Current buyer price is missing — cannot compare alternatives.",
    );
  }
  if (painFlags.includes("ORIGIN_PRICE_UNKNOWN")) {
    reasonParts.push(
      "Origin price is unknown — cannot evaluate origin value or margin gap.",
    );
  }
  if (painFlags.includes("PRICE_GAP_POSSIBLE")) {
    reasonParts.push(
      "Buyer price exists but origin price is unknown — possible hidden margin or price gap.",
    );
  }
  if (painFlags.includes("LANDED_COST_UNKNOWN")) {
    reasonParts.push("Landed cost is missing — total cost cannot be assessed.");
  }
  if (painFlags.includes("SUPPLIER_PROOF_WEAK")) {
    reasonParts.push(
      "Supplier identity or proof is weak — risk of unreliable sourcing.",
    );
  }
  if (painFlags.includes("MARKET_BENCHMARK_MISSING")) {
    reasonParts.push(
      "No market benchmark — cannot determine competitive pricing.",
    );
  }
  if (painFlags.includes("QUALITY_PROOF_MISSING")) {
    reasonParts.push(
      "Quality proof is missing — risk of non-conforming goods.",
    );
  }
  if (painFlags.includes("DELIVERY_TERMS_MISSING")) {
    reasonParts.push(
      "Delivery terms are missing — logistics risk unquantified.",
    );
  }
  if (painFlags.includes("PAYMENT_TERMS_MISSING")) {
    reasonParts.push("Payment terms are missing — financial risk unmanaged.");
  }
  if (painFlags.includes("EVIDENCE_WEAK")) {
    reasonParts.push(
      "Overall evidence is weak — high uncertainty in decision.",
    );
  }
  if (dependencyFlags.includes("SINGLE_SUPPLIER_DEPENDENCY")) {
    reasonParts.push(
      "Single supplier identified — switching may be blocked by dependency.",
    );
  }
  if (dependencyFlags.includes("ORIGIN_VALUE_BLINDNESS")) {
    reasonParts.push("No price data — trade value is invisible.");
  }
  if (dependencyFlags.includes("SUPPLIER_INFORMATION_CONTROL")) {
    reasonParts.push(
      "Supplier controls all information — negotiation power is asymmetric.",
    );
  }

  const suggestedReason =
    reasonParts.length > 0
      ? reasonParts.join(" ")
      : "No clear trade pain identified from available evidence.";

  return {
    painFlags,
    dependencyFlags,
    suggestedReason,
    suggestedNextStep,
  };
}
