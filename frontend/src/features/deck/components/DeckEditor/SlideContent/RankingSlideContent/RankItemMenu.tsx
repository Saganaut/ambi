/**
 * Per-item popover menu for Ranking item rows — the same focus-opened pattern
 * as MCQ's option menu (`OptionControls/OptionField`) and `MatchCardMenu`:
 * the composer opens it when the row's label field takes
 * focus, this controller owns dismissal (outside pointerdown and Escape) with
 * the label field counted inside the boundary (it is the trigger — moving the
 * caret must not dismiss the menu). The menu itself is the shared `OptionMenu`
 * (palette + custom color, image upload/clear, delete). Ranking has no
 * kind-specific primary action — the correct order is the drag order, so there
 * is nothing to toggle — so the menu omits the leading action row.
 */
import { useEffect, useRef } from "react";

import { CustomColorPicker } from "@components/Forms/Input/ColorPicker/CustomColorPicker";
import type { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { useModal } from "@hooks/useModal";
import type { AppImage, RankItem } from "@deck/store/deckApi.gen";
import { emptyImage, isImageEmpty } from "@utils/image";
import { OptionMenu } from "../_shared/OptionMenu/OptionMenu";
import styles from "./RankingSlideContent.module.css";

interface RankItemMenuProps {
  item: RankItem;
  /** 1-based row position, for the accessible menu label. */
  displayIndex: number;
  /** DOM id of the row's label input — the menu's trigger, inside the dismissal boundary. */
  fieldId: string;
  /** The item's resolved color (override or palette default). */
  color: string;
  /** Controlled open state — the composer opens on label focus. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canRemove: boolean;
  onSetColor: (color: string) => void;
  onSetImage: (image: AppImage) => void;
  onRemove: () => void;
  openPicker: OpenGalleryPicker;
}

const RankItemMenu = ({
  item,
  displayIndex,
  fieldId,
  color,
  open,
  onOpenChange,
  canRemove,
  onSetColor,
  onSetImage,
  onRemove,
  openPicker,
}: RankItemMenuProps) => {
  const anchorRef = useRef<HTMLDivElement>(null);
  const { openModal, closeModal } = useModal();

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

  const handlePickColor = (next: string) => {
    onOpenChange(false);
    onSetColor(next);
  };

  const handleCustomColor = () => {
    onOpenChange(false);
    openModal({
      title: "Custom color",
      content: (
        <CustomColorPicker
          initialColor={color}
          onApply={(hex) => {
            onSetColor(hex);
            closeModal();
          }}
        />
      ),
    });
  };

  const handleUploadImage = () => {
    onOpenChange(false);
    openPicker(
      (image) => {
        onSetImage(image);
      },
      {
        title: "Upload an image",
        initialUrl: item.image?.externalSrc,
        cropWidth: 1,
        cropHeight: 1,
      },
    );
  };

  const handleClearImage = () => {
    onOpenChange(false);
    onSetImage(emptyImage());
  };

  const handleRemove = () => {
    onOpenChange(false);
    onRemove();
  };

  return (
    <div ref={anchorRef} className={styles.menuAnchor}>
      {open && (
        <OptionMenu
          displayIndex={displayIndex.toString()}
          currentColor={color}
          canRemove={canRemove}
          hasImage={!isImageEmpty(item.image)}
          onPickColor={handlePickColor}
          onCustomColor={handleCustomColor}
          onUploadImage={handleUploadImage}
          onClearImage={handleClearImage}
          onRemove={handleRemove}
        />
      )}
    </div>
  );
};

export { RankItemMenu };
