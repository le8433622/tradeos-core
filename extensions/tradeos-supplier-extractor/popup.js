// TradeOS Supplier Extractor — Popup Script
const API_BASE = "http://localhost:3000/api";
let currentData = null;
let collection = [];
let currentAnalysis = null;

function $(id) {
  return document.getElementById(id);
}

// Init
document.addEventListener("DOMContentLoaded", async () => {
  // Load collection from storage
  const result = await chrome.storage.local.get([
    "supplierCollection",
    "lastExtracted",
    "lastAnalysis",
  ]);
  collection = result.supplierCollection || [];
  updateCollectionTab();

  // Load last extracted
  if (result.lastExtracted) {
    currentData = result.lastExtracted;
    showExtracted(currentData);
  } else {
    extractFromTab();
  }

  // Load last analysis
  if (result.lastAnalysis) {
    currentAnalysis = result.lastAnalysis;
  }

  // Tab switching
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".tab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      document
        .querySelectorAll('[id^="tab"]')
        .forEach((t) => (t.style.display = "none"));
      const target = document.getElementById(
        "tab" +
          tab.dataset.tab.charAt(0).toUpperCase() +
          tab.dataset.tab.slice(1),
      );
      if (target) target.style.display = "block";
    });
  });

  // Buttons
  $("addToCollection").addEventListener("click", () => addToCollection());
  $("analyzeBtn").addEventListener("click", () => analyzeCurrent());
  $("compareAll").addEventListener("click", () => compareAll());
  $("clearCollection").addEventListener("click", () => clearCollection());
});

async function extractFromTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs[0]?.id) return showNoData();

  try {
    const response = await chrome.tabs.sendMessage(tabs[0].id, {
      type: "EXTRACT_SUPPLIER",
    });
    if (response?.ok) {
      currentData = response.data;
      await chrome.storage.local.set({ lastExtracted: currentData });
      showExtracted(currentData);
    } else {
      showNoData();
    }
  } catch {
    showNoData();
  }
}

function showExtracted(data) {
  if (data.blocked) {
    $("status").className = "status err";
    $("status").textContent = "✗ Blocked by " + (data.platform || "platform");
    $("extracted").style.display = "none";
    return;
  }

  $("status").className = "status ok";
  $("status").textContent = "✓ " + (data.supplierName || "Unknown supplier");
  $("extracted").style.display = "block";
  $("productName").textContent = data.productName || "(not found)";
  $("supplierName").textContent = data.supplierName || "(not found)";
  $("priceRaw").textContent = data.priceRaw || "(not found)";
  $("platform").textContent = data.platform || "unknown";

  const hasData = data.productName || data.supplierName;
  $("addToCollection").disabled = !hasData;
  $("analyzeBtn").disabled = !hasData;
}

function showNoData() {
  $("status").className = "status waiting";
  $("status").textContent = "Not on a supplier product page";
  $("extracted").style.display = "none";
}

function addToCollection() {
  if (!currentData) return;
  const exists = collection.some((c) => c.url === currentData.url);
  if (exists) {
    $("status").textContent = "Already in collection";
    return;
  }
  collection.push({ ...currentData, collectedAt: new Date().toISOString() });
  chrome.storage.local.set({ supplierCollection: collection });
  updateCollectionTab();
  $("status").textContent =
    "✓ Added to collection (" + collection.length + " total)";
}

function removeFromCollection(index) {
  collection.splice(index, 1);
  chrome.storage.local.set({ supplierCollection: collection });
  updateCollectionTab();
}

function clearCollection() {
  collection = [];
  chrome.storage.local.set({ supplierCollection: collection });
  updateCollectionTab();
  $("status").textContent = "Collection cleared";
}

function updateCollectionTab() {
  $("collectionCount").textContent = collection.length;
  const list = $("collectionList");
  const actions = $("collectionActions");

  if (collection.length === 0) {
    list.innerHTML =
      '<div class="empty-state"><p>No suppliers collected yet.</p><p style="font-size:11px;">Go to a supplier page and click "Add to Collection".</p></div>';
    actions.style.display = "none";
    return;
  }

  actions.style.display = "flex";
  list.innerHTML = collection
    .map(
      (item, i) => `
    <div class="supplier-item">
      <span class="remove" data-index="${i}">×</span>
      <div class="name">${item.supplierName || "Unknown"}</div>
      <div class="meta">${item.productName || ""}${item.priceRaw ? " — " + item.priceRaw : ""}</div>
      <div class="meta">${item.platform || ""}${item.rating ? " • ★ " + item.rating : ""}</div>
    </div>
  `,
    )
    .join("");

  // Remove buttons
  list.querySelectorAll(".remove").forEach((el) => {
    el.addEventListener("click", () =>
      removeFromCollection(parseInt(el.dataset.index)),
    );
  });
}

async function analyzeCurrent() {
  if (!currentData) return;
  $("spinner").style.display = "block";
  $("status").textContent = "Analyzing...";

  try {
    const res = await fetch(API_BASE + "/analyze-supplier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplierData: currentData }),
    });
    const result = await res.json();
    currentAnalysis = result;
    await chrome.storage.local.set({ lastAnalysis: result });
    showAnalysis(result);
  } catch (err) {
    $("status").className = "status err";
    $("status").textContent = "✗ Analysis failed: " + err.message;
  } finally {
    $("spinner").style.display = "none";
  }
}

function showAnalysis(result) {
  const container = $("lastAnalysis");
  container.style.display = "block";

  if (result.error) {
    container.innerHTML = `<div class="status err">${result.message || result.error}</div>`;
    return;
  }

  const analysis = result.analysis || {};
  const risk = (analysis.overallRisk || "unknown").toLowerCase();
  const landing = result.landedCost;

  let html = `
    <div class="status ${risk === "high" ? "err" : risk === "medium" ? "waiting" : "ok"}">
      Risk: <strong class="risk-${risk}">${(risk || "UNKNOWN").toUpperCase()}</strong>
      &nbsp;|&nbsp; Evidence: ${(analysis.evidenceQuality || "N/A").toUpperCase()}
    </div>`;

  // Landed cost
  if (landing) {
    html += `
    <div class="analysis-box" style="background:#e8f5e9;">
      <strong>Total Landed Cost</strong>
      <div class="cost-row"><span>FOB (supplier price)</span><span>$${landing.fobTotal.toFixed(2)}</span></div>
      <div class="cost-row"><span>Shipping (air)</span><span>$${landing.shippingCost.toFixed(2)}</span></div>
      <div class="cost-row"><span>Duties (${analysis.priceAssessment?.landedCostBreakdown?.dutiesPerUnit ? "$" + analysis.priceAssessment.landedCostBreakdown.dutiesPerUnit.toFixed(2) + "/unit" : landing.dutiesTotal.toFixed(2)})</span><span>$${landing.dutiesTotal.toFixed(2)}</span></div>
      <div class="cost-row"><span>Insurance & fees</span><span>$${(landing.insuranceCost + landing.paymentFees).toFixed(2)}</span></div>
      <div class="cost-row total"><span>Total (${landing.grandTotal > 1000 ? (landing.grandTotal / 1000).toFixed(1) + "k" : landing.grandTotal.toFixed(2)})</span><span>$${landing.costPerUnit.toFixed(2)}/unit</span></div>
    </div>`;
  }

  // Risk flags
  const flags = analysis.riskFlags || [];
  if (flags.length > 0) {
    html += `<div class="analysis-box" style="margin-top:6px;"><strong>Risk Flags</strong>`;
    flags.forEach((f) => {
      const sev = (f.severity || "medium").toLowerCase();
      html += `<div style="padding:2px 0;font-size:12px;">
        <span class="risk-${sev}">●</span> ${f.detail}
      </div>`;
    });
    html += `</div>`;
  }

  // Recommendation
  const rec = analysis.recommendation || {};
  if (rec.verdict) {
    html += `<div class="analysis-box" style="margin-top:6px;background:#fff3e0;">
      <strong>Recommendation: ${rec.verdict.replace(/_/g, " ").toUpperCase()}</strong>
      <p style="font-size:12px;margin-top:4px;">${rec.rationale || ""}</p>
    </div>`;
  }

  // Human must decide
  const mustDecide = rec.humanMustDecide || [];
  if (mustDecide.length > 0) {
    html += `<div class="analysis-box" style="margin-top:6px;">
      <strong>Human must decide:</strong>
      <ul style="font-size:12px;padding-left:16px;margin-top:4px;">
        ${mustDecide.map((m) => `<li>${m}</li>`).join("")}
      </ul>
    </div>`;
  }

  // Missing evidence
  const missing = analysis.missingEvidence || [];
  if (missing.length > 0) {
    html += `<div class="analysis-box" style="margin-top:6px;">
      <strong>Missing Evidence:</strong>
      <ul style="font-size:12px;padding-left:16px;margin-top:4px;color:#999;">
        ${missing.map((m) => `<li>${m}</li>`).join("")}
      </ul>
    </div>`;
  }

  // Approval button
  if (result.needsHumanApproval !== false && result.id) {
    html += `<button id="approveBtn" class="btn primary btn-block" style="margin-top:8px;">
      ✓ Approve & Save to Evidence Ledger
    </button>`;
  }

  container.innerHTML = html;

  // Attach approval handler
  const approveBtn = container.querySelector("#approveBtn");
  if (approveBtn) {
    approveBtn.addEventListener("click", async () => {
      try {
        const resp = await fetch(API_BASE + "/analyze-supplier/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ analysisId: result.id }),
        });
        const approval = await resp.json();
        if (approval.ok) {
          $("status").className = "status ok";
          $("status").textContent = "✓ Approved & saved to evidence ledger";
          approveBtn.textContent = "✓ Approved";
          approveBtn.disabled = true;
        }
      } catch (err) {
        $("status").className = "status err";
        $("status").textContent = "✗ Approval failed: " + err.message;
      }
    });
  }

  // Show analyze tab
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  document.querySelector('[data-tab="extract"]').classList.add("active");
  document
    .querySelectorAll('[id^="tab"]')
    .forEach((t) => (t.style.display = "none"));
  $("tabExtract").style.display = "block";
}

async function compareAll() {
  if (collection.length < 2) {
    $("status").textContent = "Need at least 2 suppliers to compare";
    return;
  }

  $("spinner").style.display = "block";
  $("status").textContent = "Analyzing " + collection.length + " suppliers...";

  try {
    // Analyze each supplier
    const results = [];
    for (const supplier of collection) {
      $("status").textContent =
        "Analyzing " + (supplier.supplierName || "supplier") + "...";
      const res = await fetch(API_BASE + "/analyze-supplier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierData: supplier }),
      });
      const result = await res.json();
      results.push({
        supplier,
        analysis: result.analysis || {},
        landedCost: result.landedCost,
        id: result.id,
      });
    }

    showComparison(results);
  } catch (err) {
    $("status").className = "status err";
    $("status").textContent = "✗ Comparison failed: " + err.message;
  } finally {
    $("spinner").style.display = "none";
  }
}

function showComparison(results) {
  const container = $("comparisonResult");

  // Header
  let html = `<div class="status ok">Compared ${results.length} suppliers</div>`;

  // Comparison table
  html += `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;">
    <tr style="background:#f5f5f5;">
      <th style="text-align:left;padding:6px 8px;border-bottom:2px solid #ddd;">Supplier</th>
      <th style="text-align:right;padding:6px 8px;border-bottom:2px solid #ddd;">FOB/unit</th>
      <th style="text-align:right;padding:6px 8px;border-bottom:2px solid #ddd;">All-in/unit</th>
      <th style="text-align:center;padding:6px 8px;border-bottom:2px solid #ddd;">Risk</th>
      <th style="text-align:center;padding:6px 8px;border-bottom:2px solid #ddd;">Evidence</th>
    </tr>`;

  // Sort by total cost
  results.sort(
    (a, b) =>
      (a.landedCost?.costPerUnit || 999) - (b.landedCost?.costPerUnit || 999),
  );

  results.forEach((r, i) => {
    const a = r.analysis || {};
    const risk = (a.overallRisk || "").toLowerCase();
    const evidence = (a.evidenceQuality || "").toLowerCase();
    const fob =
      r.landedCost?.fobTotal && r.supplier.moq
        ? (
            r.landedCost.fobTotal /
            parseInt(r.supplier.moq.replace(/[^0-9]/g, "") || "500")
          ).toFixed(2)
        : r.supplier.priceRaw || "?";

    const isBest = i === 0;
    html += `<tr style="${isBest ? "background:#e8f5e9;" : ""}">
      <td style="padding:6px 8px;border-bottom:1px solid #eee;">
        ${isBest ? "🏆 " : ""}${r.supplier.supplierName || "Unknown"}
        <div style="font-size:10px;color:#999;">${r.supplier.productName || ""}</div>
      </td>
      <td style="text-align:right;padding:6px 8px;border-bottom:1px solid #eee;">$${typeof fob === "string" && fob.includes("$") ? fob : "$" + fob}</td>
      <td style="text-align:right;padding:6px 8px;border-bottom:1px solid #eee;font-weight:600;">$${r.landedCost?.costPerUnit ? r.landedCost.costPerUnit.toFixed(2) : "?"}</td>
      <td style="text-align:center;padding:6px 8px;border-bottom:1px solid #eee;">
        <span class="risk-${risk}">${risk.toUpperCase() || "?"}</span>
      </td>
      <td style="text-align:center;padding:6px 8px;border-bottom:1px solid #eee;">
        <span class="${evidence === "high" ? "badge-ok" : evidence === "low" ? "badge-err" : "badge-info"}">${(evidence || "?").toUpperCase()}</span>
      </td>
    </tr>`;
  });

  html += `</table></div>`;

  // Assumptions
  const allAssumptions = results.flatMap(
    (r) => r.landedCost?.assumptions || [],
  );
  const uniqueAssumptions = [...new Set(allAssumptions)];
  if (uniqueAssumptions.length > 0) {
    html += `<div class="analysis-box" style="margin-top:8px;">
      <strong>Landed cost assumptions:</strong>
      <ul style="font-size:11px;padding-left:16px;margin-top:4px;color:#666;">
        ${uniqueAssumptions
          .slice(0, 5)
          .map((a) => `<li>${a}</li>`)
          .join("")}
      </ul>
      <div style="font-size:10px;color:#999;margin-top:4px;">Note: Actual costs depend on shipping rates, duty classifications, and fees at time of order.</div>
    </div>`;
  }

  // Save analyses
  html += `<button id="approveAllBtn" class="btn primary btn-block" style="margin-top:8px;">
    ✓ Approve All & Save to Evidence Ledger
  </button>
  <div style="margin-top:6px;font-size:11px;color:#999;">Each supplier analysis is saved individually for audit trail.</div>`;

  container.innerHTML = html;

  // Approve all
  container
    .querySelector("#approveAllBtn")
    ?.addEventListener("click", async () => {
      let approved = 0;
      for (const r of results) {
        if (r.id) {
          try {
            await fetch(API_BASE + "/analyze-supplier/approve", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ analysisId: r.id }),
            });
            approved++;
          } catch {}
        }
      }
      $("status").className = "status ok";
      $("status").textContent =
        "✓ Approved " + approved + "/" + results.length + " to evidence ledger";
      container.querySelector("#approveAllBtn").textContent = "✓ All Approved";
      container.querySelector("#approveAllBtn").disabled = true;
    });

  // Show compare tab
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  document.querySelector('[data-tab="compare"]').classList.add("active");
  document
    .querySelectorAll('[id^="tab"]')
    .forEach((t) => (t.style.display = "none"));
  $("tabCompare").style.display = "block";
}
