export type BaselineData = {
  unitPrice?: string | null;
  quantity?: string | null;
  currency?: string | null;
  frequency?: string | null;
  paymentTerms?: string | null;
  leadTime?: string | null;
  riskFlags?: unknown;
};

export type AlternativeData = {
  unitPrice?: string | null;
  totalCost?: string | null;
  currency?: string | null;
  moq?: string | null;
  leadTime?: string | null;
  paymentTerm?: string | null;
  estimatedSavings?: string | null;
  savingsConfidence?: number | null;
  switchingCost?: string | null;
  switchingRisk?: string | null;
  riskFlags?: unknown;
  evidenceId?: string | null;
};

export type SwitchDecisionInput = {
  baseline: BaselineData | null;
  alternatives: AlternativeData[];
  evidenceCount: number;
  defaultCurrency: string | null;
};

export type SwitchDecisionOutput = {
  recommendation: "SWITCH" | "NEGOTIATE" | "WAIT";
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

function parseNum(val: string | null | undefined): number | null {
  if (val == null) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
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

  if (!baseline) {
    missingProof.push("Purchase baseline — no current supplier data recorded");
  }

  if (alternatives.length === 0) {
    missingProof.push(
      "Supplier alternatives — no alternatives recorded for comparison",
    );
  }

  // --- Savings calculation ---
  const baselineUnitPrice = baseline ? parseNum(baseline.unitPrice) : null;
  const baselineQty = baseline ? parseNum(baseline.quantity) : null;
  let baselineMonthlyCost: number | null = null;
  if (baselineUnitPrice != null && baselineQty != null) {
    baselineMonthlyCost = baselineUnitPrice * baselineQty;
  } else if (baselineUnitPrice != null) {
    baselineMonthlyCost = baselineUnitPrice;
  }

  const currency = baseline?.currency ?? defaultCurrency ?? "USD";

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
    missingProof.push(
      "Alternative pricing — alternative has no unit price or total cost",
    );
  } else if (baselineMonthlyCost == null) {
    if (baseline) {
      missingProof.push(
        "Baseline pricing — baseline needs unit price and quantity",
      );
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
  if (evidenceCount >= 6) evidenceScore = 100;
  else if (evidenceCount >= 3) evidenceScore = 60;
  else if (evidenceCount >= 1) evidenceScore = 30;

  if (evidenceCount === 0) {
    missingProof.push(
      "Evidence records — no evidence attached to this sourcing run",
    );
  }

  // --- Payment risk score (0-100) ---
  let paymentRiskScore = 0;
  let paymentRisks: number[] = [];

  if (baseline?.paymentTerms) {
    paymentRisks.push(detectPaymentRisk(baseline.paymentTerms));
  } else if (baseline) {
    missingProof.push("Baseline payment terms — not recorded");
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
    missingProof.push(
      "Payment terms — not recorded on baseline or alternatives",
    );
  }
  if (paymentRiskScore >= 70) {
    riskFlags.push(`High payment risk (score: ${paymentRiskScore})`);
  }

  // --- Lead time risk (0-100) ---
  let leadTimeRiskScore = 0;
  const baselineLeadDays = baseline
    ? parseLeadTimeDays(baseline.leadTime)
    : null;
  if (baseline && baseline.leadTime == null) {
    missingProof.push("Baseline lead time — not recorded");
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
      riskFlags.push(
        "Alternative lead times are 2x+ longer than current supplier",
      );
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
      missingProof.push(
        "Alternative lead times — not recorded on any alternative",
      );
    }
  }

  // --- Dependency risk (0-100) ---
  let dependencyRiskScore = 0;
  if (alternatives.length < 2) {
    dependencyRiskScore = 70;
    if (alternatives.length === 1) {
      riskFlags.push("Only one alternative supplier — high dependency risk");
    } else {
      riskFlags.push("No alternative suppliers — maximum dependency risk");
    }
  } else if (alternatives.length <= 3) {
    dependencyRiskScore = 40;
  } else {
    dependencyRiskScore = 20;
  }

  // Collect risk flags from alternatives
  for (const alt of alternatives) {
    for (const flag of parseRiskFlags(alt.riskFlags)) {
      if (!riskFlags.includes(flag)) riskFlags.push(flag);
    }
  }
  for (const flag of parseRiskFlags(baseline?.riskFlags)) {
    if (!riskFlags.includes(flag)) riskFlags.push(flag);
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
  let recommendation: "SWITCH" | "NEGOTIATE" | "WAIT";
  const hasSwitchConditions =
    savingsPercent != null &&
    savingsPercent >= 20 &&
    evidenceScore >= 60 &&
    paymentRiskScore < 70 &&
    dependencyRiskScore < 60;

  if (hasSwitchConditions) {
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

  // --- Next actions ---
  const nextActions: string[] = [];
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
    summary,
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

function formatMoney(amount: number, currency: string | null): string {
  const sym =
    currency === "VND" ? "₫" : currency === "USD" ? "$" : (currency ?? "$");
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${sym}${formatted}`;
}
