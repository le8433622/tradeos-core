export type BaselineData = {
  supplierName?: string | null;
  unitPrice?: string | null;
  originUnitPrice?: string | null;
  landedCost?: string | null;
  marketBenchmarkPrice?: string | null;
  quantity?: string | null;
  currency?: string | null;
  frequency?: string | null;
  paymentTerms?: string | null;
  deliveryTerms?: string | null;
  leadTime?: string | null;
  riskFlags?: unknown;
};

export type AlternativeData = {
  supplierName?: string | null;
  unitPrice?: string | null;
  totalCost?: string | null;
  currency?: string | null;
  moq?: string | null;
  leadTime?: string | null;
  paymentTerm?: string | null;
  platform?: string | null;
  source?: string | null;
  reliabilityScore?: number | null;
  estimatedSavings?: string | null;
  savingsConfidence?: number | null;
  switchingCost?: string | null;
  switchingRisk?: string | null;
  totalCostComparison?: unknown;
  riskFlags?: unknown;
  evidenceId?: string | null;
};

export type DecisionAuthorityLevel =
  | "UNKNOWN"
  | "NO_AUTHORITY"
  | "INFLUENCER"
  | "RECOMMENDER"
  | "APPROVER"
  | "FINAL_DECISION_MAKER";

export type TradePainMetadata = {
  painCategories?: string[];
  painDetail?: string;
  evidenceSummary?: string;
  expectedOutcome?: string;
  dependencyFlags?: string[];
  reportedBy?: string;
  buyerContact?: string;
  decisionMakerKnown: boolean | null;
  decisionMakerNameOrRole?: string;
  payerKnown: boolean | null;
  payerNameOrRole?: string;
  consequenceOwner?: string;
  decisionAuthorityLevel: DecisionAuthorityLevel;
};

export type SwitchDecisionInput = {
  baseline: BaselineData | null;
  alternatives: AlternativeData[];
  evidenceCount: number;
  evidenceQualityScore?: number | null;
  evidenceQualityLevel?: EvidenceQualityLevel | null;
  evidenceQualityReasons?: string[] | null;
  defaultCurrency: string | null;
  decisionAuthorityLevel?: DecisionAuthorityLevel | string | null;
  payerKnown?: boolean | null;
  consequenceOwnerKnown?: boolean | null;
};

export type SwitchDecisionOutput = {
  recommendation: "SWITCH" | "NEGOTIATE" | "WAIT" | "INSUFFICIENT_EVIDENCE";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  savingsScore: number;
  evidenceScore: number;
  paymentRiskScore: number;
  leadTimeRiskScore: number;
  dependencyRiskScore: number;
  overallScore: number;
  monthlySavings: number | null;
  annualSavings: number | null;
  savingsPercent: number | null;
  currency: string | null;
  topAlternativeIndex: number | null;
  evidenceCount: number;
  missingProof: string[];
  riskFlags: string[];
  summary: string;
  nextActions: string[];
};

export type EvidenceQualityLevel = "L0" | "L1" | "L2" | "L3" | "L4" | "L5";

export type EvidenceQualityResult = {
  level: EvidenceQualityLevel;
  score: number;
  reasons: string[];
};

export type EvidenceData = {
  evidenceType?: string | null;
  title?: string | null;
  description?: string | null;
  content?: string | null;
  metadata?: unknown;
};

function parseNum(val: string | null | undefined): number | null {
  if (val == null) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function pushUnique(items: string[], value: string): void {
  if (!items.includes(value)) items.push(value);
}

function normalizeCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function textHasAny(
  value: string | null | undefined,
  terms: string[],
): boolean {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function riskFlagsInclude(flags: unknown, code: string): boolean {
  return parseRiskFlags(flags).some((flag) =>
    normalizeCode(flag).includes(code),
  );
}

function parseKnownFlag(value: string | undefined): boolean | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  if (["YES", "TRUE", "KNOWN"].includes(normalized)) return true;
  if (["NO", "FALSE", "UNKNOWN"].includes(normalized)) return false;
  return null;
}

function readRequirementValue(
  requirement: string | null | undefined,
  label: string,
): string | undefined {
  if (!requirement) return undefined;
  const prefix = `${label}:`;
  const line = requirement
    .split(/\r?\n/)
    .find((entry) => entry.toLowerCase().startsWith(prefix.toLowerCase()));
  return line?.slice(prefix.length).trim() || undefined;
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map(String).filter(Boolean);
}

function readMetadataObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function metadataString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function metadataKnown(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return parseKnownFlag(value);
  return null;
}

export function normalizeDecisionAuthorityLevel(
  value: string | null | undefined,
): DecisionAuthorityLevel {
  const normalized = normalizeCode(value ?? "");
  if (normalized === "FULL_AUTHORITY") return "FINAL_DECISION_MAKER";
  if (normalized === "CAN_NEGOTIATE") return "RECOMMENDER";
  if (normalized === "NEEDS_APPROVAL") return "INFLUENCER";
  if (normalized === "NO_AUTHORITY") return "NO_AUTHORITY";
  if (normalized === "INFLUENCER") return "INFLUENCER";
  if (normalized === "RECOMMENDER") return "RECOMMENDER";
  if (normalized === "APPROVER") return "APPROVER";
  if (normalized === "FINAL_DECISION_MAKER") return "FINAL_DECISION_MAKER";
  return "UNKNOWN";
}

export function isWeakDecisionAuthority(
  level: DecisionAuthorityLevel,
): boolean {
  return ["UNKNOWN", "NO_AUTHORITY", "INFLUENCER", "RECOMMENDER"].includes(
    level,
  );
}

export function parseTradePainMetadata(
  requirement: string | null | undefined,
  metadata?: unknown,
): TradePainMetadata {
  const tradePain = readMetadataObject(metadata);
  const decisionAuthority =
    metadataString(tradePain.decisionAuthorityLevel) ??
    metadataString(tradePain.decisionAuthority) ??
    readRequirementValue(requirement, "Decision Authority Level") ??
    readRequirementValue(requirement, "Decision Authority");

  return {
    painCategories: readStringArray(tradePain.painCategories),
    painDetail:
      metadataString(tradePain.painDetail) ??
      readRequirementValue(requirement, "Pain Detail"),
    evidenceSummary:
      metadataString(tradePain.evidenceSummary) ??
      readRequirementValue(requirement, "Evidence"),
    expectedOutcome:
      metadataString(tradePain.expectedOutcome) ??
      readRequirementValue(requirement, "Expected Outcome"),
    dependencyFlags: readStringArray(tradePain.dependencyFlags),
    reportedBy:
      metadataString(tradePain.reportedBy) ??
      readRequirementValue(requirement, "Reported By"),
    buyerContact:
      metadataString(tradePain.buyerContact) ??
      readRequirementValue(requirement, "Buyer Contact"),
    decisionMakerKnown:
      metadataKnown(tradePain.decisionMakerKnown) ??
      parseKnownFlag(readRequirementValue(requirement, "Decision Maker Known")),
    decisionMakerNameOrRole:
      metadataString(tradePain.decisionMakerNameOrRole) ??
      readRequirementValue(requirement, "Decision Maker"),
    payerKnown:
      metadataKnown(tradePain.payerKnown) ??
      parseKnownFlag(readRequirementValue(requirement, "Payer Known")),
    payerNameOrRole:
      metadataString(tradePain.payerNameOrRole) ??
      readRequirementValue(requirement, "Payer"),
    consequenceOwner:
      metadataString(tradePain.consequenceOwner) ??
      readRequirementValue(requirement, "Consequence Owner"),
    decisionAuthorityLevel: normalizeDecisionAuthorityLevel(decisionAuthority),
  };
}

function hasEvidenceMetadata(metadata: unknown, keys: string[]): boolean {
  const object = readMetadataObject(metadata);
  return keys.some((key) => Boolean(object[key]));
}

function evidenceText(evidence: EvidenceData): string {
  return [evidence.title, evidence.description, evidence.content]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function deriveEvidenceQuality(
  evidenceItems: EvidenceData[],
): EvidenceQualityResult {
  if (evidenceItems.length === 0) {
    return { level: "L0", score: 0, reasons: ["no evidence attached"] };
  }

  let level: EvidenceQualityLevel = "L1";
  const reasons: string[] = [];
  const rank: Record<EvidenceQualityLevel, number> = {
    L0: 0,
    L1: 1,
    L2: 2,
    L3: 3,
    L4: 4,
    L5: 5,
  };

  const setLevel = (next: EvidenceQualityLevel, reason: string) => {
    if (rank[next] > rank[level]) level = next;
    pushUnique(reasons, reason);
  };

  for (const evidence of evidenceItems) {
    const type = normalizeCode(evidence.evidenceType ?? "");
    const text = evidenceText(evidence);

    if (
      type === "OUTCOME_EVIDENCE" ||
      hasEvidenceMetadata(evidence.metadata, [
        "repeatedOutcomeProof",
        "outcomeProof",
      ])
    ) {
      setLevel("L5", "repeated outcome proof or outcome evidence");
    } else if (type === "PAYMENT_PROOF" || type === "DELIVERY_CONFIRMATION") {
      setLevel("L4", "paid order or delivery proof");
    } else if (
      [
        "ALTERNATIVE_QUOTE",
        "CURRENT_SUPPLIER_INVOICE",
        "CURRENT_SUPPLIER_PRICE_LIST",
        "QUOTE_FILE",
        "INVOICE",
      ].includes(type) &&
      (hasEvidenceMetadata(evidence.metadata, [
        "supplierIdentity",
        "issuedAt",
        "validUntil",
        "paymentTerms",
        "shippingTerms",
      ]) ||
        textHasAny(text, [
          "payment",
          "shipping",
          "valid",
          "incoterm",
          "lead time",
          "delivery",
        ]))
    ) {
      setLevel("L3", "quote or invoice includes identity/date/terms proof");
    } else if (
      [
        "ALTERNATIVE_QUOTE",
        "CURRENT_SUPPLIER_INVOICE",
        "CURRENT_SUPPLIER_PRICE_LIST",
        "QUOTE_FILE",
        "INVOICE",
        "MARKET_BENCHMARK",
      ].includes(type)
    ) {
      setLevel("L2", "basic quote, invoice, price list, or benchmark proof");
    } else if (
      ["QUOTE_SCREENSHOT", "SUPPLIER_MESSAGE", "CALL_NOTE"].includes(type)
    ) {
      setLevel("L1", "screenshot, message, or call note only");
    }
  }

  const scores: Record<EvidenceQualityLevel, number> = {
    L0: 0,
    L1: 20,
    L2: 45,
    L3: 70,
    L4: 85,
    L5: 100,
  };

  return {
    level,
    score: scores[level],
    reasons: reasons.length > 0 ? reasons : ["weak evidence only"],
  };
}

function parseRiskFlags(flags: unknown): string[] {
  if (!flags) return [];
  if (Array.isArray(flags)) return flags.map(String);
  if (typeof flags === "string")
    return flags
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  return [];
}

function detectPaymentRisk(paymentTerm: string | null | undefined): number {
  if (!paymentTerm) return 50;
  const t = paymentTerm.toLowerCase();
  if (
    t.includes("advance") ||
    t.includes("full") ||
    t.includes("100%") ||
    t.includes("prepayment") ||
    t.includes("tt before")
  )
    return 80;
  if (
    t.includes("lc") ||
    t.includes("letter of credit") ||
    t.includes("standby")
  )
    return 50;
  if (
    t.includes("net30") ||
    t.includes("net 30") ||
    t.includes("net60") ||
    t.includes("net 60")
  )
    return 20;
  if (t.includes("net") || t.includes("days")) return 30;
  if (
    t.includes("tt") ||
    t.includes("telegraphic") ||
    t.includes("wire") ||
    t.includes("cod") ||
    t.includes("cash")
  )
    return 20;
  return 40;
}

function parseLeadTimeDays(leadTime: string | null | undefined): number | null {
  if (!leadTime) return null;
  const match = leadTime.match(/(\d+)/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

export function computeSwitchDecision(
  input: SwitchDecisionInput,
): SwitchDecisionOutput {
  const { baseline, alternatives, evidenceCount, defaultCurrency } = input;
  const missingProof: string[] = [];
  const riskFlags: string[] = [];
  const addMissing = (value: string) => pushUnique(missingProof, value);
  const addRisk = (value: string) => pushUnique(riskFlags, value);
  const decisionAuthorityLevel = normalizeDecisionAuthorityLevel(
    input.decisionAuthorityLevel,
  );

  if (!baseline) {
    addMissing("Purchase baseline — no current supplier data recorded");
  }

  if (alternatives.length === 0) {
    addMissing(
      "Supplier alternatives — no alternatives recorded for comparison",
    );
  }

  // --- Savings calculation ---
  const baselineUnitPrice = baseline ? parseNum(baseline.unitPrice) : null;
  const baselineOriginUnitPrice = baseline
    ? parseNum(baseline.originUnitPrice)
    : null;
  const baselineLandedCost = baseline ? parseNum(baseline.landedCost) : null;
  const baselineMarketBenchmarkPrice = baseline
    ? parseNum(baseline.marketBenchmarkPrice)
    : null;
  const baselineQty = baseline ? parseNum(baseline.quantity) : null;
  let baselineMonthlyCost: number | null = null;
  if (baselineUnitPrice != null && baselineQty != null) {
    baselineMonthlyCost = baselineUnitPrice * baselineQty;
  } else if (baselineUnitPrice != null) {
    baselineMonthlyCost = baselineUnitPrice;
  }

  const currency = baseline?.currency ?? defaultCurrency ?? "USD";

  if (baseline && baselineUnitPrice == null) {
    addMissing("current price unknown");
    addMissing("NEEDS_CURRENT_PRICE");
  }

  if (baseline && baselineOriginUnitPrice == null) {
    addMissing("origin price unknown");
    addMissing("NEEDS_ORIGIN_PRICE");
    addRisk("ORIGIN_PRICE_UNKNOWN");
  }

  if (baseline && baselineLandedCost == null) {
    addMissing("landed cost unknown");
    addMissing("NEEDS_LANDED_COST");
    addRisk("LANDED_COST_UNKNOWN");
  }

  if (baseline && baselineMarketBenchmarkPrice == null) {
    addMissing("market benchmark unknown");
    addMissing("NEEDS_MARKET_BENCHMARK");
  }

  const evidenceQualityScore =
    input.evidenceQualityScore ??
    (input.evidenceQualityLevel
      ? { L0: 0, L1: 20, L2: 45, L3: 70, L4: 85, L5: 100 }[
          input.evidenceQualityLevel
        ]
      : null);
  const evidenceQualityLevel = input.evidenceQualityLevel ?? null;

  if (isWeakDecisionAuthority(decisionAuthorityLevel)) {
    addMissing("decision authority not confirmed");
    addRisk("NO_DECISION_AUTHORITY");
  }

  if (input.payerKnown !== true) {
    addRisk("PAYER_UNKNOWN");
  }

  if (input.consequenceOwnerKnown !== true) {
    addRisk("CONSEQUENCE_OWNER_UNKNOWN");
  }

  // Find best alternative by savings
  let bestAltIndex: number | null = null;
  let bestAltMonthly: number | null = null;
  let bestAltCost: number | null = null;
  let bestAltSavings: number | null = null;

  for (let i = 0; i < alternatives.length; i++) {
    const alt = alternatives[i];
    const altTotalCost = parseNum(alt.totalCost);
    const altUnitPrice = parseNum(alt.unitPrice);
    const altQty = baselineQty;
    let altMonthlyCost: number | null = null;
    if (altTotalCost != null) {
      altMonthlyCost = altTotalCost;
    } else if (altUnitPrice != null && altQty != null) {
      altMonthlyCost = altUnitPrice * altQty;
    } else if (altUnitPrice != null) {
      altMonthlyCost = altUnitPrice;
    }
    if (altMonthlyCost == null) continue;
    const savings =
      baselineMonthlyCost != null ? baselineMonthlyCost - altMonthlyCost : null;
    if (
      savings != null &&
      (bestAltSavings == null || savings > bestAltSavings)
    ) {
      bestAltSavings = savings;
      bestAltCost = altMonthlyCost;
      bestAltMonthly = altMonthlyCost;
      bestAltIndex = i;
    }
  }

  let monthlySavings: number | null = null;
  let annualSavings: number | null = null;
  let savingsPercent: number | null = null;

  if (
    baselineMonthlyCost != null &&
    bestAltCost != null &&
    baselineMonthlyCost > 0
  ) {
    monthlySavings = baselineMonthlyCost - bestAltCost;
    annualSavings = monthlySavings * 12;
    savingsPercent = (monthlySavings / baselineMonthlyCost) * 100;
  } else if (
    baselineMonthlyCost != null &&
    bestAltCost == null &&
    alternatives.length > 0
  ) {
    addMissing(
      "Alternative pricing — alternative has no unit price or total cost",
    );
  } else if (baselineMonthlyCost == null) {
    if (baseline) {
      addMissing("Baseline pricing — baseline needs unit price and quantity");
    }
  }

  // --- Savings score (0-100) ---
  let savingsScore = 0;
  if (savingsPercent != null) {
    if (savingsPercent >= 30) savingsScore = 100;
    else if (savingsPercent >= 20) savingsScore = 80;
    else if (savingsPercent >= 10) savingsScore = 50;
    else if (savingsPercent > 0) savingsScore = 25;
  } else if (alternatives.length > 0 && baselineMonthlyCost != null) {
    savingsScore = 10;
  }

  // --- Evidence score (0-100) ---
  let evidenceScore = 0;
  if (evidenceQualityScore != null) {
    evidenceScore = evidenceQualityScore;
  } else if (evidenceCount >= 6) evidenceScore = 100;
  else if (evidenceCount >= 3) evidenceScore = 60;
  else if (evidenceCount >= 1) evidenceScore = 30;

  if (evidenceScore < 60) {
    addRisk("SUPPLIER_PROOF_WEAK");
  }

  if (evidenceCount === 0) {
    addMissing("Evidence records — no evidence attached to this sourcing run");
    addMissing("NEEDS_CURRENT_QUOTE");
    addMissing("NEEDS_SUPPLIER_PROOF");
  }

  // --- Missing price/landed-cost flags ---
  if (baseline && baselineUnitPrice == null) addMissing("NEEDS_CURRENT_PRICE");
  if (
    alternatives.length > 0 &&
    alternatives.every((a) => !a.unitPrice && !a.totalCost)
  ) {
    addMissing("NEEDS_CURRENT_QUOTE");
  }
  if (missingProof.some((m) => m.includes("pricing") || m.includes("price"))) {
    if (
      !missingProof.includes("NEEDS_CURRENT_PRICE") &&
      baselineUnitPrice == null
    ) {
      addMissing("NEEDS_CURRENT_PRICE");
    }
  }

  // --- Payment risk score (0-100) ---
  let paymentRiskScore = 0;
  let paymentRisks: number[] = [];

  if (baseline?.paymentTerms) {
    paymentRisks.push(detectPaymentRisk(baseline.paymentTerms));
  } else if (baseline) {
    addMissing("Baseline payment terms — not recorded");
  }

  for (const alt of alternatives) {
    if (alt.paymentTerm) {
      paymentRisks.push(detectPaymentRisk(alt.paymentTerm));
    }
  }
  if (paymentRisks.length > 0) {
    paymentRiskScore = Math.max(...paymentRisks);
  } else {
    paymentRiskScore = 50;
    addMissing("Payment terms — not recorded on baseline or alternatives");
  }
  if (paymentRiskScore >= 70) {
    addRisk(`High payment risk (score: ${paymentRiskScore})`);
  }

  // --- Lead time risk (0-100) ---
  let leadTimeRiskScore = 0;
  const baselineLeadDays = baseline
    ? parseLeadTimeDays(baseline.leadTime)
    : null;
  if (baseline && baseline.leadTime == null) {
    addMissing("Baseline lead time — not recorded");
  }

  if (baselineLeadDays != null && alternatives.length > 0) {
    let maxLeadRatio = 0;
    for (const alt of alternatives) {
      const altLeadDays = parseLeadTimeDays(alt.leadTime);
      if (altLeadDays != null && baselineLeadDays > 0) {
        const ratio = altLeadDays / baselineLeadDays;
        maxLeadRatio = Math.max(maxLeadRatio, ratio);
      }
    }
    if (maxLeadRatio >= 2) {
      leadTimeRiskScore = 80;
      addRisk("Alternative lead times are 2x+ longer than current supplier");
    } else if (maxLeadRatio >= 1.5) {
      leadTimeRiskScore = 50;
    } else if (maxLeadRatio > 0) {
      leadTimeRiskScore = 10;
    }
  } else if (
    baselineLeadDays == null &&
    alternatives.some((a) => a.leadTime != null)
  ) {
    leadTimeRiskScore = 40;
  } else if (alternatives.every((a) => a.leadTime == null)) {
    leadTimeRiskScore = 30;
    if (alternatives.length > 0) {
      addMissing("Alternative lead times — not recorded on any alternative");
    }
  }

  // --- Dependency risk (0-100) ---
  let dependencyRiskScore = 0;
  if (alternatives.length < 2) {
    dependencyRiskScore = 70;
    addRisk("SINGLE_SUPPLIER_DEPENDENCY");
  } else if (alternatives.length <= 3) {
    dependencyRiskScore = 40;
  } else {
    dependencyRiskScore = 20;
  }

  // Collect risk flags from alternatives
  for (const alt of alternatives) {
    for (const flag of parseRiskFlags(alt.riskFlags)) {
      addRisk(flag);
    }
  }
  for (const flag of parseRiskFlags(baseline?.riskFlags)) {
    addRisk(flag);
  }

  if (
    alternatives.some(
      (alt) =>
        Boolean(alt.platform) ||
        textHasAny(alt.source, ["platform", "marketplace"]) ||
        riskFlagsInclude(alt.riskFlags, "PLATFORM_DEPENDENCY"),
    )
  ) {
    addRisk("PLATFORM_DEPENDENCY");
  }

  if (
    alternatives.some(
      (alt) =>
        textHasAny(alt.supplierName, ["broker", "distributor"]) ||
        textHasAny(alt.source, ["broker", "distributor"]) ||
        riskFlagsInclude(alt.riskFlags, "BROKER_DEPENDENCY"),
    ) ||
    textHasAny(baseline?.supplierName, ["broker", "distributor"])
  ) {
    addRisk("BROKER_DEPENDENCY");
  }

  // --- Overall score (0-100, weighted) ---
  const overallScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        savingsScore * 0.4 +
          evidenceScore * 0.25 +
          (100 - paymentRiskScore) * 0.1 +
          (100 - leadTimeRiskScore) * 0.1 +
          (100 - dependencyRiskScore) * 0.15,
      ),
    ),
  );

  // --- Recommendation ---
  let recommendation: "SWITCH" | "NEGOTIATE" | "WAIT" | "INSUFFICIENT_EVIDENCE";

  const hasPricingData =
    baselineUnitPrice != null || alternatives.some((a) => a.unitPrice != null);
  const isCriticallyWeak = evidenceCount === 0 && !hasPricingData;

  if (isCriticallyWeak) {
    recommendation = "INSUFFICIENT_EVIDENCE";
  } else {
    const hasSwitchConditions =
      savingsPercent != null &&
      savingsPercent >= 20 &&
      evidenceScore >= 60 &&
      paymentRiskScore < 70 &&
      dependencyRiskScore < 60;
    const blocksStrongSwitch =
      riskFlags.includes("SUPPLIER_PROOF_WEAK") ||
      riskFlags.includes("NO_DECISION_AUTHORITY") ||
      riskFlags.includes("LANDED_COST_UNKNOWN") ||
      missingProof.some((proof) => proof.toLowerCase().includes("lead time"));

    if (
      hasSwitchConditions &&
      evidenceCount >= 3 &&
      baselineUnitPrice != null &&
      !blocksStrongSwitch
    ) {
      recommendation = "SWITCH";
    } else if (
      savingsPercent != null &&
      savingsPercent > 0 &&
      dependencyRiskScore < 80
    ) {
      recommendation = "NEGOTIATE";
    } else {
      recommendation = "WAIT";
    }
  }

  // --- Confidence ---
  let confidence: "HIGH" | "MEDIUM" | "LOW";
  if (
    missingProof.length === 0 &&
    evidenceCount >= 3 &&
    baseline != null &&
    alternatives.length >= 2
  ) {
    confidence = "HIGH";
  } else if (missingProof.length <= 2 && evidenceCount >= 1) {
    confidence = "MEDIUM";
  } else {
    confidence = "LOW";
  }

  // --- Summary ---
  const summary = buildSummary(
    recommendation,
    monthlySavings,
    annualSavings,
    savingsPercent,
    currency,
    overallScore,
    missingProof.length,
    riskFlags.length,
  );
  const powerSummary = buildPowerSummary(
    riskFlags,
    decisionAuthorityLevel,
    input.payerKnown,
    input.consequenceOwnerKnown,
  );

  // --- Next actions ---
  const nextActions: string[] = [];
  if (riskFlags.includes("ORIGIN_PRICE_UNKNOWN")) {
    nextActions.push(
      "Request origin price evidence before treating savings as proven",
    );
  }
  if (riskFlags.includes("LANDED_COST_UNKNOWN")) {
    nextActions.push(
      "Request landed cost proof before recommending a supplier switch",
    );
  }
  if (riskFlags.includes("NO_DECISION_AUTHORITY")) {
    nextActions.push(
      "Confirm final decision-maker, payer, and consequence owner",
    );
  }
  if (riskFlags.includes("SUPPLIER_PROOF_WEAK")) {
    nextActions.push("Collect stronger supplier proof before buyer approval");
  }
  if (recommendation === "SWITCH") {
    nextActions.push("Prepare buyer approval request for supplier switch");
    if (paymentRiskScore >= 50)
      nextActions.push(
        "Review payment terms with recommended alternative before finalizing",
      );
    if (riskFlags.length > 0)
      nextActions.push("Review flagged risks with buyer before proceeding");
  } else if (recommendation === "NEGOTIATE") {
    if (savingsPercent != null && savingsPercent < 20)
      nextActions.push(
        "Request better pricing from current supplier to close the gap",
      );
    if (evidenceScore < 60)
      nextActions.push("Collect more quote evidence and supplier profiles");
    if (missingProof.length > 0)
      nextActions.push(
        `Address missing information: ${missingProof.join("; ")}`,
      );
  } else if (recommendation === "INSUFFICIENT_EVIDENCE") {
    if (evidenceCount === 0)
      nextActions.push(
        "Collect at least one piece of evidence (quote, invoice, or supplier profile) before evaluating",
      );
    if (!baseline || baselineUnitPrice == null)
      nextActions.push(
        "Record current purchase baseline with unit price to enable comparison",
      );
    if (alternatives.length === 0)
      nextActions.push(
        "Identify and record at least 2 alternative supplier options with pricing",
      );
    if (missingProof.length > 0)
      nextActions.push(
        `Resolve missing proof before re-evaluating: ${missingProof.filter((m) => !m.startsWith("NEEDS_")).join("; ")}`,
      );
  } else {
    if (missingProof.length > 0)
      nextActions.push(
        `Complete missing data before re-evaluating: ${missingProof.join("; ")}`,
      );
    if (alternatives.length === 0)
      nextActions.push(
        "Identify and record at least 2 alternative supplier options",
      );
    if (baseline == null)
      nextActions.push("Record current purchase baseline to enable comparison");
  }
  nextActions.push(
    "Review full switch decision report and proceed to buyer approval when ready",
  );

  return {
    recommendation,
    confidence,
    savingsScore,
    evidenceScore,
    paymentRiskScore,
    leadTimeRiskScore,
    dependencyRiskScore,
    overallScore,
    monthlySavings,
    annualSavings,
    savingsPercent:
      savingsPercent != null ? Math.round(savingsPercent * 100) / 100 : null,
    currency,
    topAlternativeIndex: bestAltIndex,
    evidenceCount,
    missingProof,
    riskFlags,
    summary: `${summary} | ${powerSummary}`,
    nextActions,
  };
}

function buildSummary(
  recommendation: string,
  monthlySavings: number | null,
  annualSavings: number | null,
  savingsPercent: number | null,
  currency: string | null,
  overallScore: number,
  missingCount: number,
  riskCount: number,
): string {
  const parts: string[] = [];
  parts.push(`Recommendation: ${recommendation}`);
  if (monthlySavings != null) {
    parts.push(`Monthly savings: ${formatMoney(monthlySavings, currency)}`);
  }
  if (annualSavings != null) {
    parts.push(`Annual savings: ${formatMoney(annualSavings, currency)}`);
  }
  if (savingsPercent != null) {
    parts.push(`Savings: ${savingsPercent.toFixed(1)}%`);
  }
  parts.push(`Overall score: ${overallScore}/100`);
  if (missingCount > 0) parts.push(`Missing data points: ${missingCount}`);
  if (riskCount > 0) parts.push(`Risk flags: ${riskCount}`);
  return parts.join(" | ");
}

function buildPowerSummary(
  riskFlags: string[],
  decisionAuthorityLevel: DecisionAuthorityLevel,
  payerKnown: boolean | null | undefined,
  consequenceOwnerKnown: boolean | null | undefined,
): string {
  const informationControl =
    riskFlags.includes("ORIGIN_PRICE_UNKNOWN") ||
    riskFlags.includes("BROKER_DEPENDENCY")
      ? "current supplier or broker controls key information"
      : "price evidence is visible";
  const relationshipControl = riskFlags.includes("SINGLE_SUPPLIER_DEPENDENCY")
    ? "current supplier relationship remains concentrated"
    : riskFlags.includes("PLATFORM_DEPENDENCY")
      ? "platform controls supplier access"
      : "multiple supplier paths are visible";
  const decisionControl = isWeakDecisionAuthority(decisionAuthorityLevel)
    ? `decision authority risk (${decisionAuthorityLevel})`
    : `decision authority confirmed (${decisionAuthorityLevel})`;
  const riskBearer =
    payerKnown === true && consequenceOwnerKnown === true
      ? "payer and consequence owner known"
      : "payer or consequence owner unknown";
  const remainingDependency = riskFlags.includes("LANDED_COST_UNKNOWN")
    ? "landed-cost dependency remains after recommendation"
    : riskFlags.includes("SUPPLIER_PROOF_WEAK")
      ? "supplier proof dependency remains after recommendation"
      : "main dependency is visible in the recommendation";

  return [
    `Who controls information: ${informationControl}`,
    `Who controls supplier relationship: ${relationshipControl}`,
    `Who can decide: ${decisionControl}`,
    `Who carries risk: ${riskBearer}`,
    `Dependency remaining: ${remainingDependency}`,
  ].join(" | ");
}

function formatMoney(amount: number, currency: string | null): string {
  const sym =
    currency === "VND" ? "₫" : currency === "USD" ? "$" : (currency ?? "$");
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${sym}${formatted}`;
}
