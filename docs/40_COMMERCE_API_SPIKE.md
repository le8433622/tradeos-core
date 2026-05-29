# #130 — Commerce API Spike

> Test programmable commerce/trade APIs before building TradeOS automation.
> No full integrations. No scraping. No marketplace launch. No automatic supplier contact. No production buyer secrets.

**Date:** 2026-05-29
**Status:** Complete — 15 API candidates evaluated, 3 tested with real calls.

---

## Corrected Direction (Post-Spike)

TradeOS runs on **Vercel + Supabase + Cloudflare + GitHub**, not AWS. Hardcoding AWS Textract as P0 would create a new platform dependency — exactly the problem TradeOS exists to solve.

**Core principle:** TradeOS resolves trade dependency. Its own infrastructure must not create new platform dependency.

### What changed

| Before                     | After                                       |
| -------------------------- | ------------------------------------------- |
| AWS Textract = P0 default  | Provider-neutral Evidence Adapter Interface |
| Hardcode Document AI first | Manual/Paste/Text evidence intake first     |
| Platform-first integration | Interface-first with pluggable providers    |
| AWS as core                | AWS as optional provider (swap in later)    |

### Implementation order

1. **P0** — Evidence Adapter Interface (abstract, provider-neutral)
2. **P0** — Manual/Paste/Text evidence intake (first real adapter)
3. **P0** — Currency normalization (ExchangeRate-API, open.er-api.com: free, no key)
4. **P1** — Document extraction provider spike (evaluate AWS vs Google vs local)
5. **P1** — Email/file intake (Mailgun routes → adapter pipe)
6. **P2** — Accounting data connectors (Stripe, QBO, Xero)
7. **P2** — B2B product search (Made-in-China.com)
8. **P2** — Tariff data (SimplyDuty, Zonos, free gov APIs after adapter)

### What NOT to do yet

- ❌ Hardcode AWS Textract integration
- ❌ Hardcode Google Document AI integration
- ❌ Build Mailgun email pipe before the adapter interface exists
- ❌ Build Made-in-China.com integration before the adapter exists

---

## Fit Score

| Score | Meaning                                       |
| ----- | --------------------------------------------- |
| 0     | Not useful                                    |
| 1     | Docs only / too restricted                    |
| 2     | Enrichment only                               |
| 3     | Usable for evidence intake                    |
| 4     | Usable for draft case creation                |
| 5     | Strong enough for semi-automated TradeOS flow |

---

## 1. Product Catalog APIs

### Made-in-China.com Open API

| Field                      | Value                                                                                                                                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider                   | Focus Technology (Made-in-China.com)                                                                                                                                                                              |
| Official docs              | https://open.made-in-china.com/                                                                                                                                                                                   |
| Sandbox available          | Yes                                                                                                                                                                                                               |
| API key required           | Yes                                                                                                                                                                                                               |
| OAuth required             | No                                                                                                                                                                                                                |
| Approval required          | Yes (application)                                                                                                                                                                                                 |
| Commercial use allowed     | Yes                                                                                                                                                                                                               |
| Pricing model              | Free for basic access                                                                                                                                                                                             |
| Rate limits                | Not published                                                                                                                                                                                                     |
| Available regions          | Global (Chinese B2B suppliers)                                                                                                                                                                                    |
| Data returned              | Product search, supplier profiles, product details, company info                                                                                                                                                  |
| Missing data               | No delivery terms, no payment terms, no origin country breakdown                                                                                                                                                  |
| Can get price              | Yes                                                                                                                                                                                                               |
| Can get supplier identity  | Yes                                                                                                                                                                                                               |
| Can get origin country     | Partial (CN-based)                                                                                                                                                                                                |
| Can get delivery terms     | No                                                                                                                                                                                                                |
| Can get payment terms      | No                                                                                                                                                                                                                |
| Can get reviews/reputation | Partial (company profile)                                                                                                                                                                                         |
| Can get unit/pack size     | Partial                                                                                                                                                                                                           |
| Can get MOQ                | Yes                                                                                                                                                                                                               |
| Can get shipping estimate  | No                                                                                                                                                                                                                |
| Can get tariff/tax         | No                                                                                                                                                                                                                |
| **Fit for TradeOS**        | **4/5**                                                                                                                                                                                                           |
| Risk level                 | Low                                                                                                                                                                                                               |
| Notes                      | **Only major B2B platform with a genuine public product+supplier search API.** Can power draft case creation. Supplier identity + MOQ + price available. Missing logistics/tariff data must come from other APIs. |

### Alibaba.com / GlobalSources / ThomasNet / TradeIndia

| API                | Status                                       | Fit     |
| ------------------ | -------------------------------------------- | ------- |
| Alibaba OpenAPI    | Seller-side only (ERP sync, inquiry receipt) | **1/5** |
| GlobalSources.com  | No public product search API                 | **1/5** |
| ThomasNet API      | Legacy, no modern REST API                   | **1/5** |
| TradeIndia.com API | No public API                                | **1/5** |

**Critical finding:** No other major B2B platform offers a programmable product search API. Alibaba's API is for sellers managing their listings, not for buyers searching products. GlobalSources and ThomasNet have no public APIs.

**Recommendation:** Use Made-in-China.com as the sole B2B product catalog source. All other B2B platforms require scraping (which is out of scope for this spike).

---

## 2. Marketplace / Search APIs

### Amazon Product Advertising API (PAAPI5)

| Field                  | Value                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| Provider               | Amazon                                                                                         |
| Official docs          | https://developer.amazon.com/docs/paapi5/                                                      |
| Sandbox available      | Yes                                                                                            |
| API key required       | Yes                                                                                            |
| OAuth required         | No                                                                                             |
| Approval required      | Yes                                                                                            |
| Commercial use allowed | No (requires Associate relationship)                                                           |
| Pricing model          | Free (with Associate account)                                                                  |
| Rate limits            | 1 req/sec per Associate ID                                                                     |
| Available regions      | Global (Amazon marketplaces)                                                                   |
| Data returned          | Product search, pricing, offers, reviews, ratings, categories                                  |
| Missing data           | B2C only — no supplier identity, no MOQ, no bulk pricing, no delivery terms                    |
| **Fit for TradeOS**    | **1/5**                                                                                        |
| Risk level             | High                                                                                           |
| Notes                  | Prohibits independent commercial use. B2C data not useful for trade sourcing. Not recommended. |

### Google Merchant API / Walmart Marketplace

Both are merchant self-service only — cannot browse others' products. **1/5**.

---

## 3. Supplier / Company Profile APIs

### Dun & Bradstreet Direct API

| Field                      | Value                                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider                   | Dun & Bradstreet                                                                                                                            |
| Official docs              | https://developer.dnb.com/                                                                                                                  |
| Sandbox available          | Yes                                                                                                                                         |
| API key required           | Yes                                                                                                                                         |
| OAuth required             | Yes                                                                                                                                         |
| Approval required          | Yes (sales-negotiated)                                                                                                                      |
| Commercial use allowed     | Yes                                                                                                                                         |
| Pricing model              | Subscription (\$5k-\$50k+/yr)                                                                                                               |
| Rate limits                | Token-based 24h expiry, quota per plan                                                                                                      |
| Available regions          | Global                                                                                                                                      |
| Data returned              | Company profiles, D-U-N-S number, firmographics, financials, hierarchy, risk scores, compliance data                                        |
| Missing data               | No pricing, no trade data, no shipment data, no delivery terms                                                                              |
| Can get supplier identity  | Yes                                                                                                                                         |
| Can get origin country     | Yes                                                                                                                                         |
| Can get reviews/reputation | Yes (risk scores)                                                                                                                           |
| **Fit for TradeOS**        | **3/5**                                                                                                                                     |
| Risk level                 | Low                                                                                                                                         |
| Notes                      | Best-in-class for supplier identity and credit risk. Strong for KYC/supplier onboarding. \$5k+/yr minimum. Use for supplier trust evidence. |

### OpenCorporates API

| Field                     | Value                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Provider                  | OpenCorporates                                                                                                                                   |
| Official docs             | https://api.opencorporates.com/documentation/API-Reference                                                                                       |
| Sandbox available         | Yes                                                                                                                                              |
| API key required          | Yes (paid)                                                                                                                                       |
| OAuth required            | No                                                                                                                                               |
| Approval required         | No                                                                                                                                               |
| Commercial use allowed    | Yes                                                                                                                                              |
| Pricing model             | Freemium (Free: 50/day; Essentials: £2,250/yr; Basic: £12,000/yr)                                                                                |
| Rate limits               | Free: 50/day, 200/month; Paid: up to 500/day                                                                                                     |
| Available regions         | Global (140+ jurisdictions)                                                                                                                      |
| Data returned             | Legal name, registration number, address, officers, filings                                                                                      |
| Missing data              | No trade data, no pricing, no financials                                                                                                         |
| Can get supplier identity | Yes                                                                                                                                              |
| Can get origin country    | Yes                                                                                                                                              |
| **Fit for TradeOS**       | **3/5**                                                                                                                                          |
| Risk level                | Low                                                                                                                                              |
| Notes                     | Best for legal entity verification. Free tier too limited for production (50/day). Essentials tier (£2,250/yr) is reasonable for KYC enrichment. |

### ZoomInfo API

**Fit: 2/5.** Enterprise-only (\$15k+/yr). No trade-specific data. Strong for B2B sales intelligence but not for trade evidence.

### LinkedIn Sales Navigator API / Crunchbase

**Fit: 1/5** each. LinkedIn SNAP program closed to new partners. Crunchbase is VC-focused, irrelevant to trade.

---

## 4. Price Benchmark APIs

### ImportGenius API

| Field                     | Value                                                                                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider                  | ImportGenius (US Customs data reseller)                                                                                                                                      |
| Official docs             | https://www.importgenius.com/trade-api                                                                                                                                       |
| Sandbox available         | No                                                                                                                                                                           |
| API key required          | Yes                                                                                                                                                                          |
| Approval required         | Yes                                                                                                                                                                          |
| Commercial use allowed    | Yes                                                                                                                                                                          |
| Pricing model             | Subscription (\$229-\$1,999/mo)                                                                                                                                              |
| Available regions         | 25+ countries (US, VN, CN, MX, IN, EU, LATAM)                                                                                                                                |
| Data returned             | Shipment manifests — buyer/seller names, HS codes, product descriptions, quantities, weights, ports                                                                          |
| Missing data              | No unit prices in many records, no contract terms, no MOQ                                                                                                                    |
| Can get price             | Partial (value/quantity ratio)                                                                                                                                               |
| Can get supplier identity | Yes                                                                                                                                                                          |
| Can get origin country    | Yes                                                                                                                                                                          |
| **Fit for TradeOS**       | **4/5**                                                                                                                                                                      |
| Risk level                | Low                                                                                                                                                                          |
| Notes                     | **Strongest for supplier identity from actual manifests.** US data daily, non-US weekly. Missing unit prices reduce price benchmarking power. Good for trade lane discovery. |

### Panjiva API (S&P Global)

| Field                     | Value                                                                                                                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider                  | S&P Global Market Intelligence                                                                                                                                                                     |
| Official docs             | https://panjiva.com/api-guide/                                                                                                                                                                     |
| Sandbox available         | Yes                                                                                                                                                                                                |
| API key required          | Yes                                                                                                                                                                                                |
| OAuth required            | Yes                                                                                                                                                                                                |
| Approval required         | Yes (sales-negotiated)                                                                                                                                                                             |
| Commercial use allowed    | Yes                                                                                                                                                                                                |
| Pricing model             | Subscription (\$25k+/yr)                                                                                                                                                                           |
| Available regions         | Global (15+ datasets, 195 countries, 1B+ transactions)                                                                                                                                             |
| Data returned             | Supply chain graph — buyer-supplier relationships, shipments, HS codes, TEU volumes                                                                                                                |
| Missing data              | No unit prices, no contract terms                                                                                                                                                                  |
| Can get supplier identity | Yes                                                                                                                                                                                                |
| Can get origin country    | Yes                                                                                                                                                                                                |
| **Fit for TradeOS**       | **4/5**                                                                                                                                                                                            |
| Risk level                | Medium                                                                                                                                                                                             |
| Notes                     | **Strongest commercial trade data API.** 8M+ companies in supply chain graph. No self-serve (sales-negotiated, \$25k+/yr). Excellent for supplier network discovery. Delayed data — not real-time. |

### UN Comtrade API

| Field                  | Value                                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Provider               | United Nations Statistics Division                                                                                                        |
| Official docs          | https://uncomtrade.org/docs/                                                                                                              |
| Sandbox available      | Yes                                                                                                                                       |
| API key required       | Yes (free tier)                                                                                                                           |
| Commercial use allowed | Yes                                                                                                                                       |
| Pricing model          | Freemium (Free: 500 calls/day; Premium: \$2k-\$12k/yr)                                                                                    |
| Data returned          | Official trade statistics — import/export values, quantities, HS codes, trading partners                                                  |
| Missing data           | No company-level data (aggregated), 2-3 month lag                                                                                         |
| Can get price          | Yes (unit value, not market price)                                                                                                        |
| Can get origin country | Yes                                                                                                                                       |
| **Fit for TradeOS**    | **3/5**                                                                                                                                   |
| Risk level             | Low                                                                                                                                       |
| Notes                  | Best for country-level trade flow benchmarking. Free tier usable. Delayed data limits real-time use. Good macro evidence for trade cases. |

### OEC (Observatory of Economic Complexity) API

| Field                  | Value                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Provider               | OEC / Datawheel                                                                                                                                              |
| Official docs          | https://oec.world/en/resources/api                                                                                                                           |
| Sandbox available      | Yes                                                                                                                                                          |
| API key required       | No (free tier)                                                                                                                                               |
| Commercial use allowed | Yes                                                                                                                                                          |
| Pricing model          | Freemium (Pro: \$299/mo; Premium: \$1,999/mo)                                                                                                                |
| Data returned          | Trade flows by HS code, economic complexity, export potential, US customs port data                                                                          |
| Missing data           | No invoice-level pricing, no payment terms                                                                                                                   |
| **Fit for TradeOS**    | **4/5**                                                                                                                                                      |
| Risk level             | Medium                                                                                                                                                       |
| Notes                  | Strong trade intelligence. Company explorer (Premium) can provide supplier identity. Export potential scores unique. BotMarket allows AI-agent query access. |

---

## 5. Shipping / Logistics APIs

### Shippo API

| Field                     | Value                                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider                  | Shippo                                                                                                                                            |
| Official docs             | https://docs.goshippo.com/                                                                                                                        |
| Sandbox available         | Yes                                                                                                                                               |
| API key required          | Yes                                                                                                                                               |
| Approval required         | No                                                                                                                                                |
| Commercial use allowed    | Yes                                                                                                                                               |
| Pricing model             | Freemium (Free: 30 labels/mo; then \$0.07/label)                                                                                                  |
| Rate limits               | 500/min (POST), 4000/min (GET)                                                                                                                    |
| Available regions         | Global (40+ carriers: USPS, UPS, FedEx, DHL)                                                                                                      |
| Data returned             | Real-time shipping rates across carriers, labels, tracking, address validation, customs docs                                                      |
| Can get price             | Yes (shipping cost)                                                                                                                               |
| Can get delivery terms    | Yes                                                                                                                                               |
| Can get shipping estimate | Yes                                                                                                                                               |
| **Fit for TradeOS**       | **3/5**                                                                                                                                           |
| Risk level                | Low                                                                                                                                               |
| Notes                     | Excellent for shipping rate estimates and label generation. Free tier usable. No trade data or supplier info. Good for logistics evidence intake. |

### EasyPost API

| Field                  | Value                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Provider               | EasyPost                                                                                                         |
| Official docs          | https://docs.easypost.com/                                                                                       |
| Sandbox available      | Yes                                                                                                              |
| API key required       | Yes                                                                                                              |
| Approval required      | No                                                                                                               |
| Commercial use allowed | Yes                                                                                                              |
| Pricing model          | Freemium (Free: 3K labels/mo; then \$0.08/label)                                                                 |
| Available regions      | Global (100+ carriers)                                                                                           |
| Data returned          | Multi-carrier rates, labels, tracking, address verification                                                      |
| **Fit for TradeOS**    | **3/5**                                                                                                          |
| Risk level             | Low                                                                                                              |
| Notes                  | Similar to Shippo. Free tier: 36K labels/yr. SmartRate: \$0.03/call. Good for shipping estimate. No tariff data. |

---

## 6. Customs / Tariff / Import Data APIs

### SimplyDuty API

| Field                  | Value                                                                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Provider               | SimplyDuty                                                                                                                               |
| Official docs          | https://www.simplyduty.com/api-tools/                                                                                                    |
| Sandbox available      | Yes                                                                                                                                      |
| API key required       | Yes                                                                                                                                      |
| Approval required      | No                                                                                                                                       |
| Commercial use allowed | Yes                                                                                                                                      |
| Pricing model          | Pay-per-call (5 free/day; £0.10/calculation, £0.10/HS lookup)                                                                            |
| Available regions      | Global (all countries)                                                                                                                   |
| Data returned          | Duty rate calculation, tax/VAT estimates, HS code classification                                                                         |
| Can get tariff/tax     | Yes                                                                                                                                      |
| **Fit for TradeOS**    | **4/5**                                                                                                                                  |
| Risk level             | Low                                                                                                                                      |
| Notes                  | Simple per-call pricing. Global coverage. Weak on US tariff stacking (301/232/IEEPA). Good for tariff evidence intake at moderate scale. |

### UK Trade Tariff API (GOV.UK)

| Field                  | Value                                                                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider               | HM Revenue & Customs                                                                                                                            |
| Official docs          | https://docs.trade-tariff.service.gov.uk/                                                                                                       |
| Sandbox available      | Yes                                                                                                                                             |
| API key required       | No                                                                                                                                              |
| Approval required      | No                                                                                                                                              |
| Commercial use allowed | Yes                                                                                                                                             |
| Pricing model          | **Free**                                                                                                                                        |
| Available regions      | UK only                                                                                                                                         |
| Data returned          | Commodity codes, duty rates, VAT, preferential rates, controls                                                                                  |
| Can get tariff/tax     | Yes                                                                                                                                             |
| **Fit for TradeOS**    | **4/5**                                                                                                                                         |
| Risk level             | Low                                                                                                                                             |
| Notes                  | **Excellent free API.** No auth. Updated daily. UK-only but complete. Ideal for UK import tariff evidence. Rate limiting coming September 2026. |

### USITC HTS API (Reststop)

| Field                  | Value                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Provider               | US International Trade Commission                                                                                     |
| Official docs          | https://hts.usitc.gov/reststop                                                                                        |
| API key required       | No                                                                                                                    |
| Approval required      | No                                                                                                                    |
| Commercial use allowed | Yes                                                                                                                   |
| Pricing model          | **Free**                                                                                                              |
| Available regions      | US only                                                                                                               |
| Data returned          | HTS codes (10-digit), base duty rates, units, footnotes, quotas                                                       |
| Can get tariff/tax     | Yes                                                                                                                   |
| **Fit for TradeOS**    | **3/5**                                                                                                               |
| Risk level             | Low                                                                                                                   |
| Notes                  | Free, no-auth US HTS lookup. No SLA, no change detection, schema may change. Supplement with paid API for production. |

### Zonos Landed Cost API

| Field                  | Value                                                                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider               | Zonos                                                                                                                                                          |
| Official docs          | https://zonos.com/docs/supply-chain/landed-cost                                                                                                                |
| Sandbox available      | Yes                                                                                                                                                            |
| API key required       | Yes                                                                                                                                                            |
| OAuth required         | Yes                                                                                                                                                            |
| Approval required      | Yes                                                                                                                                                            |
| Commercial use allowed | Yes                                                                                                                                                            |
| Pricing model          | Pay-per-order (\$2 + 10% of duties/taxes)                                                                                                                      |
| Available regions      | Global (all major destination countries)                                                                                                                       |
| Data returned          | Landed cost (duties + taxes + carrier fees), HS classification, customs docs                                                                                   |
| **Fit for TradeOS**    | **4/5**                                                                                                                                                        |
| Risk level             | Low                                                                                                                                                            |
| Notes                  | **Gold standard for landed cost.** Guarantees calculations (pays bill if wrong). Expensive at scale. Strong for tariff evidence. Good for DDP scenario Intake. |

---

## 7. Currency / Exchange Rate APIs

### ExchangeRate-API (open.er-api.com)

| Field                  | Value                                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider               | ExchangeRate-API                                                                                                                                   |
| Official docs          | https://www.exchangerate-api.com/docs                                                                                                              |
| Sandbox available      | Yes                                                                                                                                                |
| API key required       | **No (free tier)**                                                                                                                                 |
| Approval required      | No                                                                                                                                                 |
| Commercial use allowed | Yes                                                                                                                                                |
| Pricing model          | Freemium (Free: 1,500 req/mo; Pro: \$10/mo; Business: \$30/mo)                                                                                     |
| Available regions      | Global (200+ currencies)                                                                                                                           |
| Data returned          | Live exchange rates, pair conversion, historical data                                                                                              |
| Can get price          | Yes (currency)                                                                                                                                     |
| **Fit for TradeOS**    | **3/5**                                                                                                                                            |
| Risk level             | Low                                                                                                                                                |
| Notes                  | **Tested and confirmed working.** Free tier 1,500 req/mo, hourly updates. No key required for basic endpoint. Enrichment layer only but essential. |

### Frankfurter API (ECB)

| Field                  | Value                                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Provider               | European Central Bank                                                                                                            |
| Official docs          | https://frankfurter.dev                                                                                                          |
| API key required       | **No**                                                                                                                           |
| Approval required      | No                                                                                                                               |
| Commercial use allowed | Yes                                                                                                                              |
| Pricing model          | **Free**                                                                                                                         |
| Available regions      | Global (ECB reference rates)                                                                                                     |
| Data returned          | Daily ECB reference rates for 201 currencies, historical to 1948                                                                 |
| Can get price          | Yes                                                                                                                              |
| **Fit for TradeOS**    | **3/5**                                                                                                                          |
| Risk level             | Low                                                                                                                              |
| Notes                  | Best free option. No key, no quota, commercial use. Data is ECB official. Daily refresh (16:00 CET). Self-host option available. |

---

## 8. Payment / Invoice APIs

### AWS Textract (AnalyzeExpense)

| Field                     | Value                                                                                                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Provider                  | Amazon Web Services                                                                                                                                                                                                                        |
| Official docs             | https://docs.aws.amazon.com/textract/latest/dg/invoices-receipts.html                                                                                                                                                                      |
| Sandbox available         | Yes                                                                                                                                                                                                                                        |
| API key required          | Yes                                                                                                                                                                                                                                        |
| Approval required         | No                                                                                                                                                                                                                                         |
| Commercial use allowed    | Yes                                                                                                                                                                                                                                        |
| Pricing model             | Pay-per-page (\$0.01/page first 1M; \$0.015/page after)                                                                                                                                                                                    |
| Available regions         | Global (per-region AWS)                                                                                                                                                                                                                    |
| Data returned             | **Structured invoice data:** vendor name, item line, quantity, unit price, total, payment terms, PO number, due date. Confidence scores per field.                                                                                         |
| Can get price             | Yes                                                                                                                                                                                                                                        |
| Can get supplier identity | Yes (vendor name)                                                                                                                                                                                                                          |
| Can get payment terms     | Yes                                                                                                                                                                                                                                        |
| Can get unit/pack size    | Yes                                                                                                                                                                                                                                        |
| **Fit for TradeOS**       | **5/5**                                                                                                                                                                                                                                    |
| Risk level                | Low                                                                                                                                                                                                                                        |
| Notes                     | **Best fit for TradeOS invoice/PO parsing.** \$0.01/page, 3-month free tier (1K pages). Confidence scores enable risk-based routing. Pair with email/file intake for full pipeline. Could be TradeOS's primary evidence extraction engine. |

### Stripe API

| Field                  | Value                                                                                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider               | Stripe                                                                                                                                                                                    |
| Official docs          | https://docs.stripe.com/api                                                                                                                                                               |
| Sandbox available      | Yes                                                                                                                                                                                       |
| API key required       | Yes                                                                                                                                                                                       |
| Approval required      | No                                                                                                                                                                                        |
| Commercial use allowed | Yes                                                                                                                                                                                       |
| Pricing model          | Pay-per-call (25 req/s default)                                                                                                                                                           |
| Data returned          | Invoices (line items, pricing, taxes, discounts), payments, products, prices                                                                                                              |
| **Fit for TradeOS**    | **4/5**                                                                                                                                                                                   |
| Risk level             | Low                                                                                                                                                                                       |
| Notes                  | Excellent for invoice evidence intake when user connects Stripe. Full line item data, pricing, payment terms. Sandbox available. High fit for draft case creation. **Recommend use now.** |

### QuickBooks Online API / Xero API

| API               | Fit     | Notes                                                                                                                           |
| ----------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------- |
| QuickBooks Online | **4/5** | Strong invoice intake. Builder free: 500K reads/mo. OAuth required. Risk: read-heavy flows hit cap fast. **Recommend use now.** |
| Xero API          | **4/5** | Strong invoice/purchase bill data. Starter free (1K calls/day, 5 orgs). AUD pricing. **Recommend use now.**                     |

---

## 9. Email / File Intake APIs

### Mailgun Routes API

| Field                  | Value                                                                                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider               | Mailgun (Sinch)                                                                                                                                                                  |
| Official docs          | https://documentation.mailgun.com/docs/mailgun/api-reference/routes/                                                                                                             |
| Sandbox available      | Yes                                                                                                                                                                              |
| API key required       | Yes                                                                                                                                                                              |
| Approval required      | No                                                                                                                                                                               |
| Commercial use allowed | Yes                                                                                                                                                                              |
| Pricing model          | Freemium (Free: 100 emails/day; Basic \$15/mo: 10K/mo, 1 route; Foundation \$35: 50K/mo, 5 routes)                                                                               |
| Available regions      | Global                                                                                                                                                                           |
| Data returned          | Parsed email (subject, sender, body, attachments), MIME raw                                                                                                                      |
| Can parse documents    | No (attachment forwarding only)                                                                                                                                                  |
| **Fit for TradeOS**    | **3/5**                                                                                                                                                                          |
| Risk level             | Low                                                                                                                                                                              |
| Notes                  | Excellent for inbound email intake — receives as JSON webhooks with attachments. Use as pipe into AWS Textract for invoice parsing. Native mail parsing removes MIME complexity. |

### Google Drive API

| Field                  | Value                                                                                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider               | Google                                                                                                                                                                     |
| Official docs          | https://developers.google.com/drive/api                                                                                                                                    |
| Sandbox available      | Yes                                                                                                                                                                        |
| API key required       | No                                                                                                                                                                         |
| OAuth required         | Yes                                                                                                                                                                        |
| Approval required      | No                                                                                                                                                                         |
| Commercial use allowed | Yes                                                                                                                                                                        |
| Pricing model          | Freemium (1M quota units/min; billing planned for 2026 overage)                                                                                                            |
| **Fit for TradeOS**    | **3/5**                                                                                                                                                                    |
| Risk level             | Low                                                                                                                                                                        |
| Notes                  | Essential for file intake — users store invoices/POs in Drive. OAuth required. Use as document source pipe into Textract. TradeOS can watch Drive for new trade documents. |

### Google Document AI / AWS Textract

| API                         | Fit     | Notes                                                        |
| --------------------------- | ------- | ------------------------------------------------------------ |
| AWS Textract AnalyzeExpense | **5/5** | See Section 8 above. Primary extraction engine.              |
| Google Document AI          | **4/5** | Similar capabilities. Pay-per-page. Good alternative/backup. |

---

## 10. Public Data APIs

### World Bank API

| Field                  | Value                                                                                                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider               | World Bank                                                                                                                                                                   |
| Official docs          | https://datahelpdesk.worldbank.org/knowledgebase/articles/898581                                                                                                             |
| Sandbox available      | Yes                                                                                                                                                                          |
| API key required       | **No**                                                                                                                                                                       |
| Approval required      | No                                                                                                                                                                           |
| Commercial use allowed | Yes                                                                                                                                                                          |
| Pricing model          | **Free**                                                                                                                                                                     |
| Rate limits            | No formal limit (be reasonable: ~1-2 req/s)                                                                                                                                  |
| Available regions      | Global (200+ countries)                                                                                                                                                      |
| Data returned          | 16,000+ economic indicators (GDP, inflation, trade balance, logistics performance, tariffs)                                                                                  |
| Can get tariff/tax     | Yes                                                                                                                                                                          |
| Can get origin country | Yes                                                                                                                                                                          |
| **Fit for TradeOS**    | **3/5**                                                                                                                                                                      |
| Risk level             | Low                                                                                                                                                                          |
| Notes                  | Excellent free data for country risk profiles, tariff benchmarks, logistics indices. No auth. Enrich trade cases with macro context. API v1 being phased out — watch for v2. |

### UN Comtrade API

Covered in Section 4. **Fit: 3/5.** Best for trade flow benchmarking.

### OEC API

Covered in Section 4. **Fit: 4/5.** Strong trade intelligence with export potential scores.

---

## 11. Direct API Test Results

### Tested and Confirmed Working (Real API Calls)

| API              | URL                                                   | Status     | Response                                              |
| ---------------- | ----------------------------------------------------- | ---------- | ----------------------------------------------------- |
| ExchangeRate-API | `open.er-api.com/v6/latest/USD`                       | ✅ Working | Live rates: USD/VND=26323, USD/CNY=6.79, USD/EUR=0.86 |
| FreeCurrencyAPI  | `cdn.jsdelivr.net/npm/@fawazahmed0/currency-api`      | ✅ Working | Live rates: VND=26325, CNY=6.79, EUR=0.86             |
| UK Trade Tariff  | `trade-tariff.service.gov.uk/api/v2/commodities/{hs}` | ⚠️ Partial | API responded but HS code 73269098 returned 404       |

### Blocked / Requires Key (Documented Only)

| API               | Blocker                             | Worth using?       |
| ----------------- | ----------------------------------- | ------------------ |
| Made-in-China.com | Requires application approval       | ✅ Yes             |
| ImportGenius      | Paid subscription (\$229/mo+)       | ✅ Yes             |
| SimplyDuty        | API key required (5 free calls/day) | ✅ Yes             |
| UN Comtrade       | Free tier key required              | ✅ Yes             |
| OpenCorporates    | Free tier 50/day only               | ✅ Yes (paid tier) |
| Shippo/EasyPost   | API key required (free tier)        | ✅ Yes             |

### Not Recommended

| API             | Why                         |
| --------------- | --------------------------- |
| Alibaba OpenAPI | Seller-side only            |
| Amazon PAAPI5   | B2C only, no commercial use |
| LinkedIn SNAP   | Closed to new partners      |
| Crunchbase      | VC-focused, irrelevant      |
| ZoomInfo        | Trade-blind, \$15k+/yr      |

---

## 12. Trade Blindness Coverage

| Trade Blindness                | How TradeOS Reduces It                                                                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Price blindness**            | Manual/Paste evidence intake → structured price fields. Then: ImportGenius, UN Comtrade, OEC, Made-in-China.com, Stripe/QBO/Xero (via adapter). |
| **Origin blindness**           | Manual/Paste intake → origin fields. Then: ImportGenius, UN Comtrade, OEC, OpenCorporates, D&B (via adapter).                                   |
| **Supplier trust blindness**   | Manual/Paste → supplier assessment. Then: D&B, OpenCorporates, ImportGenius (via adapter).                                                      |
| **Logistics uncertainty**      | Manual/Paste → logistics fields. Then: Shippo, EasyPost, Zonos (via adapter).                                                                   |
| **Platform dependency**        | Adapter interface isolates each provider. Swap or remove any without core impact.                                                               |
| **Broker dependency**          | Manual tariff lookup → free gov APIs. Then: SimplyDuty, Zonos (via adapter).                                                                    |
| **Missing proof**              | Manual/Paste evidence intake is the P0 path. Document AI (any provider) comes later via adapter.                                                |
| **Market benchmark blindness** | UN Comtrade, OEC, World Bank, ImportGenius (via adapter).                                                                                       |

---

## 13. Recommendations

| Priority  | Item                                                      | Fit | Approach                                                                                                 |
| --------- | --------------------------------------------------------- | --- | -------------------------------------------------------------------------------------------------------- |
| **P0**    | Evidence Adapter Interface                                | —   | Abstract interface with `process(data: unknown): Evidence[]`. First adapter: manual/paste/text.          |
| **P0**    | Manual/Paste Evidence Intake                              | —   | UI form for invoice/PO/email text. Store as `Evidence` records. No provider dependency.                  |
| **P0**    | Currency Normalization                                    | 3/5 | Use `open.er-api.com` (free, no key) or `cdn.jsdelivr.net/npm/@fawazahmed0/currency-api` for conversion. |
| **P1**    | Document Extraction Provider Spike                        | —   | Evaluate 2-3 providers (AWS, Google, local) against real trade docs. Decide after spike, not before.     |
| **P1**    | Email/File Intake                                         | 3/5 | Mailgun inbound routes → attachment → adapter pipe. Only after adapter interface exists.                 |
| **P1**    | Accounting Connectors (Stripe/QBO/Xero)                   | 4/5 | OAuth connectors for invoice evidence. Implement as adapters.                                            |
| **P2**    | B2B Product Search (Made-in-China.com)                    | 4/5 | Product + supplier search. Only viable non-scraping B2B API.                                             |
| **P2**    | Tariff Data (gov APIs first, then paid)                   | 4/3 | UK Tariff (free, excellent) + USITC HTS → SimplyDuty/Zonos if needed.                                    |
| **P2**    | ImportGenius — manifest data                              | 4/5 | Needs paid sub (\$229/mo). Pilot after evidence adapter is proven.                                       |
| **P2**    | OEC — trade intelligence                                  | 4/5 | Pro tier \$299/mo. Useful for market benchmarks.                                                         |
| **P2**    | Logistics (Shippo/EasyPost/Zonos)                         | 4/5 | Landed cost & freight quotes. Implement after core evidence flow.                                        |
| **Avoid** | Alibaba OpenAPI, Amazon PAAPI5, LinkedIn SNAP, Crunchbase | 1/5 | Seller-side-only, B2C-only, closed, or irrelevant.                                                       |

---

## 14. TradeOS Automation Architecture (Interface-First)

```
                    ┌───────────────────────────────────────────┐
                    │           TradeOS Case Engine             │
                    │  (orchestrates evidence → draft case)     │
                    └──────────┬────────────────────────┬───────┘
                               │                        │
                    ┌──────────▼──────────┐    ┌────────▼──────────┐
                    │  Evidence Adapter   │    │  Currency Service  │
                    │  Interface          │    │  (ExchangeRate-    │
                    │  (abstract, neutral)│    │   API / fallback)  │
                    └──────────┬──────────┘    └───────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
   ┌──────▼──────┐    ┌───────▼───────┐    ┌──────▼──────┐
   │ Manual       │    │ File/Document  │    │ Accounting  │
   │ Paste/Text   │    │ (optional AI   │    │ (Stripe/    │
   │ (built-in)   │    │  provider via  │    │  QBO/Xero)  │
   │              │    │  adapter)      │    │             │
   └──────────────┘    └───────────────┘    └─────────────┘

  ┌──────────────────────────────────────────────────────────────┐
  │                    Provider Adapters (optional)              │
  │  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
  │  │ Textract │  │ Google   │  │ Made-in- │  │ SimplyDuty  │  │
  │  │ (AWS)    │  │ Doc AI   │  │ China    │  │ (tariff)    │  │
  │  └─────────┘  └──────────┘  └──────────┘  └─────────────┘  │
  │  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
  │  │ Shippo  │  │ EasyPost │  │ Zonos    │  │ ImportGenius│  │
  │  └─────────┘  └──────────┘  └──────────┘  └─────────────┘  │
  └──────────────────────────────────────────────────────────────┘

  All adapters implement the same EvidenceAdapter interface.
  The core engine never knows which provider is active.
  Providers can be swapped, removed, or added without touching core.
```

---

## 15. Follow-up Issues (Updated Priority)

| #   | Item                                   | Priority | Notes                                                                                                   |
| --- | -------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| 1   | **Evidence Adapter Interface**         | **P0**   | Abstract interface `EvidenceAdapter { process(data: unknown): Evidence[] }`. Zero dependencies.         |
| 2   | **Manual/Paste Evidence Intake UI**    | **P0**   | First adapter. Form for free-text invoice/PO/email. Store as `Evidence` records.                        |
| 3   | **Currency Normalization**             | **P0**   | `open.er-api.com` (free, no key) for case calculations. Also available: `fawazahmed0/currency-api` CDN. |
| 4   | **Real Input → Draft Case wiring**     | **P0**   | After evidence intake, route to case draft action.                                                      |
| 5   | **Document Extraction Provider Spike** | **P1**   | Evaluate AWS Textract vs Google Doc AI vs local Tesseract on real trade docs. Decision doc, not code.   |
| 6   | **Email/File Intake**                  | **P1**   | Mailgun inbound routes + attachment handler. Only after adapter interface exists.                       |
| 7   | **Accounting Connectors**              | **P1**   | Stripe, QBO, Xero OAuth → adapter. Invoice evidence from accounting platforms.                          |
| 8   | **B2B Product Search**                 | **P2**   | Made-in-China.com API. Requires application approval.                                                   |
| 9   | **Tariff Data**                        | **P2**   | UK Tariff (free) first → USITC HTS → SimplyDuty/Zonos if coverage gaps.                                 |
| 10  | **ImportGenius — Manifest Data**       | **P2**   | Paid sub. Pilot after adapter solid.                                                                    |
| 11  | **OEC — Trade Intelligence**           | **P2**   | Market complexity scores, export potential.                                                             |
| 12  | **Logistics Quotes**                   | **P2**   | Shippo/EasyPost/Zonos for landed cost.                                                                  |

---

_This spike was conducted by evaluating official documentation, testing free endpoints, and scoring each API against TradeOS's trade blindness framework._
