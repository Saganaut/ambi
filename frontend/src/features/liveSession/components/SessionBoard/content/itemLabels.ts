/**
 * The label fallbacks every board shares. An authored label may be absent or
 * blank (the editor allows a bare disc, an image-only card), yet the board must
 * still name the thing — a chip, cell or card is a button, and a button without
 * an accessible name is unusable to anyone not looking at it.
 *
 * Two shapes cover every call site: a fixed fallback ("Item", a scale's numeric
 * anchor, an axis endpoint) and a 1-based indexed one ("Row 2", "Card 3").
 */

/** {@link label} trimmed, or {@link fallback} when it is absent or blank. */
const labelOrFallback = (label: string | undefined, fallback: string): string =>
  label?.trim() || fallback;

/**
 * {@link label} trimmed, or `"<noun> <index + 1>"` — the 1-based position the
 * viewer sees, not the 0-based one the code counts in.
 */
const indexedLabel = (label: string | undefined, noun: string, index: number): string =>
  labelOrFallback(label, `${noun} ${(index + 1).toString()}`);

export { indexedLabel, labelOrFallback };
