/**
 * Pulls a user-readable message out of an RTK Query error.
 * The backend sends errors as RFC 9457 ProblemDetail (`{ detail, code, status, ... }`),
 * which RTK Query exposes on `error.data` — `detail` is the user-facing message.
 * The legacy `{ message }` / `{ error }` shapes are still read so any not-yet-migrated
 * path keeps working. Falls back to the network status code, then the supplied string.
 * See z-docs/features/exceptions.md.
 */
export function extractErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback;
  const e = error as {
    data?: { detail?: string; message?: string; error?: string; code?: string };
    error?: string;
    message?: string;
    status?: number | string;
  };
  if (e.data?.detail) return e.data.detail;
  if (e.data?.message) return e.data.message;
  if (e.data?.error) return e.data.error;
  if (typeof e.error === "string") return e.error;
  if (e.message) return e.message;
  if (e.status !== undefined) return `${fallback} (status ${String(e.status)})`;
  return fallback;
}

export function truncateText(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}

export function camelToNormalCase(str: string): string {
  if (!str) return str;

  let result = str.charAt(0).toUpperCase();

  for (let i = 1; i < str.length; i++) {
    const char = str.charAt(i);
    if (char === char.toUpperCase() && char !== char.toLowerCase()) {
      // It's an uppercase letter
      result += " " + char.toLowerCase();
    } else {
      result += char;
    }
  }

  return result;
}
