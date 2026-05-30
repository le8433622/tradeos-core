import type { ProductEvidenceQuality } from "./types";

export const DEFAULT_MOCK_LIMIT = 20;

export const SCORE = {
  PERFECT: 100,
  EXCELLENT: 90,
  STRONG: 80,
  GOOD: 70,
  MEDIUM: 55,
  WEAK: 40,
  POOR: 25,
  UNKNOWN: 50,
  NONE: 0,
} as const;

export const SCORE_THRESHOLDS = {
  BEST_MATCH: 78,
  NEGOTIATE: 60,
  AVOID: 35,
  CHEAP_PRICE_RATIO: 0.72,
  OVER_BUDGET_RATIO: 1.12,
  FAR_OVER_BUDGET_RATIO: 1.35,
  LOW_TRUST: 45,
  WEAK_EVIDENCE: 45,
  MANY_MISSING_PROOFS: 4,
} as const;

export const SCORING_WEIGHTS = {
  priceFit: 0.18,
  specFit: 0.18,
  supplierTrust: 0.16,
  locationLogisticsFit: 0.12,
  deliveryRisk: 0.1,
  evidenceQuality: 0.12,
  missingProof: 0.08,
  buyerRiskToleranceFit: 0.06,
} as const;

export const EVIDENCE_QUALITY_SCORE: Record<ProductEvidenceQuality, number> = {
  L1_API_LISTING: 25,
  L2_PRICE_LISTING: 45,
  L3_SELLER_IDENTIFIED: 65,
  L4_VERIFIED_SUPPLIER: 85,
  L5_PURCHASE_OUTCOME: 100,
};

export const DEFAULT_SPEC_FIT_SCORE = SCORE.GOOD;
export const DEFAULT_DELIVERY_RISK_SCORE = SCORE.MEDIUM;
