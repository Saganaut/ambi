/**
 * Shared helpers for the live Drawing element kind.
 *
 * Strokes are stored on the wire as `{ color, thickness, points: [x0, y0, x1, y1, ...] }`
 * in logical canvas units (the element carries `canvasWidth`/`canvasHeight`).
 * Every rendering surface — the in-flight player canvas, the reveal grid mini
 * thumbnails, and the lightbox expand view — uses the same Douglas-Peucker
 * downsampler and the same `renderStrokes` blitter so a stroke captured at
 * one size always looks identical at another size.
 */
import type { Stroke } from "@/types/elements";

/**
 * Eight-swatch default palette used when a DrawingQuestion ships with no
 * author-specified palette. Resolved via CSS custom properties so the colors
 * track theme changes — `getComputedStyle` evaluates the hsl on demand at
 * render time. Falls back to literal hex on first paint before tokens.css
 * has been resolved (the canvas re-renders on the next stroke regardless).
 */
export const DEFAULT_DRAWING_PALETTE: readonly string[] = [
  "var(--violet-500)",
  "var(--orange-500)",
  "var(--cyan-500)",
  "var(--green-500)",
  "var(--yellow-500)",
  "var(--red-500)",
  "var(--blue-500)",
  "var(--grey-800)",
];

/** Default stroke thicknesses in logical units. */
export const STROKE_THICKNESSES: readonly number[] = [4, 8, 16, 32];

const STYLE_VAR_REGEX = /^var\((--[^)]+)\)$/;

/**
 * Resolve a palette entry to a renderable CSS color string. Strings starting
 * with `var(--…)` look the variable up on the document root; everything else
 * (hex, oklch, rgb) is returned as-is.
 */
export const resolvePaletteColor = (raw: string): string => {
  const match = STYLE_VAR_REGEX.exec(raw.trim());
  if (!match) return raw;
  if (typeof window === "undefined") return raw;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(match[1])
    .trim();
  return value || raw;
};

/**
 * Squared perpendicular distance from point P to the line segment AB. Used by
 * Douglas-Peucker — squaring lets us avoid a `sqrt` per point during the
 * recursive split. Caller compares against `epsilon ** 2`.
 */
const perpendicularDistanceSq = (
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number => {
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) {
    const ex = px - ax;
    const ey = py - ay;
    return ex * ex + ey * ey;
  }
  const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  const cx = ax + dx * t;
  const cy = ay + dy * t;
  const ex = px - cx;
  const ey = py - cy;
  return ex * ex + ey * ey;
};

/**
 * Douglas-Peucker simplification on a flat `[x0, y0, x1, y1, ...]` array.
 * `epsilon` is in logical units; smaller = more faithful, larger = fewer
 * points. Returns a new flat array. Endpoints are always preserved.
 */
export const douglasPeucker = (
  points: number[],
  epsilon: number,
): number[] => {
  if (epsilon <= 0) return points.slice();
  const pairCount = Math.floor(points.length / 2);
  if (pairCount < 3) return points.slice();
  const keep = new Uint8Array(pairCount);
  keep[0] = 1;
  keep[pairCount - 1] = 1;
  const epsilonSq = epsilon * epsilon;

  const stack: [number, number][] = [[0, pairCount - 1]];
  while (stack.length > 0) {
    const frame = stack.pop();
    if (!frame) break;
    const [start, end] = frame;
    if (end <= start + 1) continue;
    const ax = points[start * 2];
    const ay = points[start * 2 + 1];
    const bx = points[end * 2];
    const by = points[end * 2 + 1];
    let maxDistSq = 0;
    let maxIndex = -1;
    for (let i = start + 1; i < end; i++) {
      const dSq = perpendicularDistanceSq(
        points[i * 2],
        points[i * 2 + 1],
        ax,
        ay,
        bx,
        by,
      );
      if (dSq > maxDistSq) {
        maxDistSq = dSq;
        maxIndex = i;
      }
    }
    if (maxIndex >= 0 && maxDistSq > epsilonSq) {
      keep[maxIndex] = 1;
      stack.push([start, maxIndex]);
      stack.push([maxIndex, end]);
    }
  }

  const out: number[] = [];
  for (let i = 0; i < pairCount; i++) {
    if (keep[i]) {
      out.push(points[i * 2], points[i * 2 + 1]);
    }
  }
  return out;
};

/**
 * Apply Douglas-Peucker to every stroke in a list. The `epsilon` is scaled by
 * a multiple of the stroke thickness so chunky strokes are simplified more
 * aggressively than fine ones — the visual smoothness target is the same.
 */
export const downsampleStrokes = (strokes: Stroke[]): Stroke[] =>
  strokes.map((s) => {
    const pts = s.points ?? [];
    if (pts.length < 6) return s;
    // Epsilon ≈ ¼ of stroke thickness in logical units — fine enough that the
    // simplification is invisible at 1× but cuts dense fast strokes ~10×.
    const epsilon = Math.max(1, (s.thickness ?? 4) / 4);
    return { ...s, points: douglasPeucker(pts, epsilon) };
  });

/**
 * Paint a stroke list onto an HTMLCanvasElement.
 *
 * The canvas's own `width`/`height` attributes determine the pixel buffer; the
 * stroke coordinates are in *logical* units (`canvasWidth`/`canvasHeight`),
 * so we scale points by `canvas.width / canvasWidth`. Strokes are clipped to
 * the canvas via natural pixel bounds — there's no separate clip path.
 *
 * `backgroundUrl` paints once over the cleared canvas before strokes; supply
 * `undefined` for a blank canvas.
 */
export const renderStrokes = (
  canvas: HTMLCanvasElement,
  strokes: Stroke[],
  canvasWidth: number,
  canvasHeight: number,
  background?: HTMLImageElement,
): void => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (background && background.complete && background.naturalWidth > 0) {
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
  }
  const sx = canvas.width / canvasWidth;
  const sy = canvas.height / canvasHeight;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const stroke of strokes) {
    const pts = stroke.points ?? [];
    if (pts.length < 2) continue;
    ctx.strokeStyle = resolvePaletteColor(stroke.color ?? "#000000");
    ctx.lineWidth = Math.max(1, (stroke.thickness ?? 4) * Math.min(sx, sy));
    ctx.beginPath();
    ctx.moveTo(pts[0] * sx, pts[1] * sy);
    if (pts.length === 2) {
      // Single point — render as a dot via a tiny line.
      ctx.lineTo(pts[0] * sx + 0.01, pts[1] * sy + 0.01);
    } else {
      for (let i = 2; i < pts.length; i += 2) {
        ctx.lineTo(pts[i] * sx, pts[i + 1] * sy);
      }
    }
    ctx.stroke();
  }
};
