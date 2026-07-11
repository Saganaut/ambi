/**
 * Pure data model + 2D rendering for the drawing canvas.
 *
 * All geometry lives in a fixed square logical space of
 * `DRAWING_LOGICAL_SIZE` × `DRAWING_LOGICAL_SIZE` units, independent of the
 * on-screen CSS size and of devicePixelRatio. The visible canvas and the PNG
 * export both render the same element list through `renderElements`, so what
 * the player sees is exactly what gets submitted.
 */
import { getStroke } from "perfect-freehand";

/** Side length of the square logical coordinate space (and of PNG exports). */
export const DRAWING_LOGICAL_SIZE = 1024;

/** Paper color painted under every drawing, on screen and in exports. */
export const DRAWING_PAPER_COLOR = "#FFFFFF";

/** Stroke color used when the author configured no palette. */
export const DRAWING_DEFAULT_INK = "#1A1A1A";

export interface DrawingPoint {
  x: number;
  y: number;
  /** Stylus pressure 0..1; 0.5 for mouse/touch (no real pressure signal). */
  pressure: number;
}

/** A freehand pen stroke, rendered as a pressure-tapered outline fill. */
export interface PenElement {
  kind: "pen";
  color: string;
  /** Base stroke diameter in logical units. */
  size: number;
  points: DrawingPoint[];
}

/** A drag-to-size shape, rendered as an outline stroke. */
export interface ShapeElement {
  kind: "line" | "rect" | "ellipse";
  color: string;
  /** Outline width in logical units. */
  size: number;
  start: DrawingPoint;
  end: DrawingPoint;
}

export type DrawingElement = PenElement | ShapeElement;

const penOutline = (element: PenElement): number[][] =>
  getStroke(
    element.points.map((p) => [p.x, p.y, p.pressure]),
    {
      size: element.size,
      thinning: 0.55,
      smoothing: 0.5,
      streamline: 0.45,
      // Real stylus pressure varies; mouse/touch report a constant 0.5 and
      // get a simulated velocity-based taper instead.
      simulatePressure: element.points.every((p) => p.pressure === 0.5),
    },
  );

const penPath = (element: PenElement): Path2D => {
  const path = new Path2D();
  const outline = penOutline(element);
  if (outline.length === 0) return path;
  path.moveTo(outline[0][0], outline[0][1]);
  for (let i = 1; i < outline.length; i++) {
    path.lineTo(outline[i][0], outline[i][1]);
  }
  path.closePath();
  return path;
};

const renderShape = (ctx: CanvasRenderingContext2D, element: ShapeElement) => {
  const { start, end } = element;
  ctx.strokeStyle = element.color;
  ctx.lineWidth = element.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  switch (element.kind) {
    case "line":
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      break;
    case "rect":
      ctx.rect(
        Math.min(start.x, end.x),
        Math.min(start.y, end.y),
        Math.abs(end.x - start.x),
        Math.abs(end.y - start.y),
      );
      break;
    case "ellipse":
      ctx.ellipse(
        (start.x + end.x) / 2,
        (start.y + end.y) / 2,
        Math.abs(end.x - start.x) / 2,
        Math.abs(end.y - start.y) / 2,
        0,
        0,
        Math.PI * 2,
      );
      break;
  }
  ctx.stroke();
};

/**
 * Draw every element onto a context whose transform already maps logical
 * units to device pixels.
 */
export const renderElements = (
  ctx: CanvasRenderingContext2D,
  elements: readonly DrawingElement[],
) => {
  for (const element of elements) {
    if (element.kind === "pen") {
      ctx.fillStyle = element.color;
      ctx.fill(penPath(element));
    } else {
      renderShape(ctx, element);
    }
  }
};

/**
 * Draw an image into the logical square with CSS `object-fit: cover`
 * semantics (fill the square, center, crop the overflow).
 */
export const renderCoverImage = (
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource & { width: number; height: number },
) => {
  const scale = Math.max(
    DRAWING_LOGICAL_SIZE / image.width,
    DRAWING_LOGICAL_SIZE / image.height,
  );
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.drawImage(
    image,
    (DRAWING_LOGICAL_SIZE - w) / 2,
    (DRAWING_LOGICAL_SIZE - h) / 2,
    w,
    h,
  );
};

const distancePointToSegment = (
  p: DrawingPoint,
  a: DrawingPoint,
  b: DrawingPoint,
): number => {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSq = abx * abx + aby * aby;
  const t =
    lengthSq === 0
      ? 0
      : Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / lengthSq));
  const cx = a.x + t * abx;
  const cy = a.y + t * aby;
  return Math.hypot(p.x - cx, p.y - cy);
};

const hitsPen = (element: PenElement, p: DrawingPoint, radius: number): boolean => {
  const reach = radius + element.size / 2;
  const pts = element.points;
  if (pts.length === 1) return Math.hypot(p.x - pts[0].x, p.y - pts[0].y) <= reach;
  for (let i = 1; i < pts.length; i++) {
    if (distancePointToSegment(p, pts[i - 1], pts[i]) <= reach) return true;
  }
  return false;
};

const hitsShape = (element: ShapeElement, p: DrawingPoint, radius: number): boolean => {
  const reach = radius + element.size / 2;
  const { start, end } = element;
  switch (element.kind) {
    case "line":
      return distancePointToSegment(p, start, end) <= reach;
    case "rect": {
      const x0 = Math.min(start.x, end.x);
      const x1 = Math.max(start.x, end.x);
      const y0 = Math.min(start.y, end.y);
      const y1 = Math.max(start.y, end.y);
      const corners: DrawingPoint[] = [
        { x: x0, y: y0, pressure: 0 },
        { x: x1, y: y0, pressure: 0 },
        { x: x1, y: y1, pressure: 0 },
        { x: x0, y: y1, pressure: 0 },
      ];
      for (let i = 0; i < 4; i++) {
        if (distancePointToSegment(p, corners[i], corners[(i + 1) % 4]) <= reach) {
          return true;
        }
      }
      return false;
    }
    case "ellipse": {
      const cx = (start.x + end.x) / 2;
      const cy = (start.y + end.y) / 2;
      const rx = Math.abs(end.x - start.x) / 2;
      const ry = Math.abs(end.y - start.y) / 2;
      if (rx === 0 && ry === 0) return Math.hypot(p.x - cx, p.y - cy) <= reach;
      // Nearest ellipse-outline point at the probe's angle — an
      // approximation, but plenty for a whole-element eraser.
      const angle = Math.atan2(p.y - cy, p.x - cx);
      const ox = cx + Math.cos(angle) * rx;
      const oy = cy + Math.sin(angle) * ry;
      return Math.hypot(p.x - ox, p.y - oy) <= reach;
    }
  }
};

/** True when the probe point is within `radius` of the element's ink. */
export const hitTestElement = (
  element: DrawingElement,
  p: DrawingPoint,
  radius: number,
): boolean =>
  element.kind === "pen" ? hitsPen(element, p, radius) : hitsShape(element, p, radius);
