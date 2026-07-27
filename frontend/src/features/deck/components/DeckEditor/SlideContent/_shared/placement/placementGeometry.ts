/**
 * Pointer coordinates ⇄ normalized placement space, for every placement editor.
 *
 * Two orientations exist because the two grading spaces differ: Axis measures
 * from the plane's low/low corner (bottom-left as rendered, so the screen y
 * axis is inverted), Place-on-Image measures from the image's top-left like
 * the browser does. `invertY` is the only difference, and it is passed — never
 * inferred — so a surface's orientation is stated at its one call site.
 */
import { clamp01 } from "@deck/utils/placement";
import type { NormalizedPoint } from "./placement.types";

/** Pointer travel (px) below which a marker press counts as a tap, not a drag. */
const DRAG_THRESHOLD_PX = 4;

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

export { DRAG_THRESHOLD_PX, clamp01, normalizeToBox, toRenderStyle };
