import { EVIDENCE_QUALITY_SCORE } from "./constants";
import type {
  ProductCandidate,
  ProductEvidence,
  ProductEvidenceQuality,
  ProductMissingProofFlag,
  SupplierCandidate,
} from "./types";

function hasVerifiedSupplier(supplier?: SupplierCandidate) {
  return Boolean(
    supplier?.verificationLevel &&
    /verified|gold|official|trusted/i.test(supplier.verificationLevel),
  );
}

export function deriveProductEvidenceQuality(
  candidate: ProductCandidate,
  supplier?: SupplierCandidate,
): ProductEvidenceQuality {
  if (hasVerifiedSupplier(supplier)) return "L4_VERIFIED_SUPPLIER";
  if (candidate.sellerName && (candidate.sellerId || candidate.rating)) {
    return "L3_SELLER_IDENTIFIED";
  }
  if (candidate.price !== undefined && candidate.currency) {
    return "L2_PRICE_LISTING";
  }
  return "L1_API_LISTING";
}

export function getProductMissingProofFlags(
  candidate: ProductCandidate,
  supplier?: SupplierCandidate,
): ProductMissingProofFlag[] {
  const flags: ProductMissingProofFlag[] = [];
  if (candidate.price === undefined) flags.push("NEEDS_PRICE");
  if (!candidate.currency) flags.push("NEEDS_CURRENCY");
  if (!candidate.sellerName && !supplier?.sellerName) {
    flags.push("NEEDS_SUPPLIER_IDENTITY");
  }
  if (!candidate.sellerCountry && !supplier?.country) {
    flags.push("NEEDS_SELLER_COUNTRY");
  }
  if (!candidate.itemLocation) flags.push("NEEDS_ITEM_LOCATION");
  if (candidate.shippingCost === undefined) flags.push("NEEDS_SHIPPING_COST");
  if (!candidate.deliveryEstimate) flags.push("NEEDS_DELIVERY_ESTIMATE");
  if (!candidate.condition) flags.push("NEEDS_CONDITION");
  if (candidate.rating === undefined) flags.push("NEEDS_RATING");
  if (!hasVerifiedSupplier(supplier)) flags.push("NEEDS_VERIFICATION");
  return flags;
}

export function productCandidateToEvidence(
  candidate: ProductCandidate,
  supplier?: SupplierCandidate,
): ProductEvidence {
  return {
    sourceProvider: candidate.provider,
    productTitle: candidate.title,
    price: candidate.price,
    currency: candidate.currency,
    sellerName: candidate.sellerName ?? supplier?.sellerName,
    sellerCountry: candidate.sellerCountry ?? supplier?.country,
    itemLocation: candidate.itemLocation,
    shippingCost: candidate.shippingCost,
    deliveryEstimate: candidate.deliveryEstimate,
    condition: candidate.condition,
    url: candidate.url,
    evidenceQuality: deriveProductEvidenceQuality(candidate, supplier),
    missingProofFlags: getProductMissingProofFlags(candidate, supplier),
    raw: candidate.raw,
  };
}

export function scoreProductEvidenceQuality(
  evidenceQuality: ProductEvidenceQuality,
) {
  return EVIDENCE_QUALITY_SCORE[evidenceQuality];
}
