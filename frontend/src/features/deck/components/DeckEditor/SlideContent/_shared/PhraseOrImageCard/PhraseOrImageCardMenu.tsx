/**
 * Per-card popover menu for phrase-or-image cards — the same focus-opened
 * pattern as MCQ's option menu (`OptionControls/OptionField`) and `RankItemMenu`:
 * the card opens it when its field (phrase input or image slot) takes focus,
 * this controller owns dismissal (outside pointerdown and Escape) with the
 * field counted inside the boundary (it is the trigger — interacting with it
 * must not dismiss the menu). The menu itself is the shared `OptionMenu`
 * (palette + custom color, image upload/clear, delete); the primary action
 * flips the card between its two faces — phrase and image. What delete
 * removes (a whole Matching pair, one Grid item) is the composer's business.
 */
import { ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef } from "react";

import { CustomColorPicker } from "@components/Forms/Input/ColorPicker/CustomColorPicker";
import type { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { useModal } from "@hooks/useModal";
import type { AppImage } from "@deck/store/deckApi.gen";
import { emptyImage, isImageEmpty } from "@utils/image";
import { OptionMenu } from "../OptionMenu/OptionMenu";
import styles from "./PhraseOrImageCard.module.css";

interface PhraseOrImageCardMenuProps {
  item: { image?: AppImage };
  /** Human label for the accessible menu name, e.g. "3 · left". */
  displayIndex: string;
  /** DOM id of the card's field — the menu's trigger, inside the dismissal boundary. */
  fieldId: string;
  /** The card's resolved accent color (override or palette default). */
  color: string;
  /** Controlled open state — the card opens on field focus. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Whether the card currently shows its image face. */
  isImageCard: boolean;
  canRemove: boolean;
  /** Flip the card between its phrase and image faces. */
  onFlip: () => void;
  onSetColor: (color: string) => void;
  onSetImage: (image: AppImage) => void;
  /** Remove whatever unit this card stands for (pair, item). */
  onRemove: () => void;
  openPicker: OpenGalleryPicker;
}

const PhraseOrImageCardMenu = ({
  item,
  displayIndex,
  fieldId,
  color,
  open,
  onOpenChange,
  isImageCard,
  canRemove,
  onFlip,
  onSetColor,
  onSetImage,
  onRemove,
  openPicker,
}: PhraseOrImageCardMenuProps) => {
  const anchorRef = useRef<HTMLDivElement>(null);
  const { openModal, closeModal } = useModal();

  // Dismissal boundary: menu subtree + the card's field (the trigger).
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

  const handleFlip = () => {
    onOpenChange(false);
    onFlip();
  };

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
          displayIndex={displayIndex}
          currentColor={color}
          canRemove={canRemove}
          hasImage={!isImageEmpty(item.image)}
          primaryAction={{
            label: isImageCard ? "Use a phrase" : "Use an image",
            icon: ArrowsRightLeftIcon,
            pressed: isImageCard,
            onSelect: handleFlip,
          }}
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

export { PhraseOrImageCardMenu };
