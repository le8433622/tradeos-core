import type {
  ProductCandidate,
  ProductDataAdapter,
  ProductSearchIntent,
  ProductSearchResult,
  SupplierCandidate,
} from "./types";

export type EbayAdapterConfig = {
  oauthToken?: string;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
  marketplaceId?: string;
  sandbox?: boolean;
};

type EbayPrice = { value?: string; currency?: string };
type EbaySeller = {
  username?: string;
  feedbackPercentage?: string;
  feedbackScore?: number;
};
type EbayShippingOption = {
  shippingCost?: EbayPrice;
  estimatedDelivery?: string;
};
type EbayItemLocation = { country?: string; postalCode?: string };
type EbayItemSummary = {
  itemId?: string;
  title?: string;
  price?: EbayPrice;
  image?: { imageUrl?: string };
  itemWebUrl?: string;
  seller?: EbaySeller;
  itemLocation?: EbayItemLocation;
  condition?: string;
  shippingOptions?: EbayShippingOption[];
};

type EbaySearchResponse = {
  itemSummaries?: EbayItemSummary[];
  total?: number;
  warnings?: string[];
};

function parseEbayPrice(price?: EbayPrice): number | undefined {
  if (!price?.value) return undefined;
  const parsed = parseFloat(price.value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeEbayRating(seller?: EbaySeller): number | undefined {
  if (!seller?.feedbackPercentage) return undefined;
  const pct = parseFloat(seller.feedbackPercentage);
  if (!Number.isFinite(pct)) return undefined;
  return Math.min(Math.round((pct / 100) * 5 * 100) / 100, 5);
}

function getEbayCondition(item: EbayItemSummary): string | undefined {
  if (typeof item.condition === "string") return item.condition;
  return undefined;
}

function buildEbayItemLocation(item: EbayItemSummary): string | undefined {
  if (!item.itemLocation) return undefined;
  const parts: string[] = [];
  if (item.itemLocation.postalCode) parts.push(item.itemLocation.postalCode);
  if (item.itemLocation.country) parts.push(item.itemLocation.country);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

export function normalizeEbayItemSummary(
  item: EbayItemSummary,
): ProductCandidate {
  return {
    provider: "ebay",
    externalId: item.itemId ?? "",
    title: item.title ?? "",
    url: item.itemWebUrl,
    imageUrl: item.image?.imageUrl,
    price: parseEbayPrice(item.price),
    currency: item.price?.currency,
    condition: getEbayCondition(item),
    sellerName: item.seller?.username,
    sellerId: item.seller?.username,
    sellerCountry: item.itemLocation?.country,
    itemLocation: buildEbayItemLocation(item),
    shippingCost: item.shippingOptions?.[0]?.shippingCost
      ? parseEbayPrice(item.shippingOptions[0].shippingCost)
      : undefined,
    deliveryEstimate: item.shippingOptions?.[0]?.estimatedDelivery,
    rating: normalizeEbayRating(item.seller),
    reviewCount: item.seller?.feedbackScore,
    raw: item,
  };
}

export function normalizeEbayItemSummaries(
  items: EbayItemSummary[],
): ProductCandidate[] {
  return items.map(normalizeEbayItemSummary);
}

function extractSuppliers(candidates: ProductCandidate[]): SupplierCandidate[] {
  const seen = new Set<string>();
  return candidates
    .filter((c) => c.sellerName)
    .filter((c) => {
      if (seen.has(c.sellerName!)) return false;
      seen.add(c.sellerName!);
      return true;
    })
    .map(
      (c): SupplierCandidate => ({
        provider: "ebay",
        sellerName: c.sellerName!,
        sellerId: c.sellerId,
        country: c.sellerCountry,
        raw: c.raw,
      }),
    );
}

const DEFAULT_MARKETPLACE_ID = "EBAY_US";
const DEFAULT_SCOPE = "https://api.ebay.com/oauth/api_scope";

export class EbayBrowseAdapter implements ProductDataAdapter {
  readonly provider = "ebay" as const;
  private config: EbayAdapterConfig;
  private cachedToken?: string;

  constructor(config: EbayAdapterConfig = {}) {
    this.config = config;
    this.cachedToken = config.oauthToken;
  }

  private async refreshToken(): Promise<string | null> {
    const { clientId, clientSecret, scope, sandbox } = this.config;
    if (!clientId || !clientSecret) return null;

    const tokenUrl = sandbox
      ? "https://api.sandbox.ebay.com/identity/v1/oauth2/token"
      : "https://api.ebay.com/identity/v1/oauth2/token";

    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64",
    );

    try {
      const res = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          scope: scope ?? DEFAULT_SCOPE,
        }),
      });

      if (!res.ok) return null;

      const data = (await res.json()) as { access_token?: string };
      if (!data.access_token) return null;

      this.cachedToken = data.access_token;
      return data.access_token;
    } catch {
      return null;
    }
  }

  async search(intent: ProductSearchIntent): Promise<ProductSearchResult> {
    if (!this.cachedToken && !this.config.oauthToken) {
      return {
        candidates: [],
        suppliers: [],
        warnings: [
          "CONFIG_REQUIRED: eBay OAuth token not configured. " +
            "Set EBAY_OAUTH_TOKEN or provide clientId/clientSecret for auto-refresh.",
        ],
        missingData: ["CONFIG_REQUIRED"],
        providerMeta: {
          provider: "ebay",
          configMissing: true,
        },
      };
    }

    const baseUrl = this.config.sandbox
      ? "https://api.sandbox.ebay.com/buy/browse/v1"
      : "https://api.ebay.com/buy/browse/v1";

    const params = new URLSearchParams({
      q: intent.query,
      limit: "50",
    });
    if (intent.budgetMax) {
      params.set("price_max", String(intent.budgetMax));
    }

    const doSearch = async (
      token: string,
      isRetry: boolean,
    ): Promise<ProductSearchResult> => {
      try {
        const response = await fetch(
          `${baseUrl}/item_summary/search?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "X-EBAY-C-MARKETPLACE-ID":
                this.config.marketplaceId ?? DEFAULT_MARKETPLACE_ID,
              "Content-Type": "application/json",
            },
          },
        );

        if (response.status === 401 && !isRetry) {
          const newToken = await this.refreshToken();
          if (newToken) {
            return doSearch(newToken, true);
          }
        }

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          return {
            candidates: [],
            suppliers: [],
            warnings: [
              `EBAY_API_ERROR: ${response.status} ${response.statusText}${body ? ` — ${body}` : ""}`,
            ],
            missingData: ["EBAY_API_ERROR"],
            providerMeta: {
              provider: "ebay",
              httpStatus: response.status,
            },
          };
        }

        const data = (await response.json()) as EbaySearchResponse;
        const items = data.itemSummaries ?? [];
        const candidates = normalizeEbayItemSummaries(items);
        const suppliers = extractSuppliers(candidates);

        return {
          candidates,
          suppliers,
          warnings: data.warnings ?? [],
          missingData: candidates.length === 0 ? ["NO_RESULTS"] : [],
          providerMeta: { provider: "ebay", total: data.total },
        };
      } catch (error) {
        return {
          candidates: [],
          suppliers: [],
          warnings: [
            `EBAY_NETWORK_ERROR: ${error instanceof Error ? error.message : String(error)}`,
          ],
          missingData: ["EBAY_NETWORK_ERROR"],
          providerMeta: { provider: "ebay", error: String(error) },
        };
      }
    };

    const token = this.cachedToken ?? this.config.oauthToken!;
    return doSearch(token, false);
  }
}
