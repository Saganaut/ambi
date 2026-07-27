// Normalized-coordinate guards shared by the placement editors' hooks (Axis,
// Place-on-Image).
//
// Every placement answer key is stored as normalized [0, 1] coordinates — the
// space the graders measure in — so the hooks clamp on the way in rather than
// trusting whatever a surface or a legacy wire payload hands them.

/** Clamp to the normalized placement space so a coordinate can never leave [0, 1]. */
const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** Clamp both coordinates of a point into the normalized placement space. */
const clampPoint = <T extends { x: number; y: number }>(point: T): T => ({
  ...point,
  x: clamp01(point.x),
  y: clamp01(point.y),
});

export { clamp01, clampPoint };
