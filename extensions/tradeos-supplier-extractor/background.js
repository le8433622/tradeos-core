// TradeOS Supplier Extractor — Background Service Worker
// Handles API calls, evidence logging, and cross-session state

const API_BASE = "https://tradeos-core.vercel.app/api";

chrome.runtime.onInstalled.addListener(() => {
  console.log("TradeOS Supplier Extractor installed");
});

// Handle extension icon click — open popup automatically
chrome.action.onClicked.addListener((tab) => {
  chrome.windows.create({
    url: "popup.html",
    type: "popup",
    width: 420,
    height: 560,
  });
});
