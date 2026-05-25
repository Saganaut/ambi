/**
 * Reveal surfaces for the Drawing element kind.
 *
 * Exports three components that share a single rendering pass via
 * `renderStrokes` (see `DrawingCanvas/drawingUtils.ts`):
 *
 * - `DrawingPreview` is a small, read-only canvas that renders a stroke list
 *   onto a thumbnail. Used both in the post-round grid and inside the
 *   Best-Answer `VotePanel` cards. The pixel buffer is sized off the prop
 *   `pixelWidth`; the DOM presentation is full-width within its parent (the
 *   parent decides the slot size, the preview just fills it).
 * - `DrawingLightbox` is a full-screen overlay that re-renders the same
 *   strokes at a much larger pixel buffer for legibility. Click anywhere
 *   outside the canvas or press Escape to dismiss.
 * - `DrawingReveal` is the post-round grid: one preview per player, each
 *   labelled with the player's display name. Clicking a tile pops the
 *   lightbox. Authors that ship Best-Answer mode also see the votes-cast
 *   chip on the relevant tiles via the parent renderer; this component just
 *   handles the grid shape itself.
 */
import { useEffect, useRef, useState } from "react";
import { largestUrl } from "@/utils/image";
import { renderStrokes } from "../DrawingCanvas/drawingUtils";
import type { DrawingQuestion, Stroke } from "@/types/elements";
import styles from "./DrawingReveal.module.css";

interface DrawingPreviewProps {
  element: DrawingQuestion;
  strokes: Stroke[];
  pixelWidth?: number;
  ariaLabel?: string;
}

/**
 * Read-only mini canvas for a stroke list. Caches the backing image lookup
 * by URL so re-rendering many previews in a grid only fetches the image
 * once per source.
 */
const DrawingPreview = ({
  element,
  strokes,
  pixelWidth = 320,
  ariaLabel,
}: DrawingPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const backgroundImgRef = useRef<HTMLImageElement | null>(null);

  const canvasWidth = element.canvasWidth ?? 1920;
  const canvasHeight = element.canvasHeight ?? 1080;
  const backgroundUrl = largestUrl(element.backingImage, element.id ?? "draw");

  // Resize the pixel buffer to match the question's aspect.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = pixelWidth;
    canvas.height = Math.round((pixelWidth * canvasHeight) / canvasWidth);
  }, [pixelWidth, canvasWidth, canvasHeight]);

  // Load the backing image once per URL. Falls back to a blank canvas.
  useEffect(() => {
    if (!backgroundUrl) {
      backgroundImgRef.current = null;
      const canvas = canvasRef.current;
      if (canvas) renderStrokes(canvas, strokes, canvasWidth, canvasHeight);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = backgroundUrl;
    img.onload = () => {
      backgroundImgRef.current = img;
      const canvas = canvasRef.current;
      if (canvas)
        renderStrokes(canvas, strokes, canvasWidth, canvasHeight, img);
    };
    // Strokes/canvas-size are intentionally not deps — the dedicated repaint
    // effect below handles those. This effect runs once per backing-image URL.
    /* eslint-disable-next-line react-hooks/exhaustive-deps, react-x/exhaustive-deps */
  }, [backgroundUrl]);

  // Repaint on stroke changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderStrokes(
      canvas,
      strokes,
      canvasWidth,
      canvasHeight,
      backgroundImgRef.current ?? undefined,
    );
  }, [strokes, canvasWidth, canvasHeight]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.preview}
      style={{ aspectRatio: `${String(canvasWidth)} / ${String(canvasHeight)}` }}
      aria-label={ariaLabel ?? "Drawing preview"}
    />
  );
};

interface DrawingLightboxProps {
  element: DrawingQuestion;
  strokes: Stroke[];
  title?: string;
  onClose: () => void;
}

/** Full-screen modal expand of a single drawing. Escape / backdrop click closes. */
const DrawingLightbox = ({
  element,
  strokes,
  title,
  onClose,
}: DrawingLightboxProps) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [onClose]);

  return (
    <div
      className={styles.lightbox}
      role='dialog'
      aria-modal='true'
      aria-label={title ?? "Drawing"}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}>
      <div className={styles.lightboxPanel}>
        {title && <h3 className={styles.lightboxTitle}>{title}</h3>}
        <DrawingPreview
          element={element}
          strokes={strokes}
          pixelWidth={1280}
          ariaLabel={title ?? "Drawing"}
        />
        <button
          type='button'
          className={styles.lightboxClose}
          onClick={onClose}
          aria-label='Close drawing'>
          ×
        </button>
      </div>
    </div>
  );
};

interface DrawingRevealEntry {
  id: string;          // submission id or userId — must be unique within the grid
  authorName: string;
  strokes: Stroke[];
  badge?: string;      // optional overlay text (e.g. "★ Winner" or "3 votes")
}

interface DrawingRevealProps {
  element: DrawingQuestion;
  entries: DrawingRevealEntry[];
  emptyLabel?: string;
}

/**
 * Grid of post-round drawings. Empty list renders a hint. Each tile expands
 * into a `DrawingLightbox` on click.
 */
const DrawingReveal = ({
  element,
  entries,
  emptyLabel = "No drawings submitted this round.",
}: DrawingRevealProps) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const openEntry = entries.find((e) => e.id === openId) ?? null;

  if (entries.length === 0) {
    return <p className={styles.empty}>{emptyLabel}</p>;
  }

  return (
    <div className={styles.wrapper}>
      <ul className={styles.grid}>
        {entries.map((entry) => (
          <li key={entry.id} className={styles.tile}>
            <button
              type='button'
              className={styles.tileBtn}
              aria-label={`Expand ${entry.authorName}'s drawing`}
              onClick={() => {
                setOpenId(entry.id);
              }}>
              <DrawingPreview
                element={element}
                strokes={entry.strokes}
                pixelWidth={320}
                ariaLabel={`${entry.authorName}'s drawing`}
              />
              {entry.badge && (
                <span className={styles.tileBadge}>{entry.badge}</span>
              )}
              <span className={styles.tileAuthor}>{entry.authorName}</span>
            </button>
          </li>
        ))}
      </ul>
      {openEntry && (
        <DrawingLightbox
          element={element}
          strokes={openEntry.strokes}
          title={openEntry.authorName}
          onClose={() => {
            setOpenId(null);
          }}
        />
      )}
    </div>
  );
};

export { DrawingPreview, DrawingLightbox, DrawingReveal };
export type { DrawingRevealEntry };
