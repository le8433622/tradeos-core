"use client";

import { getUserFacingError } from "../lib/api-errors";

type ErrorBannerProps = {
  errorCode?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export default function ErrorBanner({
  errorCode,
  message,
  onRetry,
  retryLabel = "Retry",
}: ErrorBannerProps) {
  const humanMessage = errorCode
    ? getUserFacingError(errorCode, "en")
    : message || "An unexpected error occurred.";

  return (
    <div
      style={{
        background: "#fef2f2",
        border: "1px solid #fecaca",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <p style={{ margin: 0, color: "#991b1b", fontWeight: 600, fontSize: 14 }}>
        {humanMessage}
      </p>
      {errorCode && (
        <p style={{ margin: "4px 0 0", color: "#b91c1c", fontSize: 12 }}>
          Code: {errorCode}
        </p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: 8,
            padding: "6px 14px",
            background: "#991b1b",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
