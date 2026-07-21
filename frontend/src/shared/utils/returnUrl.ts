// Client-side mirror of the backend ReturnUrlValidator (auth README Inv 2).
// A returnUrl is attacker-influenceable wherever it rides in a URL (e.g.
// `/register?returnUrl=…`), and several callers feed it straight into
// `window.location.assign` — so it must never be allowed to leave the origin.

/**
 * Returns `value` if it is a safe same-origin absolute path, otherwise
 * `undefined`, letting the caller apply its own fallback.
 *
 * Character-prefix checks are not enough here (Inv 2's own warning): the
 * WHATWG URL parser strips embedded tab/CR/LF before parsing, so a value like
 * `"/\t/evil.tld"` survives naive `//`-prefix rejection yet navigates
 * off-origin. Instead, resolve the value exactly as the browser will and
 * accept it only when the resulting origin is our own.
 */
export function toLocalReturnUrl(value: string | undefined): string | undefined {
  // Require the absolute-path shape up front — a bare relative like "decks"
  // would resolve same-origin below but is never a valid returnUrl.
  if (!value || !value.startsWith("/")) return undefined;
  let resolved: URL;
  try {
    resolved = new URL(value, window.location.origin);
  } catch {
    return undefined;
  }
  if (resolved.origin !== window.location.origin) return undefined;
  return value;
}
