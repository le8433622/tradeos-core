import { describe, expect, it } from "vitest";
import {
  getSafeInternalPath,
  isWorkspaceChooserPath,
} from "../safe-next-path";

describe("getSafeInternalPath", () => {
  it("preserves a same-origin path with query and hash", () => {
    expect(
      getSafeInternalPath("/buyer/reports?status=ready#latest"),
    ).toBe("/buyer/reports?status=ready#latest");
  });

  it("rejects protocol-relative redirects", () => {
    expect(getSafeInternalPath("//evil.example")).toBe("/");
  });

  it("rejects backslash-based authority redirects", () => {
    expect(getSafeInternalPath("/\\\\evil.example")).toBe("/");
    expect(getSafeInternalPath("/\\evil.example")).toBe("/");
  });

  it("rejects encoded forward and backward path separators", () => {
    expect(getSafeInternalPath("/%2f%2fevil.example")).toBe("/");
    expect(getSafeInternalPath("/%5c%5cevil.example")).toBe("/");
  });

  it("rejects absolute external URLs and paths without a leading slash", () => {
    expect(getSafeInternalPath("https://evil.example/path")).toBe("/");
    expect(getSafeInternalPath("buyer/reports")).toBe("/");
  });

  it("rejects control characters and leading or trailing whitespace", () => {
    expect(getSafeInternalPath("/buyer\n/reports")).toBe("/");
    expect(getSafeInternalPath(" /buyer/reports")).toBe("/");
    expect(getSafeInternalPath("/buyer/reports ")).toBe("/");
  });

  it("rejects oversized redirect values", () => {
    expect(getSafeInternalPath(`/${"a".repeat(2048)}`)).toBe("/");
  });

  it("uses the supplied fallback for invalid values", () => {
    expect(getSafeInternalPath("/\\evil.example", "/dashboard")).toBe(
      "/dashboard",
    );
    expect(getSafeInternalPath(null, "/dashboard")).toBe("/dashboard");
  });
});

describe("isWorkspaceChooserPath", () => {
  it("matches the chooser path and descendants", () => {
    expect(isWorkspaceChooserPath("/choose-workspace")).toBe(true);
    expect(isWorkspaceChooserPath("/choose-workspace?next=/")).toBe(true);
    expect(isWorkspaceChooserPath("/choose-workspace/org/a")).toBe(true);
  });

  it("does not match similarly named paths", () => {
    expect(isWorkspaceChooserPath("/choose-workspace-other")).toBe(false);
    expect(isWorkspaceChooserPath("/dashboard")).toBe(false);
  });
});
