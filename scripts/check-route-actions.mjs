#!/usr/bin/env node
// CI gate: verifies literal executeAction("...") calls in API routes refer to
// registered actions.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGES_DIR = resolve(ROOT, "packages");
const API_DIR = resolve(ROOT, "apps/web/app/api");

function walkFiles(dir, predicate, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = resolve(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry === "node_modules") continue;
      walkFiles(fullPath, predicate, files);
    } else if (predicate(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

const sourceFiles = walkFiles(
  PACKAGES_DIR,
  (file) => file.endsWith(".ts") && !file.includes("/__tests__/"),
);
const registeredActions = new Set();
const actionNameRegex =
  /name:\s*["']([a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)+)["']/g;

for (const file of sourceFiles) {
  const content = readFileSync(file, "utf8");
  if (!content.includes("registerAction")) continue;
  for (const match of content.matchAll(actionNameRegex)) {
    registeredActions.add(match[1]);
  }
}

const routeFiles = walkFiles(API_DIR, (file) => file.endsWith("route.ts"));
const executeActionRegex =
  /executeAction(?:\s*<[\s\S]*?>)?\s*\(\s*([`"'])([^`"']+)\1/g;
const missing = [];
let checked = 0;

for (const file of routeFiles) {
  const content = readFileSync(file, "utf8");
  for (const match of content.matchAll(executeActionRegex)) {
    checked++;
    const actionName = match[2];
    if (!registeredActions.has(actionName)) {
      missing.push({ file: relative(ROOT, file), actionName });
    }
  }
}

if (missing.length > 0) {
  console.error("[FAIL] API routes call actions that are not registered:");
  for (const item of missing) {
    console.error(`  - ${item.file}: ${item.actionName}`);
  }
  process.exit(1);
}

console.log(
  `[PASS] ${checked} executeAction route call(s) map to ${registeredActions.size} registered action(s).`,
);
