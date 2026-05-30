import type {
  BuyerRiskTolerance,
  BuyerUrgency,
  ProductSearchIntent,
} from "./types";

const DEFAULT_CURRENCY = "USD";

const CURRENCY_PATTERNS: Array<[RegExp, string]> = [
  [/\b(vnd|vnđ|₫)\b/i, "VND"],
  [/\b(usd|us\$|\$)\b/i, "USD"],
  [/\b(eur|€)\b/i, "EUR"],
];

const URGENT_PATTERN = /urgent|gấp|ngay|asap|this week|tuần này/i;
const QUALITY_PATTERN = /bền|quality|durable|warranty|reliable|chất lượng/i;
const LOW_RISK_PATTERN =
  /an toàn|ít rủi ro|trusted|verified|official|bảo hành/i;
const HIGH_RISK_PATTERN = /rẻ nhất|cheapest|low price|giá thấp|deal tốt/i;

function parseCurrency(text: string) {
  return CURRENCY_PATTERNS.find(([pattern]) => pattern.test(text))?.[1];
}

function parseBudgetMax(text: string): number | undefined {
  const millionMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(triệu|million|m)\b/i);
  if (millionMatch?.[1]) {
    const value = Number(millionMatch[1].replace(",", "."));
    if (Number.isFinite(value)) return value * 1_000_000;
  }

  const budgetMatch = text.match(
    /(?:budget|ngân sách|under|dưới|max|tối đa)\D{0,20}(\d[\d.,]*)/i,
  );
  if (!budgetMatch?.[1]) return undefined;
  const normalized = budgetMatch[1].replace(/[,.](?=\d{3}\b)/g, "");
  const value = Number(normalized.replace(",", "."));
  return Number.isFinite(value) ? value : undefined;
}

function parseQuantity(text: string): number | undefined {
  const quantityMatch = text.match(
    /(?:quantity|qty|số lượng|mua)\D{0,16}(\d{1,6})/i,
  );
  if (!quantityMatch?.[1]) return undefined;
  const quantity = Number(quantityMatch[1]);
  return Number.isFinite(quantity) ? quantity : undefined;
}

function parseUrgency(text: string): BuyerUrgency {
  return URGENT_PATTERN.test(text) ? "HIGH" : "MEDIUM";
}

function parseRiskTolerance(text: string): BuyerRiskTolerance {
  if (LOW_RISK_PATTERN.test(text)) return "LOW";
  if (HIGH_RISK_PATTERN.test(text)) return "HIGH";
  return "MEDIUM";
}

function parseRequiredSpecs(text: string): string[] {
  const specs = new Set<string>();
  if (QUALITY_PATTERN.test(text)) specs.add("durable");
  if (/warranty|bảo hành/i.test(text)) specs.add("warranty");
  if (/automatic|tự động/i.test(text)) specs.add("automatic");
  if (/robot|cnc|hàn|welding/i.test(text)) specs.add("industrial");
  return [...specs];
}

export function parseProductSearchIntent(
  text: string,
  defaults: Partial<ProductSearchIntent> = {},
): ProductSearchIntent {
  const query = defaults.query ?? text.trim().replace(/\s+/g, " ");
  return {
    query,
    category: defaults.category,
    targetCountry: defaults.targetCountry,
    sourceCountry: defaults.sourceCountry,
    currency: defaults.currency ?? parseCurrency(text) ?? DEFAULT_CURRENCY,
    budgetMin: defaults.budgetMin,
    budgetMax: defaults.budgetMax ?? parseBudgetMax(text),
    quantity: defaults.quantity ?? parseQuantity(text),
    unit: defaults.unit,
    requiredSpecs: defaults.requiredSpecs ?? parseRequiredSpecs(text),
    avoidSpecs: defaults.avoidSpecs ?? [],
    buyerUseCase: defaults.buyerUseCase ?? text,
    urgency: defaults.urgency ?? parseUrgency(text),
    riskTolerance: defaults.riskTolerance ?? parseRiskTolerance(text),
  };
}
