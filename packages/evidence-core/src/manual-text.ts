import type {
  EvidenceAdapter,
  EvidenceInput,
  EvidenceSourceType,
  ParsedEvidence,
  MissingProofFlag,
  EvidenceQualityLevel,
  Confidence,
} from "./types";

const CURRENCY_ALIASES: Record<string, string> = {
  $: "USD",
  US$: "USD",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
  "₫": "VND",
};

const ALL_CURRENCIES = Object.keys(CURRENCY_ALIASES).join("|");
const CURR_CODE = "USD|EUR|VND|CNY|GBP|JPY|SGD|AUD|CAD|KRW|THB|IDR|MYR|PHP";

function numberFrom(str: string): number {
  return parseFloat(str.replace(/,/g, ""));
}

function normalizeUnit(raw: string): string {
  const map: Record<string, string> = {
    ton: "MT",
    "metric ton": "MT",
    "metric tons": "MT",
    tonne: "MT",
    tonnes: "MT",
    mt: "MT",
    kg: "KG",
    kilogram: "KG",
    kilograms: "KG",
    lb: "LB",
    lbs: "LB",
    pound: "LB",
    pounds: "LB",
    unit: "UNIT",
    units: "UNIT",
    pc: "PC",
    piece: "PC",
    pieces: "PC",
    container: "CONTAINER",
    containers: "CONTAINER",
    box: "BOX",
    boxes: "BOX",
    case: "CASE",
    cases: "CASE",
    bag: "BAG",
    bags: "BAG",
    barrel: "BARREL",
    barrels: "BARREL",
    pallet: "PALLET",
    pallets: "PALLET",
    liter: "L",
    liters: "L",
    litre: "L",
    litres: "L",
  };
  return map[raw.toLowerCase()] ?? raw.toUpperCase();
}

const UNIT_PATTERN = Object.keys({
  ton: 1,
  "metric ton": 1,
  tonne: 1,
  mt: 1,
  kg: 1,
  kilogram: 1,
  lb: 1,
  pound: 1,
  unit: 1,
  pc: 1,
  piece: 1,
  container: 1,
  box: 1,
  case: 1,
  bag: 1,
  barrel: 1,
  pallet: 1,
  liter: 1,
}).join("|");

function detectUnit(text: string): string | undefined {
  const re = new RegExp(`(?:\\/|per)\\s*(${UNIT_PATTERN})\\b`, "i");
  const match = text.match(re);
  if (match) return normalizeUnit(match[1]);
  return undefined;
}

function detectPrice(text: string): {
  price?: number;
  currency?: string;
  confidence: Confidence;
} {
  let currencies = text.match(new RegExp(`\\b(${CURR_CODE})\\b`, "gi"));
  let symbols = text.match(/[$€£¥₫]/g);
  const firstCurrency =
    currencies?.[0]?.toUpperCase() ??
    (symbols?.length ? CURRENCY_ALIASES[symbols[0]] : undefined);

  const n = `(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{1,2})?)`;
  const c = `(${CURR_CODE}|\\$|€|£|¥|₫)`;

  const currencyFirst = new RegExp(`${c}\\s*${n}`, "i");
  const cf = text.match(currencyFirst);
  if (cf) {
    return {
      price: numberFrom(cf[2]),
      currency: CURRENCY_ALIASES[cf[1]] ?? cf[1].toUpperCase(),
      confidence: "HIGH",
    };
  }

  const numberFirst = new RegExp(`${n}\\s*${c}`, "i");
  const nf = text.match(numberFirst);
  if (nf) {
    return {
      price: numberFrom(nf[1]),
      currency: CURRENCY_ALIASES[nf[2]] ?? nf[2].toUpperCase(),
      confidence: "HIGH",
    };
  }

  const atPrice = new RegExp(`@\\s*${c}?\\s*${n}`, "i");
  const at = text.match(atPrice);
  if (at) {
    return {
      price: numberFrom(at[1]),
      currency: firstCurrency ?? "USD",
      confidence: "HIGH",
    };
  }

  const lone = new RegExp(`\\b${n}\\b`);
  const ln = text.match(lone);
  if (ln) {
    return {
      price: numberFrom(ln[1]),
      currency: firstCurrency,
      confidence: firstCurrency ? "MEDIUM" : "LOW",
    };
  }

  return { confidence: "UNKNOWN" };
}

function detectSupplier(text: string): string | undefined {
  const re =
    /\b(supplier|seller|vendor|manufacturer|company|supplied\s+by|provided\s+by|producer|exporter|provider)\s*[:\-]?\s*([A-Z][A-Za-z0-9\s&.,'/-]{2,50}?)(?=[,.\n\r]|\s{2,}|$)/i;
  const match = text.match(re);
  if (match) {
    const name = match[2].trim();
    if (name.length > 1 && name.length <= 50) return name;
  }

  const re2 =
    /\b(from|by)\s+([A-Z][A-Za-z0-9\s&.']{3,40}?)(?:\s+(?:at|in|for|we|they|the|with|on)\b|[,.\n\r]|$)/i;
  const match2 = text.match(re2);
  if (match2) {
    const name = match2[2].trim();
    if (name.length > 3 && name.length <= 45) return name;
  }

  return undefined;
}

function detectProductName(text: string): string | undefined {
  const re =
    /\b(product|item|commodity|goods)\s*[:\-]?\s*([A-Za-z0-9\s&.,'/#()-]{4,80}?)(?=[,.\n\r]|\s{2,}|$)/i;
  const match = text.match(re);
  if (match) {
    const name = match[2].trim();
    if (name.length > 3) return name;
  }

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const tradeKeywords = [
    "coffee",
    "rice",
    "steel",
    "bean",
    "oil",
    "chemical",
    "cloth",
    "plastic",
    "rubber",
    "wood",
    "paper",
    "metal",
    "ore",
    "grain",
    "sugar",
    "spice",
    "fruit",
    "fish",
    "shrimp",
    "poultry",
    "meat",
    "dairy",
    "wine",
    "beer",
    "cereal",
    "feed",
    "fertilizer",
    "paint",
    "pipe",
    "valve",
    "pump",
    "motor",
    "cable",
    "wire",
    "plate",
    "sheet",
    "bar",
    "ingot",
    "billet",
    "slab",
    "coil",
    "grade",
    "screen",
    "moisture",
    "purity",
    "protein",
    "fat",
    "fiber",
    "ash",
  ];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (
      tradeKeywords.some((k) => new RegExp(`\\b${k}\\b`).test(lower)) &&
      line.length > 5 &&
      line.length < 120
    ) {
      return line;
    }
  }

  return undefined;
}

function detectQuantity(text: string): { quantity?: number; unit?: string } {
  const unitAliases: Record<string, string> = {
    mt: "MT",
    ton: "MT",
    tonne: "MT",
    tons: "MT",
    tonnes: "MT",
    kg: "KG",
    kilogram: "KG",
    kilograms: "KG",
    lb: "LB",
    lbs: "LB",
    pound: "LB",
    pounds: "LB",
    unit: "UNIT",
    units: "UNIT",
    container: "CONTAINER",
    containers: "CONTAINER",
    box: "BOX",
    boxes: "BOX",
    bag: "BAG",
    bags: "BAG",
    pallet: "PALLET",
    pallets: "PALLET",
    barrel: "BARREL",
    barrels: "BARREL",
    case: "CASE",
    cases: "CASE",
    liter: "L",
    liters: "L",
    litre: "L",
    litres: "L",
  };

  const unitPattern = Object.keys(unitAliases).join("|");
  const re = new RegExp(
    `(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(${unitPattern})\\b`,
    "i",
  );
  const match = text.match(re);
  if (match) {
    return {
      quantity: numberFrom(match[1]),
      unit: unitAliases[match[2].toLowerCase()],
    };
  }
  return {};
}

function detectOrigin(text: string): string | undefined {
  const re =
    /\b(origin|made\s+in|country\s+of\s+origin|manufactured\s+in|produced\s+in|sourced\s+from|based\s+in)\s*[:\-]?\s*([A-Za-z\s]{3,30}?)(?=[,.\n\r]|\s{2,}|$)/i;
  const match = text.match(re);

  if (match) {
    const country = match[2].trim();
    if (country.length > 2 && country.length < 30) return country;
  }

  const countries = [
    "vietnam",
    "china",
    "india",
    "indonesia",
    "thailand",
    "malaysia",
    "singapore",
    "philippines",
    "japan",
    "korea",
    "taiwan",
    "bangladesh",
    "pakistan",
    "sri lanka",
    "brazil",
    "argentina",
    "chile",
    "peru",
    "colombia",
    "mexico",
    "usa",
    "united states",
    "canada",
    "germany",
    "france",
    "italy",
    "spain",
    "netherlands",
    "belgium",
    "uk",
    "united kingdom",
    "australia",
    "new zealand",
    "turkey",
    "egypt",
    "south africa",
    "nigeria",
    "kenya",
    "ethiopia",
    "uganda",
  ];

  const lower = text.toLowerCase();
  for (const country of countries) {
    if (lower.includes(country)) {
      const idx = lower.indexOf(country);
      const start = Math.max(0, idx - 20);
      const before = lower.slice(start, idx);
      if (/\b(in|from|at|of|origin)\s*$/.test(before)) {
        return country.charAt(0).toUpperCase() + country.slice(1);
      }
    }
  }

  for (const country of countries) {
    if (lower.includes(country)) {
      return country.charAt(0).toUpperCase() + country.slice(1);
    }
  }

  return undefined;
}

function detectPaymentTerms(text: string): string | undefined {
  const patterns = [
    /\b(L\/C|LC|letter\s+of\s+credit)\s*(?:\s+at\s+sight|\s+\d+\s*days)?/i,
    /\b(T\/T|TT|telegraphic\s+transfer|wire\s+transfer)\b/i,
    /\b(net\s+\d+)\b/i,
    /\b(\d+%\s*(?:deposit|advance|down\s+payment|upfront)(?:\s*,\s*(?:balance|remaining)\s+\d+%\s*(?:against|upon|on)\s+\w+)?)/i,
    /\b(CAD|cash\s+against\s+documents)\b/i,
    /\b(D\/P|documents\s+against\s+payment)\b/i,
    /\b(D\/A|documents\s+against\s+acceptance)\b/i,
    /\b(credit\s+\d+\s*days|payment\s+terms?\s*:?\s*[^,\n]{3,40})/i,
  ];

  for (const re of patterns) {
    const match = text.match(re);
    if (match) return match[0].trim();
  }
  return undefined;
}

function detectDeliveryTerms(text: string): string | undefined {
  const incoterms = "FOB|CIF|CFR|C&F|EXW|FCA|CPT|CIP|DAP|DPU|DDP|DAT|FAS";
  const re = new RegExp(
    `\\b(${incoterms})(?:\\s+[A-Za-z\\s]{2,30}?)?(?=[,.\n\r]|\\s{2,}|$)`,
    "i",
  );
  const match = text.match(re);
  if (match) return match[0].trim();

  const leadTimeRe =
    /\b(lead\s+time|delivery\s+time|shipping\s+time|delivery\s+in|ship\s+within|ready\s+in)\s*:?\s*(\d+\s*(?:days?|weeks?|months?))/i;
  const ltMatch = text.match(leadTimeRe);
  if (ltMatch) return ltMatch[0].trim();

  return undefined;
}

function detectLandedCost(text: string): number | undefined {
  const patterns = [
    /\b(landed\s+cost|all-in\s+price|delivered\s+price|DDP\s+price|cif\s+price)\s*:?\s*(?:USD|EUR|VND|CNY|\$|€|£|¥)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/i,
    /\bCIF\s+[A-Za-z\s]{2,30}?\s*(?:USD|EUR|\$|€)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/i,
  ];

  for (const re of patterns) {
    const match = text.match(re);
    if (match) {
      const num = match[match.length - 1]!;
      return numberFrom(num);
    }
  }
  return undefined;
}

function deriveQuality(params: {
  hasPrice: boolean;
  hasSupplier: boolean;
  hasQuantity: boolean;
  hasUnit: boolean;
  hasProduct: boolean;
  hasPaymentTerms: boolean;
  hasDeliveryTerms: boolean;
}): { level: EvidenceQualityLevel; score: number } {
  const {
    hasPrice,
    hasSupplier,
    hasQuantity,
    hasUnit,
    hasProduct,
    hasPaymentTerms,
    hasDeliveryTerms,
  } = params;
  const count = [
    hasPrice,
    hasSupplier,
    hasQuantity || hasUnit,
    hasProduct,
    hasPaymentTerms,
    hasDeliveryTerms,
  ].filter(Boolean).length;

  if (count >= 5 && hasPrice && hasSupplier && hasProduct) {
    return { level: "L3_QUOTE_WITH_SUPPLIER_IDENTITY_DATE_TERMS", score: 60 };
  }
  if (count >= 3 && hasPrice && hasSupplier && hasProduct) {
    return { level: "L2_BASIC_QUOTE_OR_INVOICE", score: 40 };
  }
  if (count >= 2 && hasPrice) {
    return { level: "L1_SCREENSHOT_OR_LINK_ONLY", score: 20 };
  }
  return { level: "L0_UNVERIFIED_CLAIM", score: 0 };
}

function deriveMissingProofFlags(params: {
  hasPrice: boolean;
  hasSupplier: boolean;
  hasOrigin: boolean;
  hasQuantity: boolean;
  hasPaymentTerms: boolean;
  hasDeliveryTerms: boolean;
  hasLandedCost: boolean;
}): MissingProofFlag[] {
  const flags: MissingProofFlag[] = [];
  if (!params.hasPrice) flags.push("NEEDS_CURRENT_PRICE");
  if (!params.hasSupplier) flags.push("NEEDS_SUPPLIER_IDENTITY");
  if (!params.hasPaymentTerms) flags.push("NEEDS_PAYMENT_TERMS");
  if (!params.hasDeliveryTerms) flags.push("NEEDS_DELIVERY_TERMS");
  if (!params.hasLandedCost) flags.push("NEEDS_LANDED_COST");
  if (!params.hasOrigin) flags.push("NEEDS_ORIGIN_PRICE");
  return flags;
}

export class ManualTextEvidenceAdapter implements EvidenceAdapter {
  readonly sourceType: EvidenceSourceType = "MANUAL_TEXT";

  canHandle(input: EvidenceInput): boolean {
    return input.sourceType === "MANUAL_TEXT" && input.text.trim().length > 0;
  }

  parse(input: EvidenceInput): ParsedEvidence {
    const text = input.text.trim();

    const priceResult = detectPrice(text);
    const detectedUnit = detectUnit(text);
    const quantityResult = detectQuantity(text);
    const supplierName = detectSupplier(text);
    const productName = detectProductName(text);
    const originCountry = detectOrigin(text);
    const paymentTerms = detectPaymentTerms(text);
    const deliveryTerms = detectDeliveryTerms(text);
    const landedCost = detectLandedCost(text);

    const hasPrice = priceResult.price != null;
    const hasUnit = detectedUnit != null || quantityResult.unit != null;
    const hasSupplier = supplierName != null;
    const hasProduct = productName != null;
    const hasOrigin = originCountry != null;
    const hasQuantity = quantityResult.quantity != null;
    const hasPaymentTerms = paymentTerms != null;
    const hasDeliveryTerms = deliveryTerms != null;
    const hasLandedCost = landedCost != null;

    const quality = deriveQuality({
      hasPrice,
      hasSupplier,
      hasQuantity,
      hasUnit,
      hasProduct,
      hasPaymentTerms,
      hasDeliveryTerms,
    });

    const missingProofFlags = deriveMissingProofFlags({
      hasPrice,
      hasSupplier,
      hasOrigin,
      hasQuantity,
      hasPaymentTerms,
      hasDeliveryTerms,
      hasLandedCost,
    });

    const confidence: Record<string, Confidence> = {};
    const setConf = (key: string, found: boolean) => {
      confidence[key] = found ? "HIGH" : "UNKNOWN";
    };
    setConf("price", hasPrice);
    setConf("currency", priceResult.currency != null);
    setConf("quantity", hasQuantity);
    setConf("unit", hasUnit);
    setConf("supplierName", hasSupplier);
    setConf("productName", hasProduct);
    setConf("originCountry", hasOrigin);
    setConf("paymentTerms", hasPaymentTerms);
    setConf("deliveryTerms", hasDeliveryTerms);
    setConf("landedCost", hasLandedCost);

    if (hasPrice && priceResult.confidence !== "HIGH") {
      confidence.price = priceResult.confidence;
    }

    return {
      sourceType: input.sourceType,
      productName,
      supplierName,
      price: priceResult.price,
      currency: priceResult.currency,
      unit: detectedUnit ?? quantityResult.unit,
      quantity: quantityResult.quantity,
      originCountry,
      landedCost,
      paymentTerms,
      deliveryTerms,
      evidenceQuality: quality.level,
      evidenceQualityScore: quality.score,
      missingProofFlags,
      confidence,
      rawEvidenceRef: input.reference,
    };
  }
}
