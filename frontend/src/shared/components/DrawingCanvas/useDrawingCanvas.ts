/**
 * All interactive logic for {@link DrawingCanvas}: pointer capture, the
 * element list with undo/redo history, live redraw, background-image
 * loading, and PNG export.
 *
 * Drafting performance: the in-progress stroke lives in a ref and is drawn
 * imperatively on a requestAnimationFrame tick — React state only changes
 * when a stroke is committed (pointer-up), so drawing stays smooth on large
 * canvases.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DRAWING_DEFAULT_INK,
  DRAWING_LOGICAL_SIZE,
  DRAWING_PAPER_COLOR,
  hitTestElement,
  renderCoverImage,
  renderElements,
  type DrawingElement,
  type DrawingPoint,
  type PenElement,
  type ShapeElement,
} from "./drawingModel";

/** Tools the canvas itself understands (feature code maps its own enums). */
export type DrawingToolId = "pen" | "eraser" | "line" | "rect" | "ellipse";

export interface BrushSize {
  id: "fine" | "medium" | "bold";
  /** Stroke diameter in logical units. */
  size: number;
}

export const BRUSH_SIZES: readonly BrushSize[] = [
  { id: "fine", size: 5 },
  { id: "medium", size: 12 },
  { id: "bold", size: 24 },
];

/** Whole-element eraser reach in logical units. */
const ERASER_RADIUS = 20;

const HISTORY_LIMIT = 100;

export interface DrawingCanvasHandle {
  /** Rasterize paper + background + strokes to a PNG blob. */
  exportPng: () => Promise<Blob>;
  clear: () => void;
  isEmpty: () => boolean;
}

interface DrawingHistory {
  past: readonly (readonly DrawingElement[])[];
  present: readonly DrawingElement[];
  future: readonly (readonly DrawingElement[])[];
}

const EMPTY_HISTORY: DrawingHistory = { past: [], present: [], future: [] };

const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    // Required so the canvas stays readable (untainted) for PNG export.
    image.crossOrigin = "anonymous";
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error(`Could not load drawing background: ${url}`));
    };
    image.src = url;
  });

interface UseDrawingCanvasArgs {
  palette: readonly string[];
  backgroundImageUrl?: string;
  disabled: boolean;
  onEmptyChange?: (isEmpty: boolean) => void;
}

const useDrawingCanvas = ({
  palette,
  backgroundImageUrl,
  disabled,
  onEmptyChange,
}: UseDrawingCanvasArgs) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundRef = useRef<HTMLImageElement | null>(null);
  const draftRef = useRef<DrawingElement | null>(null);
  const strokeSnapshotRef = useRef<readonly DrawingElement[] | null>(null);
  const frameRef = useRef(0);

  const [history, setHistory] = useState<DrawingHistory>(EMPTY_HISTORY);
  const [tool, setTool] = useState<DrawingToolId>("pen");
  const [color, setColor] = useState<string>(palette[0] ?? DRAWING_DEFAULT_INK);
  const [brushSizeId, setBrushSizeId] = useState<BrushSize["id"]>("medium");

  // If the author edits the palette out from under the active color, snap to
  // the first swatch rather than drawing in a color no longer on offer.
  const activeColor =
    palette.length > 0 && !palette.includes(color) ? palette[0] : color;
  const brushSize = useMemo(
    () => BRUSH_SIZES.find((s) => s.id === brushSizeId) ?? BRUSH_SIZES[1],
    [brushSizeId],
  );

  const historyRef = useRef(history);
  historyRef.current = history;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const scale = canvas.width / DRAWING_LOGICAL_SIZE;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = DRAWING_PAPER_COLOR;
    ctx.fillRect(0, 0, DRAWING_LOGICAL_SIZE, DRAWING_LOGICAL_SIZE);
    if (backgroundRef.current) renderCoverImage(ctx, backgroundRef.current);
    renderElements(ctx, historyRef.current.present);
    if (draftRef.current) renderElements(ctx, [draftRef.current]);
  }, []);

  const scheduleDraw = useCallback(() => {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      draw();
    });
  }, [draw]);

  // Keep the bitmap matched to the on-screen size × devicePixelRatio.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(([entry]) => {
      const size = Math.round(entry.contentRect.width * window.devicePixelRatio);
      if (size > 0 && canvas.width !== size) {
        canvas.width = size;
        canvas.height = size;
      }
      draw();
    });
    observer.observe(canvas);
    return () => {
      observer.disconnect();
    };
  }, [draw]);

  useEffect(() => {
    backgroundRef.current = null;
    if (!backgroundImageUrl) {
      draw();
      return;
    }
    let cancelled = false;
    loadImage(backgroundImageUrl)
      .then((image) => {
        if (cancelled) return;
        backgroundRef.current = image;
        draw();
      })
      .catch(() => {
        // Background is decorative here; players can still draw on paper.
      });
    return () => {
      cancelled = true;
    };
  }, [backgroundImageUrl, draw]);

  useEffect(() => {
    draw();
  }, [history, draw]);

  useEffect(
    () => () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  const isEmpty = history.present.length === 0;
  const onEmptyChangeRef = useRef(onEmptyChange);
  onEmptyChangeRef.current = onEmptyChange;
  useEffect(() => {
    onEmptyChangeRef.current?.(isEmpty);
  }, [isEmpty]);

  /** Push a new element list as one undoable step. */
  const commit = useCallback((next: readonly DrawingElement[]) => {
    setHistory((h) => ({
      past: [...h.past.slice(-(HISTORY_LIMIT - 1)), h.present],
      present: next,
      future: [],
    }));
  }, []);

  const toLogical = useCallback((e: React.PointerEvent<HTMLCanvasElement>): DrawingPoint => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * DRAWING_LOGICAL_SIZE,
      y: ((e.clientY - rect.top) / rect.height) * DRAWING_LOGICAL_SIZE,
      pressure: e.pressure > 0 ? e.pressure : 0.5,
    };
  }, []);

  const eraseAt = useCallback((p: DrawingPoint) => {
    const { present } = historyRef.current;
    const next = present.filter((el) => !hitTestElement(el, p, ERASER_RADIUS));
    if (next.length !== present.length) {
      // Live removal without a history entry per element — the whole drag
      // becomes a single undo step on pointer-up.
      setHistory((h) => ({ ...h, present: next }));
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (disabled || !e.isPrimary || e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const p = toLogical(e);
      if (tool === "eraser") {
        strokeSnapshotRef.current = historyRef.current.present;
        eraseAt(p);
      } else if (tool === "pen") {
        draftRef.current = {
          kind: "pen",
          color: activeColor,
          size: brushSize.size,
          points: [p],
        } satisfies PenElement;
      } else {
        draftRef.current = {
          kind: tool,
          color: activeColor,
          size: brushSize.size,
          start: p,
          end: p,
        } satisfies ShapeElement;
      }
      scheduleDraw();
    },
    [disabled, tool, activeColor, brushSize, toLogical, eraseAt, scheduleDraw],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (disabled || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
      const p = toLogical(e);
      if (tool === "eraser") {
        eraseAt(p);
        return;
      }
      const draft = draftRef.current;
      if (!draft) return;
      if (draft.kind === "pen") {
        draft.points.push(p);
      } else {
        draft.end = p;
      }
      scheduleDraw();
    },
    [disabled, tool, toLogical, eraseAt, scheduleDraw],
  );

  const finishStroke = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      if (tool === "eraser") {
        const snapshot = strokeSnapshotRef.current;
        strokeSnapshotRef.current = null;
        if (snapshot && snapshot.length !== historyRef.current.present.length) {
          setHistory((h) => ({
            past: [...h.past.slice(-(HISTORY_LIMIT - 1)), snapshot],
            present: h.present,
            future: [],
          }));
        }
        return;
      }
      const draft = draftRef.current;
      draftRef.current = null;
      if (!draft) return;
      commit([...historyRef.current.present, draft]);
    },
    [tool, commit],
  );

  const onPointerCancel = useCallback(() => {
    draftRef.current = null;
    strokeSnapshotRef.current = null;
    scheduleDraw();
  }, [scheduleDraw]);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.past.length === 0) return h;
      return {
        past: h.past.slice(0, -1),
        present: h.past[h.past.length - 1],
        future: [h.present, ...h.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((h) => {
      if (h.future.length === 0) return h;
      return {
        past: [...h.past, h.present],
        present: h.future[0],
        future: h.future.slice(1),
      };
    });
  }, []);

  const clear = useCallback(() => {
    if (historyRef.current.present.length === 0) return;
    commit([]);
  }, [commit]);

  const exportPng = useCallback(async (): Promise<Blob> => {
    const canvas = document.createElement("canvas");
    canvas.width = DRAWING_LOGICAL_SIZE;
    canvas.height = DRAWING_LOGICAL_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.fillStyle = DRAWING_PAPER_COLOR;
    ctx.fillRect(0, 0, DRAWING_LOGICAL_SIZE, DRAWING_LOGICAL_SIZE);
    if (backgroundImageUrl) {
      try {
        renderCoverImage(ctx, await loadImage(backgroundImageUrl));
      } catch {
        // Export the strokes on plain paper if the background won't load.
      }
    }
    renderElements(ctx, historyRef.current.present);
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("PNG export failed"));
      }, "image/png");
    });
  }, [backgroundImageUrl]);

  return {
    canvasRef,
    canvasHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finishStroke,
      onPointerCancel,
    },
    tool,
    setTool,
    activeColor,
    setColor,
    brushSizeId,
    setBrushSizeId,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undo,
    redo,
    clear,
    isEmpty,
    exportPng,
  };
};

export { useDrawingCanvas };
