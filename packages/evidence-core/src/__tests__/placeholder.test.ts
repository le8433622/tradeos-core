import { describe, it, expect } from "vitest";

describe("evidence-core", () => {
  it("exports createEvidenceItemAction", async () => {
    const { createEvidenceItemAction } = await import("../index");
    expect(createEvidenceItemAction).toBeDefined();
    expect(createEvidenceItemAction.name).toBe("evidence.createItem");
  });

  it("exports evidenceAttachToRunAction", async () => {
    const { evidenceAttachToRunAction } = await import("../index");
    expect(evidenceAttachToRunAction).toBeDefined();
    expect(evidenceAttachToRunAction.name).toBe("evidence.attachToRun");
  });

  it("exports evidenceExportLedgerAction", async () => {
    const { evidenceExportLedgerAction } = await import("../index");
    expect(evidenceExportLedgerAction).toBeDefined();
    expect(evidenceExportLedgerAction.name).toBe("evidence.exportLedger");
  });
});
