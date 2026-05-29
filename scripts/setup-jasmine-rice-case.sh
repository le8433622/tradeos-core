#!/bin/bash
# Setup Jasmine Rice supplier switch case via API with demo auth
set -euo pipefail

BASE="http://localhost:3000/api"
AUTH="Cookie: x-demo-auth-email=owner@tradeos.local"

echo "=== Step 1: Create Sourcing Run ==="
RUN_RESP=$(curl -s -X POST "$BASE/sourcing-runs" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{
    "organizationId": "demo-org",
    "title": "Jasmine Rice Sourcing — Mekong Delta Rice Co.",
    "requirement": "Buyer/Operator: Long An Food Export JSC\nProduct: Vietnamese Jasmine Rice 5% broken\nCurrent Supplier: Mekong Delta Rice Co., Ltd.\nCurrent Price: USD 510/MT\nFrequency: Monthly\nQuantity: 200 MT\nPain: Overpaying / Price Gap, Supplier Performance Risk\nPain Detail: Current supplier raised price twice in 6 months. Quality inconsistency reported in 2 of last 5 shipments.\nEvidence: Current supplier invoice (Jan 2026), VFA export price list, FAO food price index\nDecision Authority: FULL_AUTHORITY\nExpected Outcome: Find cheaper alternative with same quality",
    "targetCountry": "Vietnam",
    "sourceCountry": "Vietnam",
    "productCategory": "Rice & Grains",
    "quantity": "200 MT",
    "budget": "510",
    "currency": "USD",
    "riskLevel": "MEDIUM"
  }')
RUN_ID=$(echo "$RUN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['run']['id'])")
echo "Run ID: $RUN_ID"

echo ""
echo "=== Step 2: Add Purchase Baseline ==="
curl -s -X POST "$BASE/sourcing-runs/$RUN_ID/purchase-baseline" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d "{
    \"organizationId\": \"demo-org\",
    \"sourcingRunId\": \"$RUN_ID\",
    \"supplierName\": \"Mekong Delta Rice Co., Ltd.\",
    \"productDescription\": \"Vietnamese Jasmine Rice 5% broken, FOB HCMC\",
    \"sourceType\": \"INVOICE\",
    \"unitPrice\": \"510\",
    \"currency\": \"USD\",
    \"quantity\": \"200\",
    \"unit\": \"MT\",
    \"frequency\": \"Monthly\",
    \"paymentTerms\": \"LC at sight\",
    \"deliveryTerms\": \"FOB HCMC\",
    \"leadTime\": \"14 days\"
  }" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Baseline ID:', d.get('baseline',d).get('id','unknown'))"

echo ""
echo "=== Step 3: Add Supplier Candidate 1 — Tien Giang ==="
C1_RESP=$(curl -s -X POST "$BASE/sourcing-runs/$RUN_ID/supplier-candidates" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d "{
    \"organizationId\": \"demo-org\",
    \"sourcingRunId\": \"$RUN_ID\",
    \"name\": \"Tien Giang Rice Export JSC\",
    \"website\": \"https://tiengiangrice.vn\",
    \"country\": \"Vietnam\",
    \"source\": \"VFA member directory\",
    \"contactInfo\": {\"email\": \"export@tiengiangrice.vn\", \"phone\": \"+84 273 123 456\"},
    \"reliabilityScore\": 78,
    \"riskFlags\": [\"MODERATE_CAPACITY\"]
  }")
C1_ID=$(echo "$C1_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['candidate']['id'])")
echo "Candidate 1 ID: $C1_ID"

echo ""
echo "=== Step 4: Add Supplier Candidate 2 — An Giang ==="
C2_RESP=$(curl -s -X POST "$BASE/sourcing-runs/$RUN_ID/supplier-candidates" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d "{
    \"organizationId\": \"demo-org\",
    \"sourcingRunId\": \"$RUN_ID\",
    \"name\": \"An Giang Rice Trading Co.\",
    \"website\": \"https://agrice.vn\",
    \"country\": \"Vietnam\",
    \"source\": \"Trade exhibition - VietFood 2026\",
    \"contactInfo\": {\"email\": \"sales@agrice.vn\", \"phone\": \"+84 296 789 012\"},
    \"reliabilityScore\": 72,
    \"riskFlags\": [\"NEW_SUPPLIER\"]
  }")
C2_ID=$(echo "$C2_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['candidate']['id'])")
echo "Candidate 2 ID: $C2_ID"

echo ""
echo "=== Step 5: Add Supplier Alternative 1 — Tien Giang ==="
curl -s -X POST "$BASE/sourcing-runs/$RUN_ID/supplier-alternatives" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d "{
    \"organizationId\": \"demo-org\",
    \"sourcingRunId\": \"$RUN_ID\",
    \"supplierName\": \"Tien Giang Rice Export JSC\",
    \"supplierCandidateId\": \"$C1_ID\",
    \"productDescription\": \"Vietnamese Jasmine Rice 5% broken, FOB HCMC\",
    \"unitPrice\": \"485\",
    \"currency\": \"USD\",
    \"moq\": \"50 MT\",
    \"leadTime\": \"10 days\",
    \"paymentTerm\": \"LC at sight\",
    \"shippingNotes\": \"FOB HCMC, containerized 20MT per container\",
    \"riskFlags\": []
  }" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Alternative 1 ID:', d.get('alternative',d).get('id','unknown'))"

echo ""
echo "=== Step 6: Add Supplier Alternative 2 — An Giang ==="
curl -s -X POST "$BASE/sourcing-runs/$RUN_ID/supplier-alternatives" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d "{
    \"organizationId\": \"demo-org\",
    \"sourcingRunId\": \"$RUN_ID\",
    \"supplierName\": \"An Giang Rice Trading Co.\",
    \"supplierCandidateId\": \"$C2_ID\",
    \"productDescription\": \"Vietnamese Jasmine Rice 5% broken, FOB HCMC\",
    \"unitPrice\": \"478\",
    \"currency\": \"USD\",
    \"moq\": \"100 MT\",
    \"leadTime\": \"20 days\",
    \"paymentTerm\": \"T/T 30 days after B/L\",
    \"shippingNotes\": \"FOB HCMC via Cai Mep port\",
    \"riskFlags\": [\"NEW_SUPPLIER\", \"LONGER_LEAD_TIME\"]
  }" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Alternative 2 ID:', d.get('alternative',d).get('id','unknown'))"

echo ""
echo "=== Step 7: Add Quote 1 — Tien Giang ==="
curl -s -X POST "$BASE/sourcing-runs/$RUN_ID/quotes" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d "{
    \"organizationId\": \"demo-org\",
    \"sourcingRunId\": \"$RUN_ID\",
    \"supplierCandidateId\": \"$C1_ID\",
    \"productDescription\": \"Vietnamese Jasmine Rice 5% broken - Tien Giang specification\",
    \"quantity\": 200,
    \"unit\": \"MT\",
    \"unitPrice\": 485,
    \"totalAmount\": 97000,
    \"currency\": \"USD\",
    \"moq\": \"50 MT\",
    \"leadTime\": \"10 days\",
    \"shippingTerm\": \"FOB HCMC\",
    \"paymentTerm\": \"LC at sight\",
    \"riskScore\": 15
  }" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Quote 1 ID:', d.get('quote',d).get('id','unknown'))"

echo ""
echo "=== Step 8: Add Quote 2 — An Giang ==="
curl -s -X POST "$BASE/sourcing-runs/$RUN_ID/quotes" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d "{
    \"organizationId\": \"demo-org\",
    \"sourcingRunId\": \"$RUN_ID\",
    \"supplierCandidateId\": \"$C2_ID\",
    \"productDescription\": \"Vietnamese Jasmine Rice 5% broken - An Giang specification\",
    \"quantity\": 200,
    \"unit\": \"MT\",
    \"unitPrice\": 478,
    \"totalAmount\": 95600,
    \"currency\": \"USD\",
    \"moq\": \"100 MT\",
    \"leadTime\": \"20 days\",
    \"shippingTerm\": \"FOB HCMC\",
    \"paymentTerm\": \"T/T 30 days after B/L\",
    \"riskScore\": 30
  }" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Quote 2 ID:', d.get('quote',d).get('id','unknown'))"

echo ""
echo "=== Step 9: Compare Quotes ==="
curl -s -X POST "$BASE/sourcing-runs/$RUN_ID/compare" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d "{\"organizationId\":\"demo-org\",\"sourcingRunId\":\"$RUN_ID\"}" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Comparison:', json.dumps(d, indent=2)[:200])"

echo ""
echo "=== Step 10: Generate Switch Decision Report ==="
curl -s -X POST "$BASE/sourcing-runs/$RUN_ID/switch-decision" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d "{\"organizationId\":\"demo-org\",\"sourcingRunId\":\"$RUN_ID\"}" | python3 -c "
import sys,json
d = json.load(sys.stdin)
r = d.get('report', d)
print('Recommendation:', r.get('recommendation'))
print('Confidence:', r.get('confidence'))
print('Overall Score:', r.get('overallScore'))
print('Savings %:', r.get('savingsPercent'))
print('Evidence Count:', r.get('evidenceCount'))
print('Summary:', str(r.get('summary',''))[:200])
"

echo ""
echo "=== Step 11: Generate Buyer Report ==="
curl -s -X POST "$BASE/sourcing-runs/$RUN_ID/generate-report" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d "{\"organizationId\":\"demo-org\",\"sourcingRunId\":\"$RUN_ID\"}" | python3 -c "
import sys,json
d = json.load(sys.stdin)
r = d.get('report', d)
print('Recommended:', r.get('recommendedSupplierName','none'))
print('Savings:', r.get('expectedSavings'))
print('Summary:', str(r.get('summary',''))[:200])
"

echo ""
echo "=== Step 12: Assign Report to Buyer (leh146215@gmail.com) ==="
curl -s -X POST "$BASE/buyer/reports/assign" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d "{
    \"organizationId\": \"demo-org\",
    \"sourcingRunId\": \"$RUN_ID\",
    \"assignedToEmail\": \"leh146215@gmail.com\",
    \"notes\": \"Please review the Jasmine Rice supplier switch recommendation. We have 2 alternatives offering 5-6% savings vs current supplier.\"
  }" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Delivery ID:', d.get('deliveryId','unknown'))"

echo ""
echo "======================================"
echo "Jasmine Rice case setup complete!"
echo "Run ID: $RUN_ID"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Log in as owner@tradeos.local (demo auth) at http://localhost:3000"
echo "2. Visit /sourcing-runs/$RUN_ID to view the run"
echo "3. The report is assigned to leh146215@gmail.com"
echo "4. As buyer, submit decision at /buyer/reports"
echo "5. As operator, record outcome at /sourcing-runs/$RUN_ID/outcome"