/**
 * The placement kit's gesture policy, plus the kit's import path for the shared
 * coordinate math.
 *
 * The conversions themselves live in `@utils/placementGeometry` — the boards
 * measure in the same normalized space, so they are not the editor's to own.
 * Only the drag threshold stays here: it is a feel decision about the editor's
 * pointer flow, not geometry.
 */
import { clamp01, normalizeToBox, toRenderStyle } from "@utils/placementGeometry";

/** Pointer travel (px) below which a marker press counts as a tap, not a drag. */
const DRAG_THRESHOLD_PX = 4;

export { DRAG_THRESHOLD_PX, clamp01, normalizeToBox, toRenderStyle };
