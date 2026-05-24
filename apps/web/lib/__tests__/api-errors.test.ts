import { describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((body, init) => ({ body, init })),
  },
}));

vi.mock("@tradeos/policy-core", () => ({
  assertPermission: vi.fn(),
}));

vi.mock("@tradeos/auth", () => ({
  assertRole: vi.fn(),
  requireSessionFromRequest: vi.fn(),
}));

vi.mock("../logger", () => ({
  createLogger: vi.fn(() => ({
    error: vi.fn(),
  })),
  getRequestId: vi.fn(() => "test-request-id"),
}));

import { classifyApiError, getUserFacingError } from "../api-errors";

describe("classifyApiError", () => {
  it("returns 401 for AUTH_REQUIRED", () => {
    const result = classifyApiError(new Error("AUTH_REQUIRED"));
    expect(result).toEqual({
      status: 401,
      publicCode: "AUTH_REQUIRED",
      logCode: "AUTH_REQUIRED",
    });
  });

  it("returns 401 for SUPABASE_TOKEN_INVALID", () => {
    const result = classifyApiError(new Error("SUPABASE_TOKEN_INVALID"));
    expect(result).toEqual({
      status: 401,
      publicCode: "AUTH_REQUIRED",
      logCode: "SUPABASE_TOKEN_INVALID",
    });
  });

  it("returns 500 for SUPABASE_AUTH_ENV_MISSING", () => {
    const result = classifyApiError(new Error("SUPABASE_AUTH_ENV_MISSING"));
    expect(result).toEqual({
      status: 500,
      publicCode: "INTERNAL_ERROR",
      logCode: "SUPABASE_AUTH_ENV_MISSING",
    });
  });

  it("returns 403 for ROLE_ACCESS_DENIED", () => {
    const result = classifyApiError(new Error("ROLE_ACCESS_DENIED"));
    expect(result).toEqual({
      status: 403,
      publicCode: "ROLE_ACCESS_DENIED",
      logCode: "ROLE_ACCESS_DENIED",
    });
  });

  it("returns 403 for PERMISSION_DENIED", () => {
    const result = classifyApiError(new Error("PERMISSION_DENIED"));
    expect(result).toEqual({
      status: 403,
      publicCode: "ROLE_ACCESS_DENIED",
      logCode: "PERMISSION_DENIED",
    });
  });

  it("returns 403 for MFA_REQUIRED", () => {
    const result = classifyApiError(new Error("MFA_REQUIRED"));
    expect(result).toEqual({
      status: 403,
      publicCode: "MFA_REQUIRED",
      logCode: "MFA_REQUIRED",
    });
  });

  it("returns 403 for LEGAL_HOLD_ACTIVE", () => {
    const result = classifyApiError(new Error("LEGAL_HOLD_ACTIVE"));
    expect(result).toEqual({
      status: 403,
      publicCode: "LEGAL_HOLD_ACTIVE",
      logCode: "LEGAL_HOLD_ACTIVE",
    });
  });

  it("returns 400 for UNKNOWN_ACTION", () => {
    const result = classifyApiError(new Error("UNKNOWN_ACTION"));
    expect(result).toEqual({
      status: 400,
      publicCode: "UNKNOWN_ACTION",
      logCode: "UNKNOWN_ACTION",
    });
  });

  it("returns 402 for ENTITLEMENT_EXCEEDED", () => {
    const result = classifyApiError(new Error("ENTITLEMENT_EXCEEDED"));
    expect(result).toEqual({
      status: 402,
      publicCode: "ENTITLEMENT_EXCEEDED",
      logCode: "ENTITLEMENT_EXCEEDED",
    });
  });

  it("returns 403 for SUPPLIER_CANDIDATE_RUN_MISMATCH (maps to ORGANIZATION_ACCESS_DENIED)", () => {
    const result = classifyApiError(
      new Error("SUPPLIER_CANDIDATE_RUN_MISMATCH"),
    );
    expect(result).toEqual({
      status: 403,
      publicCode: "ORGANIZATION_ACCESS_DENIED",
      logCode: "SUPPLIER_CANDIDATE_RUN_MISMATCH",
    });
  });

  it("returns 401 for WEBHOOK_UNAUTHORIZED", () => {
    const result = classifyApiError(new Error("WEBHOOK_UNAUTHORIZED"));
    expect(result).toEqual({
      status: 401,
      publicCode: "WEBHOOK_UNAUTHORIZED",
      logCode: "WEBHOOK_UNAUTHORIZED",
    });
  });

  it("returns 401 for WEBHOOK_TENANT_HEADER_DISABLED", () => {
    const result = classifyApiError(
      new Error("WEBHOOK_TENANT_HEADER_DISABLED"),
    );
    expect(result).toEqual({
      status: 401,
      publicCode: "WEBHOOK_TENANT_HEADER_DISABLED",
      logCode: "WEBHOOK_TENANT_HEADER_DISABLED",
    });
  });

  it("returns 400 for SyntaxError", () => {
    const result = classifyApiError(new SyntaxError("Unexpected token"));
    expect(result).toEqual({
      status: 400,
      publicCode: "INVALID_REQUEST_BODY",
      logCode: "INVALID_REQUEST_BODY",
    });
  });

  it("returns 400 for INVALID_APPROVAL_TRANSITION", () => {
    const result = classifyApiError(
      new Error("INVALID_APPROVAL_TRANSITION: cannot approve in current state"),
    );
    expect(result).toEqual({
      status: 400,
      publicCode: "INVALID_APPROVAL_TRANSITION",
      logCode: "INVALID_APPROVAL_TRANSITION",
    });
  });

  it("returns 403 for ORGANIZATION_ACCESS_DENIED", () => {
    const result = classifyApiError(new Error("ORGANIZATION_ACCESS_DENIED"));
    expect(result).toEqual({
      status: 403,
      publicCode: "ORGANIZATION_ACCESS_DENIED",
      logCode: "ORGANIZATION_ACCESS_DENIED",
    });
  });

  it("returns 403 for errors ending with _ACCESS_DENIED", () => {
    const result = classifyApiError(new Error("BILLING_ACCESS_DENIED"));
    expect(result).toEqual({
      status: 403,
      publicCode: "ORGANIZATION_ACCESS_DENIED",
      logCode: "BILLING_ACCESS_DENIED",
    });
  });

  it("returns 403 for errors ending with _BELONGS_TO_ANOTHER_ORGANIZATION", () => {
    const result = classifyApiError(
      new Error("LEAD_BELONGS_TO_ANOTHER_ORGANIZATION"),
    );
    expect(result).toEqual({
      status: 403,
      publicCode: "ORGANIZATION_ACCESS_DENIED",
      logCode: "LEAD_BELONGS_TO_ANOTHER_ORGANIZATION",
    });
  });

  it("returns 403 for errors ending with _ORG_MISMATCH", () => {
    const result = classifyApiError(new Error("SUPPLIER_ORG_MISMATCH"));
    expect(result).toEqual({
      status: 403,
      publicCode: "ORGANIZATION_ACCESS_DENIED",
      logCode: "SUPPLIER_ORG_MISMATCH",
    });
  });

  it("returns 403 for USER_NOT_MAPPED_TO_TENANT", () => {
    const result = classifyApiError(new Error("USER_NOT_MAPPED_TO_TENANT"));
    expect(result).toEqual({
      status: 403,
      publicCode: "ORGANIZATION_ACCESS_DENIED",
      logCode: "USER_NOT_MAPPED_TO_TENANT",
    });
  });

  it("returns 404 for errors ending with _NOT_FOUND", () => {
    const result = classifyApiError(new Error("LEAD_NOT_FOUND"));
    expect(result).toEqual({ status: 404, publicCode: "LEAD_NOT_FOUND", logCode: "LEAD_NOT_FOUND" });
  });

  it("returns 404 for CHECKPOINT_NOT_FOUND", () => {
    const result = classifyApiError(new Error("CHECKPOINT_NOT_FOUND"));
    expect(result).toEqual({
      status: 404,
      publicCode: "CHECKPOINT_NOT_FOUND",
      logCode: "CHECKPOINT_NOT_FOUND",
    });
  });

  it("returns 400 for errors ending with _REQUIRED", () => {
    const result = classifyApiError(new Error("FIELD_REQUIRED"));
    expect(result).toEqual({ status: 400, publicCode: "FIELD_REQUIRED", logCode: "FIELD_REQUIRED" });
  });

  it("returns 400 for errors ending with _INVALID", () => {
    const result = classifyApiError(new Error("EMAIL_INVALID"));
    expect(result).toEqual({ status: 400, publicCode: "EMAIL_INVALID", logCode: "EMAIL_INVALID" });
  });

  it("returns 400 for errors ending with _MISSING", () => {
    const result = classifyApiError(new Error("HEADER_MISSING"));
    expect(result).toEqual({ status: 400, publicCode: "HEADER_MISSING", logCode: "HEADER_MISSING" });
  });

  it("returns 400 for CHECKPOINT_EVIDENCE_REQUIRED", () => {
    const result = classifyApiError(new Error("CHECKPOINT_EVIDENCE_REQUIRED"));
    expect(result).toEqual({
      status: 400,
      publicCode: "CHECKPOINT_EVIDENCE_REQUIRED",
      logCode: "CHECKPOINT_EVIDENCE_REQUIRED",
    });
  });

  it("returns 400 for CHECKPOINT_NOT_DELIVERED", () => {
    const result = classifyApiError(new Error("CHECKPOINT_NOT_DELIVERED"));
    expect(result).toEqual({
      status: 400,
      publicCode: "CHECKPOINT_NOT_DELIVERED",
      logCode: "CHECKPOINT_NOT_DELIVERED",
    });
  });

  it("returns 400 for CHECKPOINT_NOT_APPROVED", () => {
    const result = classifyApiError(new Error("CHECKPOINT_NOT_APPROVED"));
    expect(result).toEqual({
      status: 400,
      publicCode: "CHECKPOINT_NOT_APPROVED",
      logCode: "CHECKPOINT_NOT_APPROVED",
    });
  });

  it("returns 400 for CHECKPOINT_NOT_BILLED", () => {
    const result = classifyApiError(new Error("CHECKPOINT_NOT_BILLED"));
    expect(result).toEqual({
      status: 400,
      publicCode: "CHECKPOINT_NOT_BILLED",
      logCode: "CHECKPOINT_NOT_BILLED",
    });
  });

  it("returns 500 for unknown error", () => {
    const result = classifyApiError(new Error("some_random_error"));
    expect(result).toEqual({
      status: 500,
      publicCode: "INTERNAL_ERROR",
      logCode: "UNEXPECTED_ERROR",
    });
  });

  it("returns 500 for non-Error input", () => {
    const result = classifyApiError("raw string error");
    expect(result).toEqual({
      status: 500,
      publicCode: "INTERNAL_ERROR",
      logCode: "UNEXPECTED_ERROR",
    });
  });

  it("returns 500 for null input", () => {
    const result = classifyApiError(null);
    expect(result).toEqual({
      status: 500,
      publicCode: "INTERNAL_ERROR",
      logCode: "UNEXPECTED_ERROR",
    });
  });

  it("returns 500 for undefined input", () => {
    const result = classifyApiError(undefined);
    expect(result).toEqual({
      status: 500,
      publicCode: "INTERNAL_ERROR",
      logCode: "UNEXPECTED_ERROR",
    });
  });

  it("does not treat untrusted code as safe (over 80 chars)", () => {
    const result = classifyApiError(
      new Error("A".repeat(81)),
    );
    expect(result).toEqual({
      status: 500,
      publicCode: "INTERNAL_ERROR",
      logCode: "UNEXPECTED_ERROR",
    });
  });

  it("does not treat non-uppercase code as safe", () => {
    const result = classifyApiError(new Error("lead_not_found"));
    expect(result).toEqual({
      status: 500,
      publicCode: "INTERNAL_ERROR",
      logCode: "UNEXPECTED_ERROR",
    });
  });
});

describe("getUserFacingError", () => {
  it("returns English message by default", () => {
    expect(getUserFacingError("AUTH_REQUIRED")).toBe(
      "You need to sign in to access this page.",
    );
  });

  it("returns English message for 'en' locale", () => {
    expect(getUserFacingError("AUTH_REQUIRED", "en")).toBe(
      "You need to sign in to access this page.",
    );
  });

  it("returns Vietnamese message for 'vi' locale", () => {
    expect(getUserFacingError("AUTH_REQUIRED", "vi")).toBe(
      "Bạn cần đăng nhập để truy cập trang này.",
    );
  });

  it("returns default message for unknown error code", () => {
    expect(getUserFacingError("UNKNOWN_CODE")).toBe(
      "An unexpected error occurred. Please try again.",
    );
  });

  it("returns Vietnamese default for unknown code with 'vi' locale", () => {
    expect(getUserFacingError("UNKNOWN_CODE", "vi")).toBe(
      "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.",
    );
  });

  it("returns message for ENTITLEMENT_EXCEEDED", () => {
    expect(getUserFacingError("ENTITLEMENT_EXCEEDED")).toBe(
      "Your current plan limit has been reached. Please upgrade your plan or contact support.",
    );
  });

  it("returns Vietnamese message for CHECKPOINT_EVIDENCE_REQUIRED", () => {
    expect(getUserFacingError("CHECKPOINT_EVIDENCE_REQUIRED", "vi")).toBe(
      "Cần có bằng chứng trước khi phê duyệt checkpoint để tính tiền.",
    );
  });

  it("returns message for SUPPLIER_CANDIDATE_RUN_MISMATCH", () => {
    expect(getUserFacingError("SUPPLIER_CANDIDATE_RUN_MISMATCH")).toBe(
      "Supplier candidate does not belong to this sourcing run.",
    );
  });
});
