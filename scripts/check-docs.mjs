#!/usr/bin/env node
// CI gate: verifies docs/04_ACTION_REGISTRY.md matches registered actions in source.
// Checks name parity AND metadata (risk, roles, AI approval).

import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DOC_PATH = resolve(ROOT, "docs/04_ACTION_REGISTRY.md");
const SEED_PATH = resolve(ROOT, "packages/database/prisma/seed.ts");
const SYSTEM_ROLES_PATH = resolve(
  ROOT,
  "packages/database/src/system-roles.ts",
);

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
  if (m) {
    return m[1]
      .split(",")
      .flatMap((s) => {
        s = s.trim().replace(/['"]/g, "");
        // Expand spread references like ...DEFAULT_ADMIN_ROLES
        const spreadMatch = s.match(/^\.\.\.(.*)/);
        if (spreadMatch && ROLE_MAP[spreadMatch[1]])
          return ROLE_MAP[spreadMatch[1]];
        return s;
      })
      .filter((r) => r !== "");
  }
  return ["UNKNOWN"];
}

function trackedFiles(pathPrefix) {
  const out = execSync(`git ls-files ${pathPrefix}`, {
    cwd: ROOT,
    encoding: "utf-8",
  }).trim();
  return out ? out.split("\n").filter(Boolean) : [];
}

function quotedStrings(value) {
  return [...value.matchAll(/["']([^"']+)["']/g)].map((match) => match[1]);
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function difference(left, right) {
  const rightSet = new Set(right);
  return [...new Set(left)].filter((value) => !rightSet.has(value)).sort();
}

function extractPermissionKeys(content) {
  return [...content.matchAll(/key:\s*["']([^"']+)["']/g)].map(
    (match) => match[1],
  );
}

function extractConstArray(content, name) {
  const nameIndex = content.indexOf(name);
  if (nameIndex === -1) return "";
  const equalsIndex = content.indexOf("=", nameIndex);
  if (equalsIndex === -1) return "";
  const start = content.indexOf("[", equalsIndex);
  if (start === -1) return "";

  let depth = 0;
  for (let i = start; i < content.length; i++) {
    const ch = content[i];
    if (ch === "[") depth++;
    if (ch === "]") depth--;
    if (depth === 0) return content.slice(start, i + 1);
  }
  return "";
}

function topLevelObjectBlocks(arrayContent) {
  const blocks = [];
  let depth = 0;
  let start = -1;

  for (let i = 0; i < arrayContent.length; i++) {
    const ch = arrayContent[i];
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    }
    if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        blocks.push(arrayContent.slice(start, i + 1));
        start = -1;
      }
    }
  }

  return blocks;
}

function parseRoleDefinitions(content, arrayName, permissionKeys) {
  const roles = new Map();
  const arrayContent = extractConstArray(content, arrayName);
  const allPermissions = [...new Set(permissionKeys)].sort();

  for (const block of topLevelObjectBlocks(arrayContent)) {
    const nameMatch = block.match(/name:\s*["']([A-Z_]+)["']/);
    if (!nameMatch) continue;
    const roleName = nameMatch[1];

    let permissions = [];
    if (/permissions:\s*(?:PERMISSIONS|SYSTEM_PERMISSIONS)\.map/.test(block)) {
      permissions = allPermissions;
    } else if (
      /permissions:\s*(?:PERMISSIONS|SYSTEM_PERMISSIONS)\.filter/.test(block)
    ) {
      const exclusionsMatch = block.match(
        /!\s*\[([\s\S]*?)\]\.includes\(p\.key\)/,
      );
      const exclusions = exclusionsMatch
        ? new Set(quotedStrings(exclusionsMatch[1]))
        : new Set();
      permissions = allPermissions.filter((key) => !exclusions.has(key));
    } else {
      const permissionsMatch = block.match(/permissions:\s*\[([\s\S]*?)\]/);
      permissions = permissionsMatch ? quotedStrings(permissionsMatch[1]) : [];
    }

    roles.set(roleName, [...new Set(permissions)].sort());
  }

  return roles;
}

function assertNoDuplicates(label, values) {
  const duplicates = duplicateValues(values);
  if (duplicates.length === 0) return 0;

  console.error(`[FAIL] Duplicate ${label}:`);
  for (const value of duplicates) console.error(`  - ${value}`);
  return duplicates.length;
}

function compareSets(label, left, right) {
  const missingFromRight = difference(left, right);
  const missingFromLeft = difference(right, left);
  let problems = 0;

  if (missingFromRight.length > 0) {
    console.error(`[FAIL] ${label}: missing from right side:`);
    for (const value of missingFromRight) console.error(`  - ${value}`);
    problems += missingFromRight.length;
  }

  if (missingFromLeft.length > 0) {
    console.error(`[FAIL] ${label}: missing from left side:`);
    for (const value of missingFromLeft) console.error(`  - ${value}`);
    problems += missingFromLeft.length;
  }

  return problems;
}

let exitCode = 0;
let hasWarn = false;

// 1. Extract actions from source with metadata
const sourceActions = new Map();
const files = trackedFiles("packages").filter(
  (file) => file.endsWith(".ts") && !file.includes("/__tests__/"),
);

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

// 5. Permission registry consistency
let registryProblems = 0;

if (!existsSync(SEED_PATH)) {
  console.error(`[FAIL] packages/database/prisma/seed.ts not found`);
  registryProblems++;
}

if (!existsSync(SYSTEM_ROLES_PATH)) {
  console.error(`[FAIL] packages/database/src/system-roles.ts not found`);
  registryProblems++;
}

if (registryProblems === 0) {
  const seedContent = readFileSync(SEED_PATH, "utf-8");
  const systemRolesContent = readFileSync(SYSTEM_ROLES_PATH, "utf-8");

  const seedPermissions = extractPermissionKeys(seedContent);
  const systemPermissions = extractPermissionKeys(systemRolesContent);

  registryProblems += assertNoDuplicates(
    "permission keys in seed.ts",
    seedPermissions,
  );
  registryProblems += assertNoDuplicates(
    "permission keys in system-roles.ts",
    systemPermissions,
  );

  registryProblems += compareSets(
    "Permission registry mismatch (seed.ts ↔ system-roles.ts)",
    seedPermissions,
    systemPermissions,
  );

  const seedRoles = parseRoleDefinitions(
    seedContent,
    "const ROLES",
    seedPermissions,
  );
  const systemRoles = parseRoleDefinitions(
    systemRolesContent,
    "const SYSTEM_ROLES",
    systemPermissions,
  );
  const knownRoles = new Set(systemRoles.keys());
  const knownPermissions = new Set(systemPermissions);

  for (const [actionName, action] of sourceActions) {
    for (const role of action.roles) {
      if (!knownRoles.has(role)) {
        console.error(
          `[FAIL] ${actionName}: action allowedRole "${role}" is not a system role`,
        );
        registryProblems++;
      }
    }
  }

  registryProblems += compareSets(
    "Role registry mismatch (seed.ts ↔ system-roles.ts)",
    [...seedRoles.keys()],
    [...systemRoles.keys()],
  );

  for (const [roleName, seedRolePermissions] of seedRoles) {
    const systemRolePermissions = systemRoles.get(roleName);
    if (!systemRolePermissions) continue;

    registryProblems += compareSets(
      `Role permission mismatch for ${roleName} (seed.ts ↔ system-roles.ts)`,
      seedRolePermissions,
      systemRolePermissions,
    );

    for (const permission of seedRolePermissions) {
      if (!knownPermissions.has(permission)) {
        console.error(
          `[FAIL] ${roleName}: seed.ts references unknown permission "${permission}"`,
        );
        registryProblems++;
      }
    }
  }

  for (const [roleName, systemRolePermissions] of systemRoles) {
    for (const permission of systemRolePermissions) {
      if (!knownPermissions.has(permission)) {
        console.error(
          `[FAIL] ${roleName}: system-roles.ts references unknown permission "${permission}"`,
        );
        registryProblems++;
      }
    }
  }

  const routeFiles = trackedFiles("apps/web/app/api").filter((file) =>
    file.endsWith("route.ts"),
  );
  const guardRegex = /withApiPermission\s*\(\s*[^,]+,\s*["']([^"']+)["']/g;
  const executeActionRegex =
    /executeAction(?:\s*<[\s\S]*?>)?\s*\(\s*([`"'])([^`"']+)\1/g;
  let guardedRoutes = 0;
  let routeActionCalls = 0;

  for (const file of routeFiles) {
    const content = readFileSync(resolve(ROOT, file), "utf-8");
    const routePermissions = [...content.matchAll(guardRegex)].map(
      (match) => match[1],
    );
    const routeActions = [...content.matchAll(executeActionRegex)].map(
      (match) => match[2],
    );

    guardedRoutes += routePermissions.length;
    routeActionCalls += routeActions.length;

    for (const permission of routePermissions) {
      if (!knownPermissions.has(permission)) {
        console.error(
          `[FAIL] ${file}: route guard references unknown permission "${permission}"`,
        );
        registryProblems++;
      }
    }

    for (const actionName of routeActions) {
      if (!sourceActions.has(actionName)) {
        console.error(
          `[FAIL] ${file}: executeAction references unregistered action "${actionName}"`,
        );
        registryProblems++;
      }
    }
  }

  if (registryProblems === 0) {
    console.log(
      `[PASS] Permission registry is consistent across seed.ts, system-roles.ts, ${guardedRoutes} API guard(s), and ${routeActionCalls} route action call(s).`,
    );
  } else {
    console.error(
      `\n[FAIL] ${registryProblems} permission registry consistency problem(s) found.`,
    );
    exitCode = 1;
  }
}

const totalSource = sourceNames.size;
const totalDoc = docNames.size;
console.log(`\nSource: ${totalSource} actions | Doc: ${totalDoc} actions`);

process.exit(exitCode);
