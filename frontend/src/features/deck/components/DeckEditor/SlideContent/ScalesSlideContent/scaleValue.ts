// Pure mapping between a scale's track and its units. The track is the
// normalized [0, 1] drag surface (0 = left end) — the same space the answer
// wire uses — while `min`/`max` bound the human-facing scale units every
// readout renders. Kept dependency-free so the editor and the live board can
// share one conversion.

/** Clamp to the normalized track so a position can never leave [0, 1]. */
const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** Denormalize a track position into scale units: `min + p · (max − min)`. */
const positionToValue = (position: number, min: number, max: number): number =>
  min + clamp01(position) * (max - min);

/**
 * Normalize a scale-unit value into a track position. A degenerate span
 * (max ≤ min) maps everything to the left end rather than dividing by zero.
 */
const valueToPosition = (value: number, min: number, max: number): number => {
  const span = max - min;
  if (span <= 0) return 0;
  return clamp01((value - min) / span);
};

/**
 * Human-facing readout for a scale-unit value: rounded to 2 decimals with
 * trailing zeros trimmed; integers render bare (4.5 → "4.5", 4 → "4").
 */
const formatScaleValue = (value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  // Normalize -0 (e.g. a tiny negative rounded away) to plain "0".
  return (rounded === 0 ? 0 : rounded).toString();
};

export { clamp01, formatScaleValue, positionToValue, valueToPosition };
