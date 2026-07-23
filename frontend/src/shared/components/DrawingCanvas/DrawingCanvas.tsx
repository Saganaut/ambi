/**
 * Square freehand drawing surface with a tool row — the one canvas used by
 * the deck editor (author draws a prompt), the live-session player view
 * (players draw their answer), and anywhere else a drawing is produced.
 *
 * Geometry is a fixed 1:1 logical space (DRAWING_LOGICAL_SIZE²); the PNG
 * export renders paper + optional background + strokes at that resolution
 * regardless of the on-screen size. The parent drives export/clear through
 * the imperative {@link DrawingCanvasHandle} ref and owns what to do with
 * the resulting blob (gallery ingest, answer upload, …).
 */
import { useImperativeHandle, type Ref } from "react";
import { ErrorFallback } from "@ui/BoundaryFallbacks/ErrorFallback";
import { ErrorBoundary } from "@ui/ErrorBoundary/ErrorBoundary";
import { DrawingToolbar } from "./DrawingToolbar";
import { useDrawingCanvas, type DrawingCanvasHandle } from "./useDrawingCanvas";
import styles from "./DrawingCanvas.module.css";

interface DrawingCanvasProps {
  /** Author-configured stroke colors; empty hides swatches (default ink). */
  palette: readonly string[];
  /** Offer the whole-element eraser tool. */
  allowEraser?: boolean;
  /** Offer line / rectangle / ellipse tools. */
  allowShapes?: boolean;
  /** Traceable image rendered under the strokes and into the export. */
  backgroundImageUrl?: string;
  /** Read-only: hides the toolbar and ignores pointer input. */
  disabled?: boolean;
  /** Accessible description of what the canvas is for. */
  ariaLabel?: string;
  /** Fires when the drawing flips between empty and non-empty. */
  onEmptyChange?: (isEmpty: boolean) => void;
  ref?: Ref<DrawingCanvasHandle>;
}

const DrawingCanvasInner = ({
  palette,
  allowEraser = true,
  allowShapes = false,
  backgroundImageUrl,
  disabled = false,
  ariaLabel = "Drawing canvas",
  onEmptyChange,
  ref,
}: DrawingCanvasProps) => {
  const {
    canvasRef,
    canvasHandlers,
    tool,
    setTool,
    activeColor,
    setColor,
    brushSizeId,
    setBrushSizeId,
    canUndo,
    canRedo,
    undo,
    redo,
    clear,
    isEmpty,
    exportPng,
  } = useDrawingCanvas({ palette, backgroundImageUrl, disabled, onEmptyChange });

  useImperativeHandle(ref, () => ({ exportPng, clear, isEmpty: () => isEmpty }), [
    exportPng,
    clear,
    isEmpty,
  ]);

  return (
    <div className={styles.root}>
      {!disabled && (
        <DrawingToolbar
          allowEraser={allowEraser}
          allowShapes={allowShapes}
          palette={palette}
          tool={tool}
          onToolChange={setTool}
          activeColor={activeColor}
          onColorChange={setColor}
          brushSizeId={brushSizeId}
          onBrushSizeChange={setBrushSizeId}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          onClear={clear}
        />
      )}
      <div className={styles.surface}>
        {/* Handlers stay attached even while disabled (the hook gates input
            internally) so a mid-stroke disable can still clean up its pointer. */}
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          role='img'
          aria-label={ariaLabel}
          {...canvasHandlers}
        />
      </div>
    </div>
  );
};

// Wrapped at the export so every caller (deck authoring, live-session
// answers) is protected without changes: canvas 2D + perfect-freehand throws
// on a malformed stroke shouldn't blank the surrounding surface.
const DrawingCanvas = (props: DrawingCanvasProps) => (
  <ErrorBoundary
    boundaryName="drawing-canvas"
    fallback={<ErrorFallback message="Something went wrong loading the drawing canvas." />}
  >
    <DrawingCanvasInner {...props} />
  </ErrorBoundary>
);

export { DrawingCanvas };
export type { DrawingCanvasHandle, DrawingCanvasProps };
