export interface LogEntry {
  level: "info" | "warn" | "error";
  message: string;
  timestamp: string;
  requestId?: string;
  organizationId?: string;
  userId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  error?: {
    name?: string;
    message: string;
    stack?: string;
    code?: string;
  };
  context?: Record<string, unknown>;
}

function emitLog(
  level: "info" | "warn" | "error",
  message: string,
  meta?: Partial<LogEntry>,
) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };
  const json = JSON.stringify(entry);
  if (level === "error") {
    process.stderr.write(`${json}\n`);
  } else {
    process.stdout.write(`${json}\n`);
  }
}

export const logger = {
  info(message: string, meta?: Partial<LogEntry>) {
    emitLog("info", message, meta);
  },
  warn(message: string, meta?: Partial<LogEntry>) {
    emitLog("warn", message, meta);
  },
  error(message: string, error?: unknown, meta?: Partial<LogEntry>) {
    const errorDetails =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error
          ? { message: String(error) }
          : undefined;
    emitLog("error", message, { ...meta, error: errorDetails });
  },
};
