export type EvidenceSourceType =
  | "MANUAL_TEXT"
  | "PRODUCT_LINK_TEXT"
  | "QUOTE_TEXT"
  | "INVOICE_TEXT"
  | "CHAT_TEXT"
  | "MARKET_BENCHMARK_TEXT"
  | "API_RESPONSE";

export type MissingProofFlag =
  | "NEEDS_CURRENT_PRICE"
  | "NEEDS_ORIGIN_PRICE"
  | "NEEDS_LANDED_COST"
  | "NEEDS_SUPPLIER_IDENTITY"
  | "NEEDS_DELIVERY_TERMS"
  | "NEEDS_PAYMENT_TERMS"
  | "NEEDS_QUALITY_PROOF"
  | "NEEDS_MARKET_BENCHMARK";

export type EvidenceQualityLevel =
  | "L0_UNVERIFIED_CLAIM"
  | "L1_SCREENSHOT_OR_LINK_ONLY"
  | "L2_BASIC_QUOTE_OR_INVOICE"
  | "L3_QUOTE_WITH_SUPPLIER_IDENTITY_DATE_TERMS"
  | "L4_PAID_ORDER_OR_DELIVERY_PROOF"
  | "L5_REPEATED_OUTCOME_PROOF";

export type Confidence = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export type PainFlag =
  | "CURRENT_PRICE_UNKNOWN"
  | "ORIGIN_PRICE_UNKNOWN"
  | "LANDED_COST_UNKNOWN"
  | "SUPPLIER_PROOF_WEAK"
  | "PRICE_GAP_POSSIBLE"
  | "MARKET_BENCHMARK_MISSING"
  | "QUALITY_PROOF_MISSING"
  | "DELIVERY_TERMS_MISSING"
  | "PAYMENT_TERMS_MISSING"
  | "NO_DECISION_AUTHORITY"
  | "EVIDENCE_WEAK";

export type DependencyFlag =
  | "SINGLE_SUPPLIER_DEPENDENCY"
  | "PLATFORM_DEPENDENCY"
  | "BROKER_DEPENDENCY"
  | "SUPPLIER_INFORMATION_CONTROL"
  | "ORIGIN_VALUE_BLINDNESS"
  | "OPERATOR_INTERPRETATION_DEPENDENCY";

export type PainDetectorResult = {
  painFlags: PainFlag[];
  dependencyFlags: DependencyFlag[];
  suggestedReason: string;
  suggestedNextStep:
    | "CREATE_CASE_DRAFT"
    | "NEEDS_MORE_EVIDENCE"
    | "NEEDS_SUPPLIER_IDENTITY"
    | "REQUEST_MORE_EVIDENCE"
    | "WAIT";
};

export type ParsedEvidence = {
  sourceType: EvidenceSourceType;
  productName?: string;
  supplierName?: string;
  price?: number;
  currency?: string;
  unit?: string;
  quantity?: number;
  originCountry?: string;
  landedCost?: number;
  paymentTerms?: string;
  deliveryTerms?: string;
  evidenceQuality: EvidenceQualityLevel;
  evidenceQualityScore: number;
  missingProofFlags: MissingProofFlag[];
  confidence: Record<string, Confidence>;
  rawEvidenceRef: string;
};

export type EvidenceInput = {
  text: string;
  sourceType: EvidenceSourceType;
  reference: string;
};

export interface EvidenceAdapter<TInput = EvidenceInput> {
  readonly sourceType: EvidenceSourceType;
  canHandle(input: TInput): boolean;
  parse(input: TInput): ParsedEvidence;
}
