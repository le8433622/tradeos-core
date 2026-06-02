import type {
  ProductCandidate,
  ProductEvidence,
  ProductDataProvider,
} from "./types";
import { productCandidateToEvidence } from "./evidence";

export type EbayOrderConfig = {
  oauthToken: string;
  clientId: string;
  sandbox?: boolean;
};

export type OrderItem = {
  itemId: string;
  title: string;
  price: number;
  currency: string;
  quantity: number;
  purchasedAt: Date;
  sellerName: string;
  sellerUsername?: string;
  orderId: string;
  orderStatus: string;
};

export type OrderSearchResult = {
  orders: OrderItem[];
  total: number;
};

export class EbayOrderClient {
  readonly provider = "ebay" as ProductDataProvider;
  private config: EbayOrderConfig;

  constructor(config: EbayOrderConfig) {
    this.config = {
      sandbox: false,
      ...config,
    };
  }

  private get baseUrl() {
    return this.config.sandbox
      ? "https://api.sandbox.ebay.com"
      : "https://api.ebay.com";
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.config.oauthToken}`,
      "Content-Type": "application/json",
      "X-EBAY-C-MARKETPLACE-ID": this.config.sandbox ? "EBAY_US" : "EBAY_US",
    };
  }

  async getOrders(
    limit = 50,
    offset = 0,
    filter?: string,
  ): Promise<OrderSearchResult> {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      sort: "ORDER_CREATION_DATE_DESC",
    });
    if (filter) params.set("filter", filter);

    const url = `${this.baseUrl}/sell/fulfillment/v1/order?${params.toString()}`;
    const res = await fetch(url, {
      headers: this.headers,
      cache: "no-store",
    });

    if (res.status === 401) {
      throw new Error("EBAY_ORDER_TOKEN_EXPIRED");
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `eBay Order API error (${res.status}): ${text.slice(0, 200)}`,
      );
    }

    const data = await res.json();
    const orders: OrderItem[] = (data.orders ?? []).flatMap((order: any) => {
      const lineItems = order.lineItems ?? [];
      return lineItems.map((item: any) => ({
        itemId: item.lineItemId ?? item.legacyItemId ?? "",
        title: item.title ?? "Unknown",
        price: parseFloat(item.soldPrice?.value ?? "0"),
        currency: item.soldPrice?.currency ?? "USD",
        quantity: item.quantity ?? 1,
        purchasedAt: new Date(
          order.purchaseOrderCreationDate ?? order.orderCreationDate,
        ),
        sellerName: item.seller ?? "",
        sellerUsername: item.seller ?? undefined,
        orderId: order.orderId,
        orderStatus:
          order.orderFulfillmentStatus ?? order.orderPaymentStatus ?? "UNKNOWN",
      }));
    });

    return { orders, total: data.total ?? orders.length };
  }

  async getPurchasesForProduct(
    query: string,
    maxOrders = 20,
  ): Promise<OrderItem[]> {
    const result = await this.getOrders(maxOrders);
    const lower = query.toLowerCase();
    return result.orders.filter(
      (o) =>
        o.title.toLowerCase().includes(lower) ||
        o.orderId.toLowerCase().includes(lower),
    );
  }

  orderItemToEvidence(item: OrderItem): ProductEvidence {
    const candidate: ProductCandidate = {
      provider: "ebay" as ProductDataProvider,
      externalId: item.itemId,
      title: item.title,
      price: item.price,
      currency: item.currency,
      sellerName: item.sellerName,
      url: undefined,
      rating: undefined,
      reviewCount: undefined,
      shippingCost: undefined,
      condition: "PURCHASED",
      itemLocation: undefined,
      deliveryEstimate: undefined,
      raw: {
        orderId: item.orderId,
        purchasedAt: item.purchasedAt,
        quantity: item.quantity,
      },
    };
    return productCandidateToEvidence(candidate, {
      provider: "ebay" as ProductDataProvider,
      sellerName: item.sellerName,
      verificationLevel: "verified_purchase",
      raw: { orderId: item.orderId },
    });
  }
}
