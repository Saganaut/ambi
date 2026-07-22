// Shared pointer-drag plumbing for the picker's slider tracks and the 2D
// saturation field. Reports the pointer position as ratios (0-1) of the
// dragged element's box — on press, and continuously while dragging via
// pointer capture, so the drag keeps tracking outside the element.
import { useRef } from "react";

interface PointerDragHandlers {
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
}

const usePointerDrag = (
  onMove: (xRatio: number, yRatio: number) => void,
): PointerDragHandlers => {
  const dragging = useRef(false);

  const report = (event: React.PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    onMove(x, y);
  };

  return {
    onPointerDown: (event) => {
      // Only primary-button presses start a drag.
      if (event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      dragging.current = true;
      report(event);
    },
    onPointerMove: (event) => {
      if (dragging.current) report(event);
    },
    onPointerUp: () => {
      dragging.current = false;
    },
  };
};

export { usePointerDrag };
