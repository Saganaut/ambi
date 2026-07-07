/**
 * Per-item popover menu for Axis item rows — the same focus-opened pattern as
 * MCQ's option menu (`OptionControls/Menu`): the composer opens it when the
 * row's label field takes focus, this component owns dismissal (outside
 * pointerdown and Escape) with the label field counted inside the boundary
 * (it is the trigger — moving the caret must not dismiss the menu). An Axis
 * item carries no color/image/correctness, so the menu holds only the
 * target-clearing and delete actions; chrome is reused from the shared
 * OptionMenu styles so every focus menu reads the same.
 */
import { ArrowUturnLeftIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef } from "react";

import { Popover } from "@components/Forms/Input/Popover/Popover";
import menuStyles from "../_shared/OptionMenu/OptionMenu.module.css";
import { useFlipToFit } from "../_shared/OptionMenu/useFlipToFit";
import styles from "./AxisSlideContent.module.css";

interface AxisItemMenuProps {
  /** 1-based row position, for the accessible menu label. */
  displayIndex: number;
  /** DOM id of the row's label input — the menu's trigger, inside the dismissal boundary. */
  fieldId: string;
  /** Controlled open state — the composer opens on label focus. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasTarget: boolean;
  canRemove: boolean;
  onClearTarget: () => void;
  onRemove: () => void;
}

/** The popover itself — split out so `useFlipToFit` mounts fresh per open. */
const AxisItemMenuPopover = ({
  displayIndex,
  hasTarget,
  canRemove,
  onClearTarget,
  onRemove,
}: Pick<
  AxisItemMenuProps,
  "displayIndex" | "hasTarget" | "canRemove" | "onClearTarget" | "onRemove"
>) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const { flipUp, flipEnd } = useFlipToFit(wrapRef);

  return (
    <div
      ref={wrapRef}
      className={[
        menuStyles.menuWrap,
        flipEnd ? menuStyles.alignEnd : "",
        flipUp ? menuStyles.dropUp : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={(event) => {
        event.stopPropagation();
      }}>
      <Popover
        role='dialog'
        ariaLabel={`Item ${displayIndex.toString()} menu`}
        className={menuStyles.menu}>
        <button
          type='button'
          className={menuStyles.menuItem}
          disabled={!hasTarget}
          onClick={onClearTarget}>
          <ArrowUturnLeftIcon className={menuStyles.menuItemIcon} aria-hidden='true' />
          Clear target
        </button>
        <div className={menuStyles.menuDivider} aria-hidden='true' />
        <button
          type='button'
          className={[menuStyles.menuItem, menuStyles.menuItemDanger].join(" ")}
          disabled={!canRemove}
          onClick={onRemove}>
          <TrashIcon className={menuStyles.menuItemIcon} aria-hidden='true' />
          Delete
        </button>
      </Popover>
    </div>
  );
};

const AxisItemMenu = ({
  displayIndex,
  fieldId,
  open,
  onOpenChange,
  hasTarget,
  canRemove,
  onClearTarget,
  onRemove,
}: AxisItemMenuProps) => {
  const anchorRef = useRef<HTMLDivElement>(null);

  // Dismissal boundary: menu subtree + the row's label field (the trigger).
  // pointerdown (not click) so the menu is gone before a press elsewhere lands.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (document.getElementById(fieldId)?.contains(target)) return;
      onOpenChange(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, fieldId, onOpenChange]);

  const handleClearTarget = () => {
    onOpenChange(false);
    onClearTarget();
  };

  const handleRemove = () => {
    onOpenChange(false);
    onRemove();
  };

  return (
    <div ref={anchorRef} className={styles.menuAnchor}>
      {open && (
        <AxisItemMenuPopover
          displayIndex={displayIndex}
          hasTarget={hasTarget}
          canRemove={canRemove}
          onClearTarget={handleClearTarget}
          onRemove={handleRemove}
        />
      )}
    </div>
  );
};

export { AxisItemMenu };
