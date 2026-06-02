// TradeOS Supplier Extractor — Content Script
// Runs on Alibaba, Made-in-China, Global Sources product pages
// Extracts structured supplier data from rendered DOM (user's real browser session)

function getPlatform() {
  const host = window.location.hostname;
  if (host.includes("alibaba.com")) return "alibaba";
  if (host.includes("made-in-china.com")) return "made-in-china";
  if (host.includes("globalsources.com")) return "globalsources";
  return "unknown";
}

const PLATFORM = getPlatform();

function extractAlibaba() {
  const data = {
    platform: "alibaba",
    url: window.location.href,
    extractedAt: new Date().toISOString(),
  };

  // Product title
  const titleEl = document.querySelector('.title, h1, [data-spm="title"]');
  data.productName = titleEl?.innerText?.trim() || "";

  // Price
  const priceEl = document.querySelector('.price, [class*="price"], .sf-price');
  data.priceRaw = priceEl?.innerText?.trim() || "";

  // Supplier info
  const supplierEl = document.querySelector(
    '.company-name, .supplier-name, [class*="supplier"] a',
  );
  data.supplierName = supplierEl?.innerText?.trim() || "";

  // Supplier link
  const supplierLink =
    supplierEl?.closest("a") || document.querySelector('a[href*="supplier"]');
  data.supplierUrl = supplierLink?.href || "";

  // MOQ
  const moqEl = document.querySelector(
    '[class*="moq"], [class*="MOQ"], :has-text("MOQ")',
  );
  data.moq = moqEl?.innerText?.trim() || "";

  // Reviews / rating
  const ratingEl = document.querySelector('[class*="rating"], [class*="star"]');
  data.rating = ratingEl?.innerText?.trim() || "";
  const reviewCountEl = document.querySelector(
    '[class*="review"], [class*="feedback"]',
  );
  data.reviewCount = reviewCountEl?.innerText?.trim() || "";

  // Certifications
  const certEls = document.querySelectorAll(
    '[class*="cert"], [class*="certification"]',
  );
  data.certifications = Array.from(certEls)
    .map((el) => el.innerText.trim())
    .filter(Boolean);

  // Transaction history
  const transEl = document.querySelector(
    '[class*="transaction"], [class*="trade"]',
  );
  data.transactionHistory = transEl?.innerText?.trim() || "";

  // Response rate
  const respEl = document.querySelector('[class*="response"]');
  data.responseRate = respEl?.innerText?.trim() || "";

  // Full page text for AI analysis (sanitized)
  const bodyText = document.body.innerText || "";
  data.pageTextSample = bodyText.slice(0, 8000);

  return data;
}

function extractMadeInChina() {
  const data = {
    platform: "made-in-china",
    url: window.location.href,
    extractedAt: new Date().toISOString(),
  };

  const titleEl = document.querySelector(
    'h1, .product-title, [class*="title"]',
  );
  data.productName = titleEl?.innerText?.trim() || "";

  const priceEl = document.querySelector('[class*="price"], .product-price');
  data.priceRaw = priceEl?.innerText?.trim() || "";

  const supplierEl = document.querySelector(
    '.company-name, [class*="supplier"], .supplier-info a',
  );
  data.supplierName = supplierEl?.innerText?.trim() || "";

  data.pageTextSample = (document.body.innerText || "").slice(0, 8000);
  return data;
}

function extractGlobalSources() {
  const data = {
    platform: "globalsources",
    url: window.location.href,
    extractedAt: new Date().toISOString(),
  };

  const titleEl = document.querySelector("h1, .product-title");
  data.productName = titleEl?.innerText?.trim() || "";

  const priceEl = document.querySelector('[class*="price"]');
  data.priceRaw = priceEl?.innerText?.trim() || "";

  data.pageTextSample = (document.body.innerText || "").slice(0, 8000);
  return data;
}

// Main extraction
function extract() {
  switch (PLATFORM) {
    case "alibaba":
      return extractAlibaba();
    case "made-in-china":
      return extractMadeInChina();
    case "globalsources":
      return extractGlobalSources();
    default:
      return {
        platform: PLATFORM,
        url: window.location.href,
        error: "Unsupported platform",
        extractedAt: new Date().toISOString(),
      };
  }
}

// Listen for extraction request from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "EXTRACT_SUPPLIER") {
    const data = extract();
    sendResponse({ ok: true, data });
  }
});

// Detect anti-bot / blocked pages
function isBlockedPage() {
  const text = (document.body.innerText || "").toLowerCase();
  const blockPatterns = [
    "unusual traffic",
    "verify you are human",
    "please confirm you are a human",
    "sorry, we have detected",
    "access denied",
    "blocked",
    "captcha",
    "your request has been blocked",
    "automated access",
  ];
  return blockPatterns.some((p) => text.includes(p));
}

// Auto-extract and store on page load
const extracted = extract();
if (isBlockedPage()) {
  extracted.blocked = true;
  extracted.blockedMessage = "Platform blocked automated access";
}
chrome.storage.local.set({ lastExtracted: extracted });
