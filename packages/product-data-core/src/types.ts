export type ProductDataProvider =
  | "mock"
  | "ebay"
  | "mercadolibre"
  | "serpapi"
  | "manual";

export type BuyerUrgency = "LOW" | "MEDIUM" | "HIGH";

export type BuyerRiskTolerance = "LOW" | "MEDIUM" | "HIGH";

export type BuyerScenarioType =
  | "PRICE_CHASER"
  | "RISK_AVERSE"
  | "QUALITY_FIRST"
  | "URGENT_BUYER"
  | "LOW_BUDGET"
  | "NO_AUTHORITY"
  | "RESELLER"
  | "FACTORY_PROCUREMENT"
  | "STATUS_BRAND_SENSITIVE"
  | "FREE_ADVICE";

export type ProductRecommendationType =
  | "BEST_MATCH"
  | "CHEAP_BUT_RISKY"
  | "REQUEST_MORE_PROOF"
  | "WAIT"
  | "NEGOTIATE"
  | "AVOID";

export type ProductEvidenceQuality =
  | "L1_API_LISTING"
  | "L2_PRICE_LISTING"
  | "L3_SELLER_IDENTIFIED"
  | "L4_VERIFIED_SUPPLIER"
  | "L5_PURCHASE_OUTCOME";

export type ProductMissingProofFlag =
  | "NEEDS_PRICE"
  | "NEEDS_CURRENCY"
  | "NEEDS_SUPPLIER_IDENTITY"
  | "NEEDS_SELLER_COUNTRY"
  | "NEEDS_ITEM_LOCATION"
  | "NEEDS_SHIPPING_COST"
  | "NEEDS_DELIVERY_ESTIMATE"
  | "NEEDS_CONDITION"
  | "NEEDS_RATING"
  | "NEEDS_WARRANTY"
  | "NEEDS_VERIFICATION";

export type ProductSearchIntent = {
  query: string;
  category?: string;
  targetCountry?: string;
  sourceCountry?: string;
  currency?: string;
  budgetMin?: number;
  budgetMax?: number;
  quantity?: number;
  unit?: string;
  requiredSpecs: string[];
  avoidSpecs: string[];
  buyerUseCase?: string;
  urgency: BuyerUrgency;
  riskTolerance: BuyerRiskTolerance;
};

export type ProductCandidate = {
  provider: ProductDataProvider;
  externalId: string;
  title: string;
  url?: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  unit?: string;
  quantity?: number;
  condition?: string;
  sellerName?: string;
  sellerId?: string;
  sellerCountry?: string;
  itemLocation?: string;
  shippingCost?: number;
  deliveryEstimate?: string;
  rating?: number;
  reviewCount?: number;
  availability?: string;
  raw: unknown;
};

export type SupplierCandidate = {
  provider: ProductDataProvider;
  sellerName: string;
  sellerId?: string;
  country?: string;
  profileUrl?: string;
  reputation?: string;
  listingCount?: number;
  verificationLevel?: string;
  raw: unknown;
};

export type ProductSearchResult = {
  candidates: ProductCandidate[];
  suppliers: SupplierCandidate[];
  warnings: string[];
  missingData: string[];
  providerMeta: Record<string, unknown>;
};

export interface ProductDataAdapter {
  readonly provider: ProductDataProvider;
  search(intent: ProductSearchIntent): Promise<ProductSearchResult>;
}

export type ProductEvidence = {
  sourceProvider: ProductDataProvider;
  productTitle: string;
  price?: number;
  currency?: string;
  sellerName?: string;
  sellerCountry?: string;
  itemLocation?: string;
  shippingCost?: number;
  deliveryEstimate?: string;
  condition?: string;
  url?: string;
  evidenceQuality: ProductEvidenceQuality;
  missingProofFlags: ProductMissingProofFlag[];
  raw: unknown;
};

export type ProductScenarioScore = {
  priceFit: number;
  specFit: number;
  supplierTrust: number;
  locationLogisticsFit: number;
  deliveryRisk: number;
  evidenceQuality: number;
  missingProof: number;
  buyerRiskToleranceFit: number;
  total: number;
};

export type ProductRecommendation = {
  candidate: ProductCandidate;
  recommendation: ProductRecommendationType;
  score: ProductScenarioScore;
  why: string[];
  missingProof: ProductMissingProofFlag[];
  questionsToAskSupplier: string[];
  whatCouldGoWrong: string[];
  buyerTypeFit: BuyerScenarioType[];
};

export type ProductScenarioSimulation = {
  scenarioTypes: BuyerScenarioType[];
  recommendations: ProductRecommendation[];
  warnings: string[];
  missingData: string[];
};
