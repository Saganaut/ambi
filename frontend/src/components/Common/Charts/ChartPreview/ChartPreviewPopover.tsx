// Hover popover that pairs a chart-picker trigger with a live demo of the
// chart it selects. Uses the native HTML Popover API (`popover="manual"`)
// so the surface renders in the browser's top-layer and escapes any
// `overflow: hidden` on ancestor sidebars/panels — DOM-level wrappers can't
// clip it. Position is computed in JS against the trigger's bounding rect
// (anchor-positioning CSS isn't universally shipped yet); we flip from the
// preferred side to the opposite side when there isn't room, and clamp
// vertically inside the viewport. ChartPreview mounts only while open so
// re-opening replays its on-appear animation.
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { ChartType } from "@/components/DeckEditor/RightSidebar/data";
import { ChartPreview } from "./ChartPreview";
import styles from "./ChartPreviewPopover.module.css";

export interface ChartPreviewPopoverProps {
  chartType: ChartType;
  label: string;
  children: ReactNode;
  // Preferred side — flips to the opposite if the popover would overflow
  // the viewport on that side.
  placement?: "left" | "right" | "top" | "bottom";
}

// Fixed surface size — keeps positioning math honest before the popover's
// content has been measured (first open has nothing rendered inside yet).
const POPOVER_WIDTH = 320;
const POPOVER_HEIGHT = 240;
const GAP = 8;
const EDGE_PAD = 8;

const computePosition = (
  rect: DOMRect,
  placement: "left" | "right" | "top" | "bottom",
): { top: number; left: number } => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const horizontal = (preferLeft: boolean): number => {
    const leftSide = rect.left - POPOVER_WIDTH - GAP;
    const rightSide = rect.right + GAP;
    if (preferLeft) {
      return leftSide >= EDGE_PAD ? leftSide : rightSide;
    }
    return rightSide + POPOVER_WIDTH <= vw - EDGE_PAD ? rightSide : leftSide;
  };

  const vertical = (preferTop: boolean): number => {
    const topSide = rect.top - POPOVER_HEIGHT - GAP;
    const bottomSide = rect.bottom + GAP;
    if (preferTop) {
      return topSide >= EDGE_PAD ? topSide : bottomSide;
    }
    return bottomSide + POPOVER_HEIGHT <= vh - EDGE_PAD ? bottomSide : topSide;
  };

  const clampY = (y: number): number => {
    if (y < EDGE_PAD) return EDGE_PAD;
    if (y + POPOVER_HEIGHT > vh - EDGE_PAD) return vh - POPOVER_HEIGHT - EDGE_PAD;
    return y;
  };
  const clampX = (x: number): number => {
    if (x < EDGE_PAD) return EDGE_PAD;
    if (x + POPOVER_WIDTH > vw - EDGE_PAD) return vw - POPOVER_WIDTH - EDGE_PAD;
    return x;
  };

  if (placement === "left" || placement === "right") {
    const left = horizontal(placement === "left");
    const top = clampY(rect.top + rect.height / 2 - POPOVER_HEIGHT / 2);
    return { top, left };
  }
  const top = vertical(placement === "top");
  const left = clampX(rect.left + rect.width / 2 - POPOVER_WIDTH / 2);
  return { top, left };
};

const ChartPreviewPopover = ({
  chartType,
  label,
  children,
  placement = "left",
}: ChartPreviewPopoverProps) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  // Drive show/hide from the React `open` state so the popover content is
  // mounted/unmounted in the same commit that opens the top-layer surface.
  useEffect(() => {
    const el = popoverRef.current;
    if (!el) return;
    if (open) {
      try {
        el.showPopover();
      } catch {
        // showPopover throws if already open or unsupported — safe to ignore.
      }
    } else {
      try {
        el.hidePopover();
      } catch {
        // hidePopover throws if already hidden — safe to ignore.
      }
    }
  }, [open]);

  const handleOpen = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    setCoords(computePosition(trigger.getBoundingClientRect(), placement));
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <span
        ref={triggerRef}
        className={styles.wrapper}
        aria-describedby={open ? popoverId : undefined}
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        onFocus={handleOpen}
        onBlur={handleClose}>
        {children}
      </span>
      <div
        ref={popoverRef}
        id={popoverId}
        popover='manual'
        role='tooltip'
        className={styles.popover}
        style={{ top: `${coords.top.toString()}px`, left: `${coords.left.toString()}px` }}>
        {open && (
          <>
            <div className={styles.label}>{label}</div>
            <div className={styles.canvas}>
              <ChartPreview chartType={chartType} />
            </div>
          </>
        )}
      </div>
    </>
  );
};

export { ChartPreviewPopover };
