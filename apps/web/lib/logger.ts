export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "INFO";

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[currentLevel];
}

export type Logger = {
  debug: (msg: string, extra?: Record<string, unknown>) => void;
  info: (msg: string, extra?: Record<string, unknown>) => void;
  warn: (msg: string, extra?: Record<string, unknown>) => void;
  error: (msg: string, extra?: Record<string, unknown>) => void;
};

export function createLogger(requestId?: string): Logger {
  const base = { requestId };
  return {
    debug: (msg, extra) => {
      if (!shouldLog("DEBUG")) return;
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "DEBUG",
          msg,
          ...base,
          ...extra,
        }),
      );
    },
    info: (msg, extra) => {
      if (!shouldLog("INFO")) return;
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "INFO",
          msg,
          ...base,
          ...extra,
        }),
      );
    },
    warn: (msg, extra) => {
      if (!shouldLog("WARN")) return;
      console.warn(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "WARN",
          msg,
          ...base,
          ...extra,
        }),
      );
    },
    error: (msg, extra) => {
      if (!shouldLog("ERROR")) return;
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "ERROR",
          msg,
          ...base,
          ...extra,
        }),
      );
    },
  };
}

export function getRequestId(request: Request): string {
  return request.headers.get("x-request-id") || crypto.randomUUID();
}

export function generateRequestId(): string {
  return crypto.randomUUID();
}
