#!/usr/bin/env node
// CI gate: verifies docs/04_ACTION_REGISTRY.md matches registered actions in source.
// Checks name parity AND metadata (risk, roles, AI approval).

import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DOC_PATH = resolve(ROOT, "docs/04_ACTION_REGISTRY.md");

const ROLE_MAP = {
  DEFAULT_LOW_RISK_ROLES: ["OWNER", "ADMIN", "SALES", "OPERATOR"],
  DEFAULT_ADMIN_ROLES: ["OWNER", "ADMIN"],
  DEFAULT_INBOX_ROLES: ["OWNER", "ADMIN", "SALES", "OPERATOR"],
};

function parseSourceRoles(value) {
  value = value.trim();
  if (ROLE_MAP[value]) return ROLE_MAP[value];
  // Literal array like ['OWNER', 'ADMIN', 'OPERATOR']
  const m = value.match(/\[([^\]]+)\]/);
  if (m) return m[1].split(",").map((s) => s.trim().replace(/['"]/g, ""));
  return ["UNKNOWN"];
}

let exitCode = 0;
let hasWarn = false;

// 1. Extract actions from source with metadata
const grepOut = execSync(
  `grep -rln "registerAction" packages/ --include="*.ts" | grep -v "__tests__" | grep -v "node_modules"`,
  { cwd: ROOT, encoding: "utf-8" },
);

const sourceActions = new Map();
const files = grepOut.trim().split("\n").filter(Boolean);

for (const file of files) {
  const content = readFileSync(resolve(ROOT, file), "utf-8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes("registerAction<") && !line.includes("registerAction("))
      continue;
    if (line.includes("import")) continue;

    // Find the opening brace of the action config object (may be multiple lines ahead after Prettier formatting)
    let braceLine = -1;
    let braceCol = -1;
    for (let scan = 0; i + scan < lines.length; scan++) {
      const candidate = lines[i + scan];
      const idx = candidate.indexOf("({");
      if (idx !== -1) {
        braceLine = i + scan;
        braceCol = idx;
        break;
      }
    }
    if (braceLine === -1) {
      // Also accept a lone "{" on a line (Prettier puts >({ on separate line)
      for (let scan = 0; i + scan < lines.length; scan++) {
        const candidate = lines[i + scan];
        if (candidate.trim() === "{") {
          braceLine = i + scan;
          braceCol = candidate.indexOf("{");
          break;
        }
      }
    }
    if (braceLine === -1) continue;

    // Start brace depth tracking from the config object's opening brace
    // (skipping brace characters inside generic type parameters)
    let depth = 0;
    let inBlock = false;
    let blockLines = [];
    for (let j = braceLine; j < lines.length; j++) {
      const l = lines[j];
      const startIdx = j === braceLine ? braceCol : 0;
      for (let c = startIdx; c < l.length; c++) {
        const ch = l[c];
        if (ch === "{") {
          depth++;
          inBlock = true;
        } else if (ch === "}") depth--;
      }
      if (inBlock) blockLines.push(l);
      if (inBlock && depth === 0) break;
    }

    const block = blockLines.join("\n");
    const nameMatch = block.match(/name:\s*['"]([a-z]+\.[a-zA-Z.]+)['"]/);
    if (!nameMatch) continue;
    const actionName = nameMatch[1];

    const riskMatch = block.match(/riskLevel:\s*['"]([A-Z_]+)['"]/);
    const rolesMatch = block.match(/allowedRoles:\s*(\[[^\]]+\]|[A-Z_]+)/);
    const aiMatch = block.match(/requiresApprovalForAI:\s*(true|false)/);

    const risk = riskMatch ? riskMatch[1] : "UNKNOWN";
    const roles = rolesMatch ? parseSourceRoles(rolesMatch[1]) : ["UNKNOWN"];
    const requiresAiApproval = aiMatch ? aiMatch[1] === "true" : false;

    sourceActions.set(actionName, {
      risk,
      roles: [...roles].sort(),
      requiresAiApproval,
    });
  }
}

// 2. Extract actions from doc table
if (!existsSync(DOC_PATH)) {
  console.error(`[FAIL] docs/04_ACTION_REGISTRY.md not found`);
  process.exit(1);
}

const doc = readFileSync(DOC_PATH, "utf-8");
const docLines = doc.split("\n");
const docActions = new Map();
let inTable = false;

for (const line of docLines) {
  if (/^\|[-|\s]+\|$/.test(line)) {
    inTable = true;
    continue;
  }
  if (!inTable || !line.startsWith("| `")) continue;

  const cols = line.split("|").map((c) => c.trim());
  if (cols.length < 7) continue;

  const actionName = cols[1].replace(/`/g, "");
  if (!actionName.includes(".")) continue;

  const risk = cols[3].toUpperCase();
  const roles = cols[4]
    .split(",")
    .map((r) => r.trim())
    .sort();
  const aiAllowed = cols[5];
  const approvalRequired = cols[6];

  // Determine requiresApprovalForAI from doc columns
  // AI Allowed: Yes → AI can execute directly (no approval needed)
  // AI Allowed: No + Approval Required: Yes for AI → AI needs approval
  // AI Allowed: No + Approval Required: Yes → needs approval (for manual too)
  // AI Allowed: No + Approval Required: No → shouldn't happen
  const requiresAiApproval = aiAllowed === "No";

  docActions.set(actionName, {
    risk,
    roles: [...roles].sort(),
    requiresAiApproval,
  });
}

// 3. Compare names
const sourceNames = new Set(sourceActions.keys());
const docNames = new Set(docActions.keys());
const missingFromDoc = [...sourceNames].filter((a) => !docNames.has(a));
const extraInDoc = [...docNames].filter((a) => !sourceNames.has(a));

if (missingFromDoc.length > 0) {
  console.error(`[FAIL] Actions registered in source but missing from docs:`);
  for (const a of missingFromDoc) console.error(`  - ${a}`);
  exitCode = 1;
} else {
  console.log(
    `[PASS] All ${sourceNames.size} registered actions are documented.`,
  );
}

if (extraInDoc.length > 0) {
  console.warn(
    `[WARN] Actions in docs but not in source (may be removed or renamed):`,
  );
  for (const a of extraInDoc) console.warn(`  - ${a}`);
  hasWarn = true;
}

// 4. Compare metadata for actions that exist in both
let metaMismatches = 0;
for (const name of sourceNames) {
  const src = sourceActions.get(name);
  const doc = docActions.get(name);
  if (!doc) continue;

  if (src.risk !== doc.risk) {
    console.error(
      `[MISMATCH] ${name}: risk "${doc.risk}" in doc but "${src.risk}" in source`,
    );
    metaMismatches++;
  }

  const srcRolesStr = src.roles.join(", ");
  const docRolesStr = doc.roles.join(", ");
  if (srcRolesStr !== docRolesStr) {
    console.error(
      `[MISMATCH] ${name}: roles "${docRolesStr}" in doc but "${srcRolesStr}" in source`,
    );
    metaMismatches++;
  }

  if (src.requiresAiApproval !== doc.requiresAiApproval) {
    const docVal = doc.requiresAiApproval
      ? "No (requires approval)"
      : "Yes (direct)";
    const srcVal = src.requiresAiApproval
      ? "No (requires approval)"
      : "Yes (direct)";
    console.error(
      `[MISMATCH] ${name}: AI Allowed "${docVal}" in doc but "${srcVal}" in source`,
    );
    metaMismatches++;
  }
}

if (metaMismatches > 0) {
  console.error(
    `\n[FAIL] ${metaMismatches} metadata mismatches found between source and docs.`,
  );
  exitCode = 1;
} else {
  console.log(
    `[PASS] Metadata (risk, roles, AI approval) matches between source and docs.`,
  );
}

const totalSource = sourceNames.size;
const totalDoc = docNames.size;
console.log(`\nSource: ${totalSource} actions | Doc: ${totalDoc} actions`);

process.exit(exitCode);
