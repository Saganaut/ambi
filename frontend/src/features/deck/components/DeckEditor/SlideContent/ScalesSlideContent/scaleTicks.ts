// Tick values for a scale track: min → max inclusive, stepping by `step`.
// Returns [] when the range is degenerate (no positive step, no span, fewer
// than two ticks) or too dense to render as tappable dots — callers fall back
// to a plain numeric input in that case.

/** Above this many ticks a dot track stops being tappable, so we bail out. */
const MAX_TRACK_TICKS = 11;

const scaleTicks = (min: number, max: number, step: number): number[] => {
  if (step <= 0 || max <= min) return [];
  // The epsilon absorbs float drift (e.g. 0.1 steps) so the last tick still
  // lands on max instead of being dropped.
  const count = Math.floor((max - min) / step + 1e-9) + 1;
  if (count < 2 || count > MAX_TRACK_TICKS) return [];
  return Array.from(
    { length: count },
    (_, i) => Math.round((min + i * step) * 1e6) / 1e6,
  );
};

export { MAX_TRACK_TICKS, scaleTicks };
