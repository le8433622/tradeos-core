// TradeOS Landed Cost Calculator
// Estimates total landed cost from supplier price + shipping + duties + fees
// Based on public shipping rates, duty rates, and standard trade fees

export type ShipMode = "air" | "sea" | "express";
export type ProductCategory =
  | "electronics"
  | "textile"
  | "machinery"
  | "furniture"
  | "food"
  | "other";

export interface LandedCostInput {
  fobPricePerUnit: number; // USD
  quantity: number;
  unitWeightKg: number; // per unit
  unitVolumeCbm?: number; // per unit in cubic meters
  shipMode: ShipMode;
  originCountry: string;
  destCountry: string;
  productCategory: ProductCategory;
  currency?: string; // default USD
}

export interface LandedCostBreakdown {
  fobTotal: number;
  shippingCost: number;
  shippingDetail: string;
  dutiesTotal: number;
  dutiesRate: string;
  insuranceCost: number;
  paymentFees: number;
  grandTotal: number;
  costPerUnit: number;
  assumptions: string[];
  confidence: "high" | "medium" | "low";
}

// Estimated shipping rates per kg (USD) — approximate public market rates Q2 2026
const SHIPPING_RATES: Record<ShipMode, number> = {
  air: 4.5, // $4.5/kg air freight China→US/EU
  sea: 0.35, // $0.35/kg sea freight (LCL)
  express: 8.0, // $8/kg DHL/FedEx/UPS
};

// Estimated duty rates by category (simplified — real rates vary by HS code)
const DUTY_RATES: Record<ProductCategory, number> = {
  electronics: 0, // 0% for many electronics (ITA agreement)
  textile: 0.12, // 12% average
  machinery: 0.03, // 3% average
  furniture: 0.08, // 8% average
  food: 0.15, // 15% average
  other: 0.06, // 6% default
};

// Country-specific adjustments (for non-China origin)
const COUNTRY_DUTY_MULTIPLIER: Record<string, Record<string, number>> = {
  US: { electronics: 0.25, other: 0.03 }, // US-China tariff adjustments
};

function getEffectiveDutyRate(
  category: ProductCategory,
  originCountry: string,
  destCountry: string,
): { rate: number; note: string } {
  let rate = DUTY_RATES[category];

  // Country-specific adjustments
  if (originCountry === "CN" && destCountry === "US") {
    const adj = COUNTRY_DUTY_MULTIPLIER.US?.[category];
    if (adj !== undefined) rate += adj;
  }

  // General origin adjustment (non-China often has lower duties)
  if (originCountry !== "CN" && originCountry !== "UNKNOWN") {
    rate = Math.max(0, rate * 0.5); // approximate lower rate for non-China origin
  }

  const pct = (rate * 100).toFixed(1);
  const note = `${pct}% estimated duty rate for ${category} from ${originCountry} to ${destCountry}`;
  return { rate, note };
}

function getShippingCost(
  totalWeightKg: number,
  totalVolumeCbm: number,
  mode: ShipMode,
): { cost: number; detail: string } {
  const ratePerKg = SHIPPING_RATES[mode];

  // For sea freight, also consider volumetric weight
  let chargeableWeight = totalWeightKg;
  if (mode === "air" || mode === "express") {
    // Volumetric weight (kg) = CBM * 167 for air
    const volumetricWeight = (totalVolumeCbm || 0) * 167;
    chargeableWeight = Math.max(totalWeightKg, volumetricWeight);
  }

  const cost = chargeableWeight * ratePerKg;
  const detail = `${mode.toUpperCase()} freight: ${chargeableWeight.toFixed(1)}kg × $${ratePerKg}/kg = $${cost.toFixed(2)}`;
  return { cost, detail };
}

export function calculateLandedCost(
  input: LandedCostInput,
): LandedCostBreakdown {
  const assumptions: string[] = [];
  const {
    fobPricePerUnit,
    quantity,
    unitWeightKg,
    unitVolumeCbm = 0,
    shipMode,
    originCountry,
    destCountry,
    productCategory,
  } = input;

  // 1. FOB total
  const fobTotal = fobPricePerUnit * quantity;

  // 2. Shipping
  const totalWeight = unitWeightKg * quantity;
  const totalVolume = unitVolumeCbm * quantity;
  const { cost: shippingCost, detail: shippingDetail } = getShippingCost(
    totalWeight,
    totalVolume,
    shipMode,
  );
  assumptions.push(
    `Weight: ${totalWeight.toFixed(1)}kg total (${unitWeightKg}kg/unit)`,
  );
  if (unitVolumeCbm > 0) {
    assumptions.push(`Volume: ${totalVolume.toFixed(3)} CBM total`);
  }

  // 3. Duties
  const { rate: dutyRate, note: dutyNote } = getEffectiveDutyRate(
    productCategory,
    originCountry,
    destCountry,
  );
  const dutiesTotal = fobTotal * dutyRate;
  assumptions.push(dutyNote);

  // 4. Insurance (typically 0.5% of cargo value for sea, 1% for air)
  const insuranceRate = shipMode === "sea" ? 0.005 : 0.01;
  const insuranceCost = fobTotal * insuranceRate;
  assumptions.push(
    `Insurance: ${(insuranceRate * 100).toFixed(1)}% of cargo value`,
  );

  // 5. Payment fees (T/T ~1-2%, L/C ~0.5-1%, PayPal ~3-4%)
  const paymentFeeRate = 0.02; // T/T average
  const paymentFees = fobTotal * paymentFeeRate;
  assumptions.push(
    `Payment fees: ${(paymentFeeRate * 100).toFixed(1)}% estimated (T/T)`,
  );

  // 6. Grand total
  const grandTotal =
    fobTotal + shippingCost + dutiesTotal + insuranceCost + paymentFees;
  const costPerUnit = quantity > 0 ? grandTotal / quantity : 0;

  // Confidence based on data completeness
  const confidence: "high" | "medium" | "low" =
    unitWeightKg > 0 && originCountry !== "UNKNOWN" && destCountry !== "UNKNOWN"
      ? "high"
      : unitWeightKg > 0
        ? "medium"
        : "low";

  if (confidence !== "high") {
    assumptions.push(
      "Lower confidence due to missing weight or origin/destination data",
    );
  }

  return {
    fobTotal: round(fobTotal),
    shippingCost: round(shippingCost),
    shippingDetail,
    dutiesTotal: round(dutiesTotal),
    dutiesRate: (dutyRate * 100).toFixed(1) + "%",
    insuranceCost: round(insuranceCost),
    paymentFees: round(paymentFees),
    grandTotal: round(grandTotal),
    costPerUnit: round(costPerUnit),
    assumptions,
    confidence,
  };
}

// Estimate FOB price from a price string (e.g., "$6.80 - $9.50 / piece")
export function parsePriceRange(
  priceRaw: string,
): { min: number; max: number; avg: number; currency: string } | null {
  // Remove common noise
  const cleaned = priceRaw
    .replace(/US\s*\$?/gi, "")
    .replace(/USD/gi, "")
    .replace(/,/g, "")
    .trim();

  const ranges = cleaned.match(
    /[$]?(\d+(?:\.\d+)?)\s*[-–]\s*[$]?(\d+(?:\.\d+)?)/,
  );
  if (ranges) {
    const min = parseFloat(ranges[1]);
    const max = parseFloat(ranges[2]);
    return { min, max, avg: (min + max) / 2, currency: "USD" };
  }

  const single = cleaned.match(/[$]?(\d+(?:\.\d+)?)/);
  if (single) {
    const val = parseFloat(single[1]);
    return { min: val, max: val, avg: val, currency: "USD" };
  }

  return null;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
