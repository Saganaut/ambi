// Decides whether a just-opened floating menu must flip to stay visible: up
// instead of below the trigger, and/or end-aligned instead of start-aligned.
// The menu's default position is below-right of its trigger; triggers near the
// bottom or right edge of a clipping container (chart labels on a bar chart,
// the grid's last column) would clip it there. Measured once per mount — the
// menu remounts on every open, so no resize or scroll tracking is needed.
import { useLayoutEffect, useState, type RefObject } from "react";

const CLIPPING_OVERFLOWS = new Set(["hidden", "clip", "auto", "scroll"]);

interface FlipToFit {
  flipUp: boolean;
  flipEnd: boolean;
}

/** The box the menu must stay inside: the nearest overflow-clipping
 *  ancestor's rect, capped at the viewport; the viewport if nothing clips. */
const clipBoundsFor = (element: HTMLElement): { bottom: number; right: number } => {
  for (
    let ancestor = element.parentElement;
    ancestor;
    ancestor = ancestor.parentElement
  ) {
    const ancestorStyle = getComputedStyle(ancestor);
    if (
      CLIPPING_OVERFLOWS.has(ancestorStyle.overflowY) ||
      CLIPPING_OVERFLOWS.has(ancestorStyle.overflowX)
    ) {
      const rect = ancestor.getBoundingClientRect();
      return {
        bottom: Math.min(window.innerHeight, rect.bottom),
        right: Math.min(window.innerWidth, rect.right),
      };
    }
  }
  return { bottom: window.innerHeight, right: window.innerWidth };
};

const useFlipToFit = (wrapRef: RefObject<HTMLElement | null>): FlipToFit => {
  const [flip, setFlip] = useState<FlipToFit>({ flipUp: false, flipEnd: false });

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const menu = wrap?.firstElementChild;
    if (!wrap || !(menu instanceof HTMLElement)) return;
    const bounds = clipBoundsFor(wrap);
    const rect = menu.getBoundingClientRect();
    const flipUp = rect.bottom > bounds.bottom;
    const flipEnd = rect.right > bounds.right;
    if (flipUp || flipEnd) setFlip({ flipUp, flipEnd });
  }, [wrapRef]);

  return flip;
};

export { useFlipToFit };
