import { DEFAULT_MOCK_LIMIT } from "./constants";
import type {
  ProductCandidate,
  ProductDataAdapter,
  ProductSearchIntent,
  ProductSearchResult,
  SupplierCandidate,
} from "./types";

const DEFAULT_CANDIDATES: ProductCandidate[] = [
  {
    provider: "mock",
    externalId: "mock-welding-robot-verified",
    title: "Automatic welding robot with CNC controller and 12 month warranty",
    url: "https://example.test/mock-welding-robot-verified",
    price: 92_000_000,
    currency: "VND",
    unit: "set",
    condition: "new",
    sellerName: "Shenzhen Reliable Robotics",
    sellerId: "seller-verified-1",
    sellerCountry: "China",
    itemLocation: "Shenzhen, China",
    shippingCost: 4_500_000,
    deliveryEstimate: "18-25 days",
    rating: 4.8,
    reviewCount: 126,
    availability: "in_stock",
    raw: { verificationLevel: "verified", warranty: "12 months" },
  },
  {
    provider: "mock",
    externalId: "mock-welding-robot-cheap",
    title: "Cheap automatic welding robot controller bundle",
    url: "https://example.test/mock-welding-robot-cheap",
    price: 54_000_000,
    currency: "VND",
    unit: "set",
    condition: "used",
    sellerName: "Factory Outlet 88",
    sellerCountry: "China",
    itemLocation: "Guangzhou, China",
    availability: "limited",
    raw: { warranty: null },
  },
  {
    provider: "mock",
    externalId: "mock-cnc-premium",
    title: "Premium CNC machining center for factory procurement",
    url: "https://example.test/mock-cnc-premium",
    price: 148_000_000,
    currency: "VND",
    unit: "set",
    condition: "new",
    sellerName: "Jinan Pioneer CNC Technology Co., Ltd.",
    sellerId: "jinan-pioneer",
    sellerCountry: "China",
    itemLocation: "Jinan, China",
    shippingCost: 7_000_000,
    deliveryEstimate: "30-40 days",
    rating: 4.6,
    reviewCount: 78,
    availability: "in_stock",
    raw: { verificationLevel: "verified", warranty: "18 months" },
  },
];

const DEFAULT_SUPPLIERS: SupplierCandidate[] = [
  {
    provider: "mock",
    sellerName: "Shenzhen Reliable Robotics",
    sellerId: "seller-verified-1",
    country: "China",
    profileUrl: "https://example.test/seller-verified-1",
    reputation: "4.8/5",
    listingCount: 42,
    verificationLevel: "verified",
    raw: { source: "mock" },
  },
  {
    provider: "mock",
    sellerName: "Jinan Pioneer CNC Technology Co., Ltd.",
    sellerId: "jinan-pioneer",
    country: "China",
    profileUrl: "https://example.test/jinan-pioneer",
    reputation: "4.6/5",
    listingCount: 31,
    verificationLevel: "verified",
    raw: { source: "mock" },
  },
];

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

function hasQueryMatch(
  candidate: ProductCandidate,
  intent: ProductSearchIntent,
) {
  const queryTerms = normalizeText(intent.query)
    .split(/\s+/)
    .filter((term) => term.length > 2);
  if (queryTerms.length === 0) return true;
  const searchable = normalizeText(
    `${candidate.title} ${candidate.sellerName ?? ""} ${JSON.stringify(candidate.raw)}`,
  );
  return queryTerms.some((term) => searchable.includes(term));
}

function isWithinBudget(
  candidate: ProductCandidate,
  intent: ProductSearchIntent,
) {
  if (candidate.price === undefined) return true;
  if (intent.budgetMin !== undefined && candidate.price < intent.budgetMin) {
    return false;
  }
  if (intent.budgetMax !== undefined && candidate.price > intent.budgetMax) {
    return false;
  }
  return true;
}

export class MockProductDataAdapter implements ProductDataAdapter {
  readonly provider = "mock" as const;

  constructor(
    private readonly candidates: ProductCandidate[] = DEFAULT_CANDIDATES,
    private readonly suppliers: SupplierCandidate[] = DEFAULT_SUPPLIERS,
  ) {}

  async search(intent: ProductSearchIntent): Promise<ProductSearchResult> {
    const candidates = this.candidates
      .filter((candidate) => hasQueryMatch(candidate, intent))
      .filter((candidate) => isWithinBudget(candidate, intent))
      .slice(0, DEFAULT_MOCK_LIMIT);

    const sellerNames = new Set(
      candidates.map((candidate) => candidate.sellerName).filter(Boolean),
    );
    const suppliers = this.suppliers.filter((supplier) =>
      sellerNames.has(supplier.sellerName),
    );

    return {
      candidates,
      suppliers,
      warnings: [],
      missingData: candidates.length === 0 ? ["NO_MATCHING_PRODUCTS"] : [],
      providerMeta: { provider: this.provider, sandbox: true },
    };
  }
}
