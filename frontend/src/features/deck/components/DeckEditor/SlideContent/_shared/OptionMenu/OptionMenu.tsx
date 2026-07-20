// The per-option dropdown menu (opened by a controller — e.g. RankItemMenu —
// when the option's label field takes focus).
// Purely presentational — the controller owns the open state and outside-click
// boundary. This is the legacy positioning shell: it anchors the menu to the
// controller's wrapper (the positioned ancestor) and flips up / end-aligns as
// needed to stay inside the clipping container. The menu body itself lives in
// the shared `OptionMenuContent`; MCQ renders that straight into a
// `FloatingPopover`, which handles positioning without this shell.
//TODO: THIS IS STILL USING LEGACY METHOD, CHANGE TO USE POPOVER WRAPPER
import { useRef } from "react";

import type { MenuAlign } from "@/shared/components/Charts/Chart.types";
import styles from "./OptionMenu.module.css";
import type { OptionMenuPrimaryAction } from "./OptionMenu.types";
import { OptionMenuContent } from "./OptionMenuContent";

interface OptionMenuProps {
  /** Display identifier used for the accessible menu label. */
  displayIndex: string;
  /** Resolved current color (option override or palette default). */
  currentColor: string;
  canRemove: boolean;
  hasImage: boolean;
  /** Leading kind-specific action; omitted for kinds with no toggle (Ranking). */
  primaryAction?: OptionMenuPrimaryAction;
  /** Which edge of the anchor the menu aligns to (default "start"). */
  align?: MenuAlign;
  onPickColor: (color: string) => void;
  onCustomColor: () => void;
  onUploadImage: () => void;
  onClearImage: () => void;
  onRemove: () => void;
}

const OptionMenu = ({
  displayIndex,
  currentColor,
  canRemove,
  hasImage,
  primaryAction,
  align = "start",
  onPickColor,
  onCustomColor,
  onUploadImage,
  onClearImage,
  onRemove,
}: OptionMenuProps) => {
  const wrapRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={wrapRef}
      className={[styles.menuWrap, align === "end" && styles.alignEnd].filter(Boolean).join(" ")}
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <OptionMenuContent
        displayIndex={displayIndex}
        currentColor={currentColor}
        canRemove={canRemove}
        hasImage={hasImage}
        primaryAction={primaryAction}
        onPickColor={onPickColor}
        onCustomColor={onCustomColor}
        onUploadImage={onUploadImage}
        onClearImage={onClearImage}
        onRemove={onRemove}
      />
    </div>
  );
};

export { OptionMenu };
export type { OptionMenuPrimaryAction };
