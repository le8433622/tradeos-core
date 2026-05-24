import { NextResponse } from "next/server";
import { assertPermission } from "@tradeos/policy-core";
import {
  assertRole,
  requireSessionFromRequest,
  type SessionContext,
} from "@tradeos/auth";
import type { UserRole } from "@tradeos/database";
import { createLogger, getRequestId } from "./logger";

const ERROR_MESSAGES: Record<string, { en: string; vi: string }> = {
  AUTH_REQUIRED: {
    en: "You need to sign in to access this page.",
    vi: "Bạn cần đăng nhập để truy cập trang này.",
  },
  ROLE_ACCESS_DENIED: {
    en: "You do not have permission to perform this action.",
    vi: "Bạn không có quyền thực hiện hành động này.",
  },
  ORGANIZATION_ACCESS_DENIED: {
    en: "This resource does not belong to your organization.",
    vi: "Tài nguyên này không thuộc về tổ chức của bạn.",
  },
  INTERNAL_ERROR: {
    en: "Something went wrong. Please try again later.",
    vi: "Đã xảy ra lỗi. Vui lòng thử lại sau.",
  },
  INVALID_REQUEST_BODY: {
    en: "The request could not be processed. Please check your input.",
    vi: "Yêu cầu không thể xử lý. Vui lòng kiểm tra dữ liệu nhập.",
  },
  INVALID_APPROVAL_TRANSITION: {
    en: "This approval request cannot be processed in its current state.",
    vi: "Yêu cầu phê duyệt này không thể xử lý ở trạng thái hiện tại.",
  },
  ORGANIZATION_NOT_FOUND: {
    en: "Organization not found.",
    vi: "Không tìm thấy tổ chức.",
  },
  LEAD_NOT_FOUND: {
    en: "Lead not found.",
    vi: "Không tìm thấy khách hàng tiềm năng.",
  },
  COMPANY_NOT_FOUND: {
    en: "Company not found.",
    vi: "Không tìm thấy công ty.",
  },
  CONTACT_NOT_FOUND: {
    en: "Contact not found.",
    vi: "Không tìm thấy liên hệ.",
  },
  PRODUCT_NOT_FOUND: {
    en: "Product not found.",
    vi: "Không tìm thấy sản phẩm.",
  },
  QUOTATION_NOT_FOUND: {
    en: "Quotation not found.",
    vi: "Không tìm thấy báo giá.",
  },
  TASK_NOT_FOUND: { en: "Task not found.", vi: "Không tìm thấy công việc." },
  APPROVAL_REQUEST_NOT_FOUND: {
    en: "Approval request not found.",
    vi: "Không tìm thấy yêu cầu phê duyệt.",
  },
  CONVERSATION_NOT_FOUND: {
    en: "Conversation not found.",
    vi: "Không tìm thấy hội thoại.",
  },
  WEBHOOK_EVENT_NOT_FOUND: {
    en: "Webhook event not found.",
    vi: "Không tìm thấy sự kiện webhook.",
  },
  SNAPSHOT_NOT_FOUND: {
    en: "Report snapshot not found.",
    vi: "Không tìm thấy báo cáo.",
  },
  SNAPSHOT_ACCESS_DENIED: {
    en: "You do not have access to this report.",
    vi: "Bạn không có quyền truy cập báo cáo này.",
  },
  SNAPSHOT_ALREADY_PROCESSED: {
    en: "This snapshot has already been approved.",
    vi: "Báo cáo này đã được phê duyệt.",
  },
  INVALID_AVG_DEAL_VALUE: {
    en: "Average deal value must be a positive number.",
    vi: "Giá trị giao dịch trung bình phải là số dương.",
  },
  INVALID_CONVERSION_RATE: {
    en: "Conversion rate must be between 0 and 1.",
    vi: "Tỷ lệ chuyển đổi phải từ 0 đến 1.",
  },
  INVALID_AI_BUDGET: {
    en: "AI budget must be a positive number.",
    vi: "Ngân sách AI phải là số dương.",
  },
  INVALID_PLAN: {
    en: "Invalid plan selected.",
    vi: "Gói dịch vụ không hợp lệ.",
  },
  WEBHOOK_SECRET_INVALID: {
    en: "Webhook verification failed.",
    vi: "Xác thực webhook thất bại.",
  },
  WEBHOOK_SECRET_NOT_CONFIGURED: {
    en: "Webhook secret is not configured on the server.",
    vi: "Mã bí mật webhook chưa được cấu hình.",
  },
  WEBHOOK_UNAUTHORIZED: {
    en: "Webhook verification failed.",
    vi: "Xác thực webhook thất bại.",
  },
  WEBHOOK_TENANT_HEADER_DISABLED: {
    en: "Webhook tenant header is disabled in production.",
    vi: "Header tenant webhook đã bị tắt trong production.",
  },
  EVENT_KEY_CONFLICT: {
    en: "This event has already been processed.",
    vi: "Sự kiện này đã được xử lý trước đó.",
  },
  USER_NOT_MAPPED_TO_TENANT: {
    en: "Your account has not been set up yet. Please contact your organization admin.",
    vi: "Tài khoản của bạn chưa được thiết lập. Vui lòng liên hệ quản trị viên.",
  },
  UNKNOWN_ACTION: {
    en: "The requested action is not available.",
    vi: "Hành động yêu cầu không khả dụng.",
  },
  ACTION_BLOCKED: {
    en: "This action was blocked by security policy.",
    vi: "Hành động này đã bị chặn bởi chính sách bảo mật.",
  },
  APPROVAL_REQUEST_REQUIRED: {
    en: "This action requires an approval request first.",
    vi: "Hành động này cần yêu cầu phê duyệt trước.",
  },
  MFA_REQUIRED: {
    en: "Multi-factor authentication is required for this action. Please enroll in MFA in Security settings.",
    vi: "Yêu cầu xác thực đa yếu tố cho hành động này. Vui lòng đăng ký MFA trong phần Bảo mật.",
  },
  LEGAL_HOLD_ACTIVE: {
    en: "Privacy changes are blocked while legal hold is active.",
    vi: "Không thể thay đổi quyền riêng tư khi legal hold đang bật.",
  },
  INVALID_QUOTATION_ITEM_QUANTITY: {
    en: "Quotation item quantity must be greater than zero.",
    vi: "Số lượng dòng báo giá phải lớn hơn 0.",
  },
  INVALID_QUOTATION_ITEM_PRICE: {
    en: "Quotation item price must be zero or greater.",
    vi: "Đơn giá dòng báo giá phải lớn hơn hoặc bằng 0.",
  },
  ENTITLEMENT_EXCEEDED: {
    en: "Your current plan limit has been reached. Please upgrade your plan or contact support.",
    vi: "Gói hiện tại đã đạt giới hạn sử dụng. Vui lòng nâng cấp gói hoặc liên hệ hỗ trợ.",
  },
  CHECKPOINT_EVIDENCE_REQUIRED: {
    en: "Evidence is required before this checkpoint can be approved for billing.",
    vi: "Cần có bằng chứng trước khi phê duyệt checkpoint để tính tiền.",
  },
  CHECKPOINT_NOT_DELIVERED: {
    en: "Checkpoint must be delivered before approval.",
    vi: "Checkpoint phải được bàn giao trước khi phê duyệt.",
  },
  CHECKPOINT_NOT_APPROVED: {
    en: "Checkpoint must be approved before billing.",
    vi: "Checkpoint phải được phê duyệt trước khi ghi nhận tính tiền.",
  },
  CHECKPOINT_NOT_BILLED: {
    en: "Checkpoint must be billed before recording payment.",
    vi: "Checkpoint phải được ghi nhận tính tiền trước khi ghi nhận thanh toán.",
  },
  SUPPLIER_CANDIDATE_RUN_MISMATCH: {
    en: "Supplier candidate does not belong to this sourcing run.",
    vi: "Nhà cung cấp không thuộc về đợt sourcing này.",
  },
};

const DEFAULT_MESSAGE = {
  en: "An unexpected error occurred. Please try again.",
  vi: "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.",
};

const RETRYABLE_CODES = new Set([
  "WEBHOOK_SECRET_INVALID",
  "WEBHOOK_SECRET_NOT_CONFIGURED",
  "INTERNAL_ERROR",
  "EVENT_KEY_CONFLICT",
]);

function isRetryable(code: string): boolean {
  return RETRYABLE_CODES.has(code);
}

function getRetryGuidance(code: string): string | undefined {
  if (!isRetryable(code)) return undefined;
  if (code === "WEBHOOK_SECRET_INVALID")
    return "Check your webhook secret and try again.";
  if (code === "WEBHOOK_SECRET_NOT_CONFIGURED")
    return "Configure a webhook secret in your provider settings, then retry.";
  if (code === "INTERNAL_ERROR")
    return "Please try again in a few minutes. If the problem persists, contact support.";
  if (code === "EVENT_KEY_CONFLICT")
    return "This event was already processed. No action needed.";
  return undefined;
}

type ApiSessionResult =
  | { session: SessionContext; response?: never }
  | { session?: never; response: NextResponse };

type ClassifiedApiError = {
  status: number;
  publicCode: string;
  logCode: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "UNKNOWN_ERROR";
}

function getRequestPath(request: Request) {
  try {
    return new URL(request.url).pathname;
  } catch {
    return "unknown";
  }
}

function isSafeErrorCode(code: string) {
  return /^[A-Z0-9_]+$/.test(code) && code.length <= 80;
}

export function classifyApiError(error: unknown): ClassifiedApiError {
  if (error instanceof SyntaxError) {
    return {
      status: 400,
      publicCode: "INVALID_REQUEST_BODY",
      logCode: "INVALID_REQUEST_BODY",
    };
  }

  const code = getErrorMessage(error);

  if (code === "AUTH_REQUIRED" || code === "SUPABASE_TOKEN_INVALID") {
    return { status: 401, publicCode: "AUTH_REQUIRED", logCode: code };
  }

  if (code === "SUPABASE_AUTH_ENV_MISSING") {
    return { status: 500, publicCode: "INTERNAL_ERROR", logCode: code };
  }

  if (code === "ROLE_ACCESS_DENIED") {
    return { status: 403, publicCode: "ROLE_ACCESS_DENIED", logCode: code };
  }

  if (code === "PERMISSION_DENIED") {
    return { status: 403, publicCode: "ROLE_ACCESS_DENIED", logCode: code };
  }

  if (code === "MFA_REQUIRED") {
    return { status: 403, publicCode: "MFA_REQUIRED", logCode: code };
  }

  if (code === "LEGAL_HOLD_ACTIVE") {
    return { status: 403, publicCode: "LEGAL_HOLD_ACTIVE", logCode: code };
  }

  if (code === "UNKNOWN_ACTION") {
    return { status: 400, publicCode: "UNKNOWN_ACTION", logCode: code };
  }

  if (code === "ENTITLEMENT_EXCEEDED") {
    return { status: 402, publicCode: "ENTITLEMENT_EXCEEDED", logCode: code };
  }

  if (code === "SUPPLIER_CANDIDATE_RUN_MISMATCH") {
    return {
      status: 403,
      publicCode: "ORGANIZATION_ACCESS_DENIED",
      logCode: code,
    };
  }

  if (
    code === "WEBHOOK_UNAUTHORIZED" ||
    code === "WEBHOOK_TENANT_HEADER_DISABLED"
  ) {
    return { status: 401, publicCode: code, logCode: code };
  }

  if (code.startsWith("INVALID_APPROVAL_TRANSITION")) {
    return {
      status: 400,
      publicCode: "INVALID_APPROVAL_TRANSITION",
      logCode: "INVALID_APPROVAL_TRANSITION",
    };
  }

  if (
    code === "ORGANIZATION_ACCESS_DENIED" ||
    code === "USER_NOT_MAPPED_TO_TENANT" ||
    code.endsWith("_ACCESS_DENIED") ||
    code.endsWith("_BELONGS_TO_ANOTHER_ORGANIZATION") ||
    code.endsWith("_ORG_MISMATCH")
  ) {
    return {
      status: 403,
      publicCode: "ORGANIZATION_ACCESS_DENIED",
      logCode: code,
    };
  }

  if (isSafeErrorCode(code) && code.endsWith("_NOT_FOUND")) {
    return { status: 404, publicCode: code, logCode: code };
  }

  if (
    isSafeErrorCode(code) &&
    (code.endsWith("_REQUIRED") ||
      code.endsWith("_INVALID") ||
      code.endsWith("_MISSING"))
  ) {
    return { status: 400, publicCode: code, logCode: code };
  }

  if (isSafeErrorCode(code) && code.startsWith("CHECKPOINT_")) {
    return { status: 400, publicCode: code, logCode: code };
  }

  return {
    status: 500,
    publicCode: "INTERNAL_ERROR",
    logCode: "UNEXPECTED_ERROR",
  };
}

/**
 * Returns a user-facing error message for a given error code.
 */
export function getUserFacingError(
  errorCode: string,
  locale: "en" | "vi" = "en",
): string {
  const entry = ERROR_MESSAGES[errorCode] ?? DEFAULT_MESSAGE;
  return entry[locale];
}

export function apiErrorResponse(
  request: Request,
  error: unknown,
  options?: { includeDiagnostics?: boolean },
) {
  const classified = classifyApiError(error);
  const requestId = getRequestId(request);
  const logger = createLogger(requestId);
  logger.error("[api:error]", {
    path: getRequestPath(request),
    code: classified.logCode,
    status: classified.status,
  });

  const body: Record<string, unknown> = {
    error: classified.publicCode,
    message: getUserFacingError(classified.publicCode),
    retryable: isRetryable(classified.publicCode),
    retryGuidance: getRetryGuidance(classified.publicCode),
    requestId,
  };

  if (options?.includeDiagnostics) {
    body.diagnostic = {
      logCode: classified.logCode,
      path: getRequestPath(request),
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
      detail: error instanceof Error ? error.message : undefined,
    };
  }

  return NextResponse.json(body, {
    status: classified.status,
    headers: { "X-Request-Id": requestId },
  });
}

export async function withApiSession(
  request: Request,
  allowedRoles?: UserRole[],
  options?: { includeDiagnostics?: boolean },
): Promise<ApiSessionResult> {
  try {
    const session = await requireSessionFromRequest(request);
    if (allowedRoles) {
      assertRole(session, allowedRoles);
    }
    return { session };
  } catch (error) {
    return { response: apiErrorResponse(request, error, options) };
  }
}

export async function withApiPermission(
  request: Request,
  requiredPermission: string,
  options?: { includeDiagnostics?: boolean },
): Promise<ApiSessionResult> {
  try {
    const session = await requireSessionFromRequest(request);
    assertPermission(session.permissions, requiredPermission);
    return { session };
  } catch (error) {
    return { response: apiErrorResponse(request, error, options) };
  }
}
