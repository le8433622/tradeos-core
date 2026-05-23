"use client";

import { useState, useCallback } from "react";
import ErrorBanner from "./error-banner";

type ApiError = {
  error: string;
  message?: string;
  retryable?: boolean;
  retryGuidance?: string;
};

type UseApiErrorReturn = {
  error: ApiError | null;
  setError: (err: unknown) => void;
  clearError: () => void;
  ErrorComponent: () => React.ReactNode;
};

export function useApiError(): UseApiErrorReturn {
  const [error, setErrorState] = useState<ApiError | null>(null);

  const setError = useCallback((err: unknown) => {
    if (err && typeof err === "object" && "error" in err) {
      setErrorState(err as ApiError);
    } else if (err instanceof Error) {
      setErrorState({ error: "UNKNOWN_ERROR", message: err.message });
    } else {
      setErrorState({
        error: "UNKNOWN_ERROR",
        message: "An unexpected error occurred.",
      });
    }
  }, []);

  const clearError = useCallback(() => setErrorState(null), []);

  const ErrorComponent = useCallback(() => {
    if (!error) return null;
    return (
      <ErrorBanner
        errorCode={error.error}
        message={error.message}
        onRetry={error.retryable ? clearError : undefined}
        retryLabel={error.retryable ? "Try again" : undefined}
      />
    );
  }, [error, clearError]);

  return { error, setError, clearError, ErrorComponent };
}
