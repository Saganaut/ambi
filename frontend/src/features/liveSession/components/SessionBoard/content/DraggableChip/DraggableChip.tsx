// The item chip every drag-to-place board hands its participants: one button
// that is both a plain tap target (the keyboard / AT / small-screen flow) and a
// whole-body drag source (the pointer flow). A quick click never crosses
// dnd-kit's pointer-sensor activation threshold, so `onClick` keeps toggling the
// board's held / pick-up state while a press-and-move starts a drag instead.
//
// The chip contributes no look of its own: its children — a `MarkerBadge`, on
// every board that uses it today — own every pixel, and the caller's `className`
// owns position and per-board state (held, placed). What the chip does own is
// the two things a caller must not be able to get wrong:
//
//   - `--chip-accent`, published from the required `accent` prop so a caller's
//     own state styling (the held ring) can tint itself in the item's color.
//     Callers that consume it declare their own in-file fallback.
//   - the pointer-events guard on its children. Without it dnd-kit's pointer
//     sensor refuses to arm: its default `preventActivation` resolves the
//     pressed target with `closest("button")`, finds the chip, and reads the
//     press as one on nested interactive chrome rather than on the draggable.
//     A badge with an image would additionally offer the browser's native image
//     drag. Baking it in is why the boards no longer pass a badge class.
import { useDraggable } from "@dnd-kit/react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";

import styles from "./DraggableChip.module.css";

interface DraggableChipProps {
  /** Draggable id — the board's item id, which is also the placement-map key. */
  itemId: string;
  /** The caller's own chrome: position and per-board state classes. */
  className?: string;
  /** Resolved item color, published to the caller's CSS as `--chip-accent`. */
  accent: string;
  /** Disables both the button and the drag source (an unanswerable moment). */
  disabled: boolean;
  /** Accessible name, for a chip whose badge is decorative or unlabeled. */
  ariaLabel?: string;
  /** Toggle state for the tap flow — `true` while this item is the held one. */
  ariaPressed?: boolean;
  /** Extra inline style, merged after `--chip-accent` (a placed chip's point). */
  style?: CSSProperties;
  /** Tap-flow handler: pick the item up, put it down, or toggle the hold. */
  onClick: () => void;
  /** Optional key handling for a placed chip (arrow-key nudging). */
  onKeyDown?: (event: KeyboardEvent) => void;
  children: ReactNode;
}

const DraggableChip = ({
  itemId,
  className,
  accent,
  disabled,
  ariaLabel,
  ariaPressed,
  style,
  onClick,
  onKeyDown,
  children,
}: DraggableChipProps) => {
  const { ref, isDragging } = useDraggable({ id: itemId, disabled });
  return (
    <button
      ref={ref}
      type="button"
      className={[styles.chip, className, isDragging ? styles.dragging : ""]
        .filter(Boolean)
        .join(" ")}
      style={{ "--chip-accent": accent, ...style } as CSSProperties}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {children}
    </button>
  );
};

export { DraggableChip };
export type { DraggableChipProps };
