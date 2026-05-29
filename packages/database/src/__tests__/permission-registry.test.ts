import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

function readRepoFile(path: string): string {
  return readFileSync(resolve(ROOT, path), "utf-8");
}

describe("permission registry consistency", () => {
  it("fails pnpm test when docs and permission registries drift", () => {
    expect(() =>
      execFileSync(process.execPath, ["scripts/check-docs.mjs"], {
        cwd: ROOT,
        stdio: "pipe",
      }),
    ).not.toThrow();
  });

  it("covers buyer decisions, outcomes, and high-risk action docs", () => {
    const seed = readRepoFile("packages/database/prisma/seed.ts");
    const systemRoles = readRepoFile("packages/database/src/system-roles.ts");
    const actionRegistry = readRepoFile("docs/04_ACTION_REGISTRY.md");
    const buyerDecisionRoute = readRepoFile(
      "apps/web/app/api/sourcing-runs/[id]/decision/route.ts",
    );
    const outcomeRoute = readRepoFile(
      "apps/web/app/api/sourcing-runs/[id]/outcome/route.ts",
    );

    expect(seed).toContain('key: "buyerDecision.submit_assigned"');
    expect(systemRoles).toContain('key: "buyerDecision.submit_assigned"');
    expect(buyerDecisionRoute).toContain('"buyerDecision.submit_assigned"');
    expect(actionRegistry).toContain("`sourcing.submitBuyerDecision`");

    expect(outcomeRoute).toContain('"sourcing.recordOutcome"');
    expect(outcomeRoute).toContain('"sourcing.manage"');
    expect(actionRegistry).toContain("`sourcing.recordOutcome`");

    for (const line of actionRegistry.split("\n")) {
      if (line.includes("| HIGH |") || line.includes("| CRITICAL |")) {
        expect(line).toContain("| Yes");
        expect(line).toMatch(/OWNER/);
      }
    }
  });
});
