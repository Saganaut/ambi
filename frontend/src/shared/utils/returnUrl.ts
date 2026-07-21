// Client-side mirror of the backend ReturnUrlValidator (auth README Inv 2).
// A returnUrl is attacker-influenceable wherever it rides in a URL (e.g.
// `/register?returnUrl=…`), and several callers feed it straight into
// `window.location.assign` — so it must never be allowed to leave the origin.

/**
 * Returns `value` if it is a safe same-origin absolute path — single leading
 * "/" with no protocol-relative ("//host") or backslash ("/\host") tricks —
 * otherwise `undefined`, letting the caller apply its own fallback.
 */
export function toLocalReturnUrl(value: string | undefined): string | undefined {
  if (!value || !value.startsWith("/")) return undefined;
  const second = value.charAt(1);
  if (second === "/" || second === "\\") return undefined;
  return value;
}
