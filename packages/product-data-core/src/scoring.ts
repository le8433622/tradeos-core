import { SCORE } from "./constants";
import type { ProductCandidate, ProductSearchIntent } from "./types";

export type ScoreAxis = {
  label: string;
  score: number;
  weight: number;
  why: string;
};

export type ScoredCandidate = ProductCandidate & {
  relevanceScore: number;
  axisScores: ScoreAxis[];
  summary: string;
  valueLabel: "BEST_VALUE" | "PREMIUM" | "BUDGET" | "AVERAGE" | "RISKY";
};

export type RankedResult = {
  ranked: ScoredCandidate[];
  topPick: ScoredCandidate | null;
  bestPrice: ScoredCandidate | null;
  premiumPick: ScoredCandidate | null;
  marketInsights: {
    priceRange: { min: number; max: number; avg: number; median: number };
    sellerCount: number;
    conditionDistribution: Record<string, number>;
    priceQualityCorrelation: number;
    warnings: string[];
  };
};

function percentileRank(values: number[], val: number): number {
  const count = values.filter((v) => v !== undefined && !isNaN(v)).length;
  if (count === 0) return 50;
  const below = values.filter(
    (v) => v !== undefined && !isNaN(v) && v < val,
  ).length;
  return Math.round((below / count) * 100);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function marketAvg(values: number[]): number {
  const valid = values.filter((v) => v !== undefined && !isNaN(v));
  if (valid.length === 0) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function marketMedian(values: number[]): number {
  const valid = values
    .filter((v) => v !== undefined && !isNaN(v))
    .sort((a, b) => a - b);
  if (valid.length === 0) return 0;
  const mid = Math.floor(valid.length / 2);
  return valid.length % 2 === 0
    ? (valid[mid - 1] + valid[mid]) / 2
    : valid[mid];
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;
  const sx = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const sy = y.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let num = 0,
    d1 = 0,
    d2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - sx,
      dy = y[i] - sy;
    num += dx * dy;
    d1 += dx * dx;
    d2 += dy * dy;
  }
  if (d1 === 0 || d2 === 0) return 0;
  return clamp(num / Math.sqrt(d1 * d2), -1, 1);
}

const CONDITION_ORDER: Record<string, number> = {
  NEW: 100,
  "NEW OTHER": 90,
  "NEW WITH BOX": 95,
  "NEW WITHOUT BOX": 85,
  "MANUFACTURER REFURBISHED": 75,
  "CERTIFIED REFURBISHED": 80,
  "EXCELLENT REFURBISHED": 70,
  "VERY GOOD REFURBISHED": 60,
  "GOOD REFURBISHED": 50,
  USED: 45,
  "VERY GOOD": 55,
  GOOD: 40,
  ACCEPTABLE: 25,
  "FOR PARTS OR NOT WORKING": 5,
};

function conditionScore(condition?: string): number {
  if (!condition) return SCORE.UNKNOWN;
  const match = Object.entries(CONDITION_ORDER).find(([key]) =>
    condition.toUpperCase().includes(key),
  );
  if (match) return match[1];
  const upper = condition.toUpperCase();
  if (upper.includes("NEW")) return 90;
  if (upper.includes("REFURB")) return 70;
  if (upper.includes("USED")) return 45;
  if (upper.includes("PARTS") || upper.includes("NOT WORKING")) return 5;
  return SCORE.UNKNOWN;
}

function priceScore(
  price: number | undefined,
  allPrices: number[],
  budgetMax?: number,
): { score: number; why: string } {
  if (price === undefined || isNaN(price)) {
    return { score: 0, why: "No price available" };
  }
  if (allPrices.length < 2) return { score: 70, why: "Only one price point" };
  if (budgetMax && price > budgetMax) {
    return {
      score: clamp(
        Math.round((1 - (price - budgetMax) / budgetMax) * 40),
        0,
        40,
      ),
      why: `Over budget by ${Math.round(((price - budgetMax) / budgetMax) * 100)}%`,
    };
  }
  const avg = marketAvg(allPrices);
  const ratio = avg > 0 ? price / avg : 1;
  if (ratio <= 0.7)
    return { score: 95, why: "Significantly below market average" };
  if (ratio <= 0.9) return { score: 85, why: "Below market average" };
  if (ratio <= 1.1) return { score: 75, why: "At market average" };
  if (ratio <= 1.3) return { score: 55, why: "Above market average" };
  if (ratio <= 1.5)
    return { score: 35, why: "Significantly above market average" };
  return { score: 15, why: "Far above market average" };
}

function trustScore(
  rating: number | undefined,
  reviewCount: number | undefined,
): { score: number; why: string } {
  if (rating === undefined && reviewCount === undefined) {
    return { score: 20, why: "No seller rating or review data" };
  }
  const r = rating ?? 0;
  const rc = reviewCount ?? 0;
  let s = clamp(Math.round((r / 5) * 60), 0, 60);
  if (rc >= 1000) s += 40;
  else if (rc >= 100) s += 30;
  else if (rc >= 10) s += 20;
  else if (rc > 0) s += 10;
  const parts: string[] = [];
  if (r > 0) parts.push(`Rating ${r}/5`);
  if (rc > 0) parts.push(`${rc} reviews`);
  return {
    score: clamp(s, 0, 100),
    why: parts.join(", ") || "Minimal trust data",
  };
}

function shippingScore(shippingCost: number | undefined): {
  score: number;
  why: string;
} {
  if (shippingCost === undefined)
    return { score: 50, why: "Shipping cost unknown" };
  if (shippingCost === 0) return { score: 100, why: "Free shipping" };
  if (shippingCost <= 10) return { score: 80, why: "Low shipping cost" };
  if (shippingCost <= 30) return { score: 60, why: "Moderate shipping cost" };
  if (shippingCost <= 50) return { score: 40, why: "High shipping cost" };
  return { score: 20, why: "Very high shipping cost" };
}

const VALUE_WEIGHTS = {
  price: 0.35,
  trust: 0.3,
  condition: 0.2,
  shipping: 0.15,
};

export function scoreCandidate(
  candidate: ProductCandidate,
  allPrices: number[],
  intent?: ProductSearchIntent,
): ScoredCandidate {
  const ps = priceScore(candidate.price, allPrices, intent?.budgetMax);
  const ts = trustScore(candidate.rating, candidate.reviewCount);
  const cs = {
    score: conditionScore(candidate.condition),
    why: candidate.condition ?? "Condition unknown",
  };
  const ss = shippingScore(candidate.shippingCost);

  const axes: ScoreAxis[] = [
    { label: "Price Competitiveness", ...ps, weight: VALUE_WEIGHTS.price },
    { label: "Seller Trust", ...ts, weight: VALUE_WEIGHTS.trust },
    { label: "Condition", ...cs, weight: VALUE_WEIGHTS.condition },
    { label: "Shipping", ...ss, weight: VALUE_WEIGHTS.shipping },
  ];

  const total = axes.reduce((sum, a) => sum + a.score * a.weight, 0);
  const relevanceScore = Math.round(clamp(total, 0, 100));

  let valueLabel: ScoredCandidate["valueLabel"];
  if (relevanceScore >= 80) valueLabel = "BEST_VALUE";
  else if (relevanceScore >= 65) valueLabel = "AVERAGE";
  else if (ps.score >= 80 && relevanceScore >= 50) valueLabel = "BUDGET";
  else if (ts.score >= 80) valueLabel = "PREMIUM";
  else valueLabel = "RISKY";

  const strong = axes
    .filter((a) => a.score >= 75)
    .map((a) => a.label.toLowerCase());
  const weak = axes
    .filter((a) => a.score < 40)
    .map((a) => a.label.toLowerCase());
  let summary = "";
  if (strong.length > 0 && weak.length === 0) {
    summary = `Strong in ${strong.join(", ")}`;
  } else if (strong.length > 0 && weak.length > 0) {
    summary = `Good ${strong.join(", ")} but weak ${weak.join(", ")}`;
  } else if (weak.length > 0) {
    summary = `Weak ${weak.join(", ")} — consider alternatives`;
  } else {
    summary = "Average across all factors";
  }

  return {
    ...candidate,
    relevanceScore,
    axisScores: axes,
    summary,
    valueLabel,
  };
}

export function rankCandidates(
  candidates: ProductCandidate[],
  intent?: ProductSearchIntent,
): RankedResult {
  if (candidates.length === 0) {
    const empty: RankedResult = {
      ranked: [],
      topPick: null,
      bestPrice: null,
      premiumPick: null,
      marketInsights: {
        priceRange: { min: 0, max: 0, avg: 0, median: 0 },
        sellerCount: 0,
        conditionDistribution: {},
        priceQualityCorrelation: 0,
        warnings: ["No candidates to rank"],
      },
    };
    return empty;
  }

  const allPrices = candidates.map((c) => c.price ?? NaN);
  const scored = candidates.map((c) => scoreCandidate(c, allPrices, intent));
  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

  const validPrices = allPrices.filter((p) => !isNaN(p));
  const priceRange = {
    min: validPrices.length > 0 ? Math.min(...validPrices) : 0,
    max: validPrices.length > 0 ? Math.max(...validPrices) : 0,
    avg: Math.round(marketAvg(validPrices) * 100) / 100,
    median: Math.round(marketMedian(validPrices) * 100) / 100,
  };

  const scoredWithTrust = scored.filter(
    (s) => s.rating !== undefined && s.rating > 0,
  );
  const scores = scoredWithTrust.map((s) => s.relevanceScore);
  const trustVals = scoredWithTrust.map((s) => (s.rating ?? 0) * 20);
  const priceQualityCorrelation =
    Math.round(pearsonCorrelation(scores, trustVals) * 100) / 100;

  const sellers = new Set(
    candidates.filter((c) => c.sellerName).map((c) => c.sellerName),
  );

  const conditionDist: Record<string, number> = {};
  for (const c of candidates) {
    const key = c.condition ?? "UNKNOWN";
    conditionDist[key] = (conditionDist[key] ?? 0) + 1;
  }

  const warnings: string[] = [];
  if (sellers.size === 0) warnings.push("No seller information available");
  if (sellers.size === 1 && candidates.length > 1) {
    warnings.push(`Single seller for ${candidates.length} listings`);
  }
  if (priceRange.max > priceRange.min * 3 && priceRange.min > 0) {
    warnings.push(
      `Price varies ${Math.round((priceRange.max / priceRange.min) * 100)}% across listings`,
    );
  }
  if (priceQualityCorrelation < -0.3) {
    warnings.push("Higher price does not correlate with higher quality");
  }
  const lowTrust = scored.filter((s) => (s.rating ?? 0) < 3).length;
  if (lowTrust > candidates.length * 0.3) {
    warnings.push(
      `${lowTrust}/${candidates.length} listings have low seller rating`,
    );
  }

  const sortedByPrice = [...scored].sort(
    (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity),
  );
  const sortedByTrust = [...scored].sort(
    (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
  );

  const topPick = scored.length > 0 ? scored[0] : null;
  const bestPrice = sortedByPrice.length > 0 ? sortedByPrice[0] : null;
  const premiumPick = sortedByTrust.length > 0 ? sortedByTrust[0] : null;

  return {
    ranked: scored,
    topPick,
    bestPrice,
    premiumPick,
    marketInsights: {
      priceRange,
      sellerCount: sellers.size,
      conditionDistribution: conditionDist,
      priceQualityCorrelation,
      warnings,
    },
  };
}
