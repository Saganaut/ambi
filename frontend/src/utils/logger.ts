/**
 * Tiny leveled logger — the single seam between app code and wherever logs go.
 *
 * WHY THIS EXISTS: the frontend had ~57 scattered `console.*` calls and no error
 * reporting at all. Routing logging through one module means (a) dev gets
 * readable, level-prefixed console output, (b) production can be pointed at
 * Sentry by editing only this file (see the PROD SEAM below), and (c) every
 * record can carry structured context — most importantly the `traceId`
 * (X-Request-Id) shared with the backend, so a frontend log line ties to its
 * server-side log line. See z-docs/decisions/001-observability-stack.md.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

const isDev = import.meta.env.DEV;

function emit(level: LogLevel, message: string, context?: LogContext): void {
  if (isDev) {
    const sink =
      level === "debug"
        ? console.debug
        : level === "info"
          ? console.info
          : level === "warn"
            ? console.warn
            : console.error;
    if (context) sink(`[${level}] ${message}`, context);
    else sink(`[${level}] ${message}`);
    return;
  }

  // PROD SEAM — when @sentry/react is wired (deferred vendor phase), forward
  // here: Sentry.captureException for errors, captureMessage otherwise, passing
  // `context` as extras/tags. Until then, keep errors on console.error so they
  // still surface in the browser console and any RUM capture; stay quiet for
  // lower levels in production.
  if (level === "error") {
    if (context) console.error(message, context);
    else console.error(message);
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => {
    emit("debug", message, context);
  },
  info: (message: string, context?: LogContext) => {
    emit("info", message, context);
  },
  warn: (message: string, context?: LogContext) => {
    emit("warn", message, context);
  },
  error: (message: string, context?: LogContext) => {
    emit("error", message, context);
  },
};
