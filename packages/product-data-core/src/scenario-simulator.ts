import {
  DEFAULT_DELIVERY_RISK_SCORE,
  DEFAULT_SPEC_FIT_SCORE,
  EVIDENCE_QUALITY_SCORE,
  SCORE,
  SCORE_THRESHOLDS,
  SCORING_WEIGHTS,
} from "./constants";
import { productCandidateToEvidence } from "./evidence";
import type {
  BuyerScenarioType,
  ProductCandidate,
  ProductMissingProofFlag,
  ProductRecommendation,
  ProductRecommendationType,
  ProductScenarioScore,
  ProductScenarioSimulation,
  ProductSearchIntent,
  SupplierCandidate,
} from "./types";

function clampScore(score: number) {
  return Math.max(SCORE.NONE, Math.min(SCORE.PERFECT, Math.round(score)));
}

function normalize(value: string) {
  return value.toLowerCase();
}

function candidateText(candidate: ProductCandidate) {
  return normalize(
    `${candidate.title} ${candidate.condition ?? ""} ${candidate.sellerName ?? ""} ${JSON.stringify(candidate.raw)}`,
  );
}

function findSupplier(
  candidate: ProductCandidate,
  suppliers: SupplierCandidate[],
) {
  return suppliers.find(
    (supplier) =>
      supplier.sellerId === candidate.sellerId ||
      supplier.sellerName === candidate.sellerName,
  );
}

function detectScenarioTypes(intent: ProductSearchIntent): BuyerScenarioType[] {
  const types = new Set<BuyerScenarioType>();
  if (intent.budgetMax !== undefined) types.add("LOW_BUDGET");
  if (intent.riskTolerance === "HIGH") types.add("PRICE_CHASER");
  if (intent.riskTolerance === "LOW") types.add("RISK_AVERSE");
  if (intent.urgency === "HIGH") types.add("URGENT_BUYER");
  if (
    intent.requiredSpecs.some((spec) => /quality|durable|warranty/i.test(spec))
  ) {
    types.add("QUALITY_FIRST");
  }
  if ((intent.quantity ?? 0) >= 10) types.add("FACTORY_PROCUREMENT");
  if (/resell|reseller|bán lại/i.test(intent.buyerUseCase ?? "")) {
    types.add("RESELLER");
  }
  if (/brand|status|premium|thương hiệu/i.test(intent.buyerUseCase ?? "")) {
    types.add("STATUS_BRAND_SENSITIVE");
  }
  if (/ask boss|không quyết|xin ý kiến/i.test(intent.buyerUseCase ?? "")) {
    types.add("NO_AUTHORITY");
  }
  if (/tham khảo|free advice|hỏi chơi/i.test(intent.buyerUseCase ?? "")) {
    types.add("FREE_ADVICE");
  }
  if (types.size === 0) types.add("FACTORY_PROCUREMENT");
  return [...types];
}

function scorePriceFit(
  intent: ProductSearchIntent,
  candidate: ProductCandidate,
) {
  if (candidate.price === undefined) return SCORE.UNKNOWN;
  if (intent.budgetMax === undefined) return SCORE.GOOD;
  if (candidate.price <= intent.budgetMax) return SCORE.PERFECT;
  if (
    candidate.price <=
    intent.budgetMax * SCORE_THRESHOLDS.OVER_BUDGET_RATIO
  ) {
    return SCORE.GOOD;
  }
  if (
    candidate.price <=
    intent.budgetMax * SCORE_THRESHOLDS.FAR_OVER_BUDGET_RATIO
  ) {
    return SCORE.WEAK;
  }
  return SCORE.POOR;
}

function scoreSpecFit(
  intent: ProductSearchIntent,
  candidate: ProductCandidate,
) {
  const text = candidateText(candidate);
  const avoidHit = intent.avoidSpecs.some((spec) =>
    text.includes(normalize(spec)),
  );
  if (avoidHit) return SCORE.POOR;
  if (intent.requiredSpecs.length === 0) return DEFAULT_SPEC_FIT_SCORE;
  const matched = intent.requiredSpecs.filter((spec) =>
    text.includes(normalize(spec)),
  ).length;
  return clampScore((matched / intent.requiredSpecs.length) * SCORE.PERFECT);
}

function scoreSupplierTrust(
  candidate: ProductCandidate,
  supplier?: SupplierCandidate,
) {
  let score = SCORE.NONE;
  if (candidate.sellerName || supplier?.sellerName) score += SCORE.POOR;
  if (candidate.sellerId || supplier?.sellerId) score += SCORE.POOR;
  if (candidate.rating !== undefined)
    score += Math.min(candidate.rating * 8, 40);
  if ((candidate.reviewCount ?? 0) >= 20) score += 10;
  if (
    /verified|gold|official|trusted/i.test(supplier?.verificationLevel ?? "")
  ) {
    score += 20;
  }
  return clampScore(score);
}

function scoreLocationLogistics(
  intent: ProductSearchIntent,
  candidate: ProductCandidate,
) {
  let score = SCORE.UNKNOWN;
  if (candidate.itemLocation) score += 20;
  if (candidate.shippingCost !== undefined) score += 15;
  if (candidate.deliveryEstimate) score += 15;
  if (
    intent.sourceCountry &&
    candidate.sellerCountry &&
    normalize(candidate.sellerCountry).includes(normalize(intent.sourceCountry))
  ) {
    score += 10;
  }
  return clampScore(score);
}

function scoreDeliveryRisk(
  intent: ProductSearchIntent,
  candidate: ProductCandidate,
) {
  if (intent.urgency !== "HIGH") return DEFAULT_DELIVERY_RISK_SCORE;
  if (!candidate.deliveryEstimate) return SCORE.POOR;
  if (/day|ngày|week|tuần/i.test(candidate.deliveryEstimate)) return SCORE.GOOD;
  return SCORE.MEDIUM;
}

function scoreMissingProof(missingProof: ProductMissingProofFlag[]) {
  return clampScore(
    SCORE.PERFECT -
      missingProof.length * SCORE_THRESHOLDS.MANY_MISSING_PROOFS * 5,
  );
}

function scoreBuyerRiskToleranceFit(
  intent: ProductSearchIntent,
  supplierTrust: number,
  evidenceQuality: number,
) {
  if (intent.riskTolerance === "LOW") {
    return clampScore((supplierTrust + evidenceQuality) / 2);
  }
  if (intent.riskTolerance === "HIGH") return SCORE.GOOD;
  return SCORE.MEDIUM;
}

function weightedTotal(score: Omit<ProductScenarioScore, "total">) {
  return clampScore(
    score.priceFit * SCORING_WEIGHTS.priceFit +
      score.specFit * SCORING_WEIGHTS.specFit +
      score.supplierTrust * SCORING_WEIGHTS.supplierTrust +
      score.locationLogisticsFit * SCORING_WEIGHTS.locationLogisticsFit +
      score.deliveryRisk * SCORING_WEIGHTS.deliveryRisk +
      score.evidenceQuality * SCORING_WEIGHTS.evidenceQuality +
      score.missingProof * SCORING_WEIGHTS.missingProof +
      score.buyerRiskToleranceFit * SCORING_WEIGHTS.buyerRiskToleranceFit,
  );
}

function buildScore(
  intent: ProductSearchIntent,
  candidate: ProductCandidate,
  supplier?: SupplierCandidate,
): ProductScenarioScore {
  const evidence = productCandidateToEvidence(candidate, supplier);
  const supplierTrust = scoreSupplierTrust(candidate, supplier);
  const evidenceQuality = EVIDENCE_QUALITY_SCORE[evidence.evidenceQuality];
  const baseScore = {
    priceFit: scorePriceFit(intent, candidate),
    specFit: scoreSpecFit(intent, candidate),
    supplierTrust,
    locationLogisticsFit: scoreLocationLogistics(intent, candidate),
    deliveryRisk: scoreDeliveryRisk(intent, candidate),
    evidenceQuality,
    missingProof: scoreMissingProof(evidence.missingProofFlags),
    buyerRiskToleranceFit: scoreBuyerRiskToleranceFit(
      intent,
      supplierTrust,
      evidenceQuality,
    ),
  };
  return { ...baseScore, total: weightedTotal(baseScore) };
}

function chooseRecommendation(
  intent: ProductSearchIntent,
  candidate: ProductCandidate,
  score: ProductScenarioScore,
  missingProof: ProductMissingProofFlag[],
): ProductRecommendationType {
  if (missingProof.includes("NEEDS_SUPPLIER_IDENTITY"))
    return "REQUEST_MORE_PROOF";
  if (
    intent.urgency === "HIGH" &&
    (missingProof.includes("NEEDS_DELIVERY_ESTIMATE") ||
      missingProof.includes("NEEDS_SHIPPING_COST"))
  ) {
    return "REQUEST_MORE_PROOF";
  }
  if (intent.requiredSpecs.some((spec) => /warranty/i.test(spec))) {
    const rawText = JSON.stringify(candidate.raw).toLowerCase();
    if (!rawText.includes("warranty")) return "REQUEST_MORE_PROOF";
  }
  if (
    intent.budgetMax !== undefined &&
    candidate.price !== undefined &&
    candidate.price > intent.budgetMax * SCORE_THRESHOLDS.FAR_OVER_BUDGET_RATIO
  ) {
    return "AVOID";
  }
  if (
    intent.budgetMax !== undefined &&
    candidate.price !== undefined &&
    candidate.price > intent.budgetMax
  ) {
    return "NEGOTIATE";
  }
  if (
    intent.budgetMax !== undefined &&
    candidate.price !== undefined &&
    candidate.price < intent.budgetMax * SCORE_THRESHOLDS.CHEAP_PRICE_RATIO &&
    (score.supplierTrust < SCORE_THRESHOLDS.LOW_TRUST ||
      score.evidenceQuality < SCORE_THRESHOLDS.WEAK_EVIDENCE)
  ) {
    return "CHEAP_BUT_RISKY";
  }
  if (
    intent.riskTolerance === "LOW" &&
    (score.supplierTrust < SCORE.GOOD || score.evidenceQuality < SCORE.GOOD)
  ) {
    return "REQUEST_MORE_PROOF";
  }
  if (score.total >= SCORE_THRESHOLDS.BEST_MATCH) return "BEST_MATCH";
  if (score.total < SCORE_THRESHOLDS.AVOID) return "AVOID";
  if (score.total >= SCORE_THRESHOLDS.NEGOTIATE) return "NEGOTIATE";
  return "WAIT";
}

function buildQuestions(missingProof: ProductMissingProofFlag[]) {
  const questions: Record<ProductMissingProofFlag, string> = {
    NEEDS_PRICE: "What is the current unit price and quote validity date?",
    NEEDS_CURRENCY: "Which currency is the quote denominated in?",
    NEEDS_SUPPLIER_IDENTITY:
      "Who is the legal seller and can they provide company registration?",
    NEEDS_SELLER_COUNTRY: "Which country is the seller legally based in?",
    NEEDS_ITEM_LOCATION:
      "Where is the item physically located before shipment?",
    NEEDS_SHIPPING_COST: "What is the shipping cost to the target country?",
    NEEDS_DELIVERY_ESTIMATE:
      "What is the committed delivery estimate and incoterm?",
    NEEDS_CONDITION: "Is the item new, used, refurbished, or custom-built?",
    NEEDS_RATING:
      "Can the supplier provide references or recent buyer reviews?",
    NEEDS_WARRANTY: "What warranty and after-sales terms are included?",
    NEEDS_VERIFICATION:
      "What proof verifies the supplier is authorized or reliable?",
  };
  return missingProof.map((flag) => questions[flag]);
}

function buildWhy(
  recommendation: ProductRecommendationType,
  score: ProductScenarioScore,
) {
  const reasons = [`Overall score ${score.total}/100.`];
  if (recommendation === "BEST_MATCH")
    reasons.push("Strong fit across price, proof, and supplier trust.");
  if (recommendation === "CHEAP_BUT_RISKY")
    reasons.push("Price is attractive, but proof or supplier trust is weak.");
  if (recommendation === "REQUEST_MORE_PROOF")
    reasons.push("Decision quality is limited by missing proof.");
  if (recommendation === "WAIT")
    reasons.push("Current evidence does not justify a strong recommendation.");
  if (recommendation === "NEGOTIATE")
    reasons.push("Candidate may fit if price or terms improve.");
  if (recommendation === "AVOID")
    reasons.push("Risk or price mismatch is too high for the current intent.");
  return reasons;
}

function buildRisks(missingProof: ProductMissingProofFlag[]) {
  const risks = ["Buyer may compare incomplete or non-equivalent offers."];
  if (missingProof.includes("NEEDS_SUPPLIER_IDENTITY")) {
    risks.push("Unknown seller identity can hide broker or fraud risk.");
  }
  if (missingProof.includes("NEEDS_SHIPPING_COST")) {
    risks.push("Total landed cost may be materially higher than listed price.");
  }
  if (missingProof.includes("NEEDS_DELIVERY_ESTIMATE")) {
    risks.push("Delivery delay risk is not measurable.");
  }
  if (missingProof.includes("NEEDS_WARRANTY")) {
    risks.push(
      "After-sales failure may turn the lowest price into the highest cost.",
    );
  }
  return risks;
}

function rankRecommendation(recommendation: ProductRecommendation) {
  return recommendation.score.total;
}

export function simulateProductScenarios(
  intent: ProductSearchIntent,
  candidates: ProductCandidate[],
  suppliers: SupplierCandidate[] = [],
): ProductScenarioSimulation {
  const scenarioTypes = detectScenarioTypes(intent);
  if (candidates.length === 0) {
    return {
      scenarioTypes,
      recommendations: [],
      warnings: ["No product candidates available."],
      missingData: ["NO_PRODUCT_CANDIDATES"],
    };
  }

  const recommendations = candidates.map((candidate): ProductRecommendation => {
    const supplier = findSupplier(candidate, suppliers);
    const evidence = productCandidateToEvidence(candidate, supplier);
    const missingProof = [...evidence.missingProofFlags];
    if (
      intent.requiredSpecs.some((spec) => /warranty/i.test(spec)) &&
      !JSON.stringify(candidate.raw).toLowerCase().includes("warranty") &&
      !missingProof.includes("NEEDS_WARRANTY")
    ) {
      missingProof.push("NEEDS_WARRANTY");
    }
    const score = buildScore(intent, candidate, supplier);
    const recommendation = chooseRecommendation(
      intent,
      candidate,
      score,
      missingProof,
    );
    return {
      candidate,
      recommendation,
      score,
      why: buildWhy(recommendation, score),
      missingProof,
      questionsToAskSupplier: buildQuestions(missingProof),
      whatCouldGoWrong: buildRisks(missingProof),
      buyerTypeFit: scenarioTypes,
    };
  });

  return {
    scenarioTypes,
    recommendations: recommendations.sort(
      (left, right) => rankRecommendation(right) - rankRecommendation(left),
    ),
    warnings: [],
    missingData: [],
  };
}
