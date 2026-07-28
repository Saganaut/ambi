/**
 * Pointer coordinates ⇄ normalized placement space, for every surface that
 * stores a point as [0, 1] fractions of its own box — the deck editor's
 * placement kit and the live-session Axis / Place-on-Image boards alike, so an
 * authored point and the point a participant places are measured identically.
 *
 * Two orientations exist because the two grading spaces differ: Axis measures
 * from the plane's low/low corner (bottom-left as rendered, so the screen y
 * axis is inverted), Place-on-Image measures from the image's top-left like
 * the browser does. `invertY` is the only difference, and it is passed — never
 * inferred — so a surface's orientation is stated at its one call site.
 */

/** A coordinate pair in a surface's normalized [0, 1] placement space. */
interface NormalizedPoint {
  x: number;
  y: number;
}

/** Clamp to the normalized placement space so a coordinate can never leave [0, 1]. */
const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** Clamp both coordinates of a point into the normalized placement space. */
const clampPoint = <T extends NormalizedPoint>(point: T): T => ({
  ...point,
  x: clamp01(point.x),
  y: clamp01(point.y),
});

/**
 * Normalized point for a client position within `rect`, clamped to the box.
 * Null for a degenerate rect — an unmounted or zero-sized surface can't place.
 */
const normalizeToBox = (
  rect: DOMRect | undefined,
  clientX: number,
  clientY: number,
  invertY: boolean,
): NormalizedPoint | null => {
  if (!rect || rect.width === 0 || rect.height === 0) return null;
  const x = (clientX - rect.left) / rect.width;
  const fromTop = (clientY - rect.top) / rect.height;
  return { x: clamp01(x), y: clamp01(invertY ? 1 - fromTop : fromTop) };
};

/** Percentage `left`/`top` for a stored point, undoing `invertY` for the screen. */
const toRenderStyle = (
  point: NormalizedPoint,
  invertY: boolean,
): { left: string; top: string } => {
  const fromTop = invertY ? 1 - point.y : point.y;
  return {
    left: `${(point.x * 100).toString()}%`,
    top: `${(fromTop * 100).toString()}%`,
  };
};

export { clamp01, clampPoint, normalizeToBox, toRenderStyle };
export type { NormalizedPoint };
