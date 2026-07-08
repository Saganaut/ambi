/**
 * Per-card popover menu for Matching pair cards — the same focus-opened
 * pattern as MCQ's option menu (`OptionControls/Menu`) and `AxisItemMenu`:
 * the composer opens it when the card's field (phrase input or image slot)
 * takes focus, this controller owns dismissal (outside pointerdown and
 * Escape) with the field counted inside the boundary (it is the trigger —
 * interacting with it must not dismiss the menu). The menu itself is the
 * shared `OptionMenu` (palette + custom color, image upload/clear, delete);
 * the kind-specific primary action flips the card between its two faces —
 * phrase and image. Delete removes the whole pair: a card never exists
 * without its partner.
 */
import { ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef } from "react";

import { CustomColorPicker } from "@components/Forms/Input/ColorPicker/CustomColorPicker";
import type { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { useModal } from "@hooks/useModal";
import type { AppImage, MatchItem } from "@deck/store/deckApi.gen";
import { emptyImage, isImageEmpty } from "@utils/image";
import { OptionMenu } from "../_shared/OptionMenu/OptionMenu";
import styles from "./MatchingSlideContent.module.css";

interface MatchCardMenuProps {
  card: MatchItem;
  /** Human label for the accessible menu name, e.g. "3 · left". */
  displayIndex: string;
  /** DOM id of the card's field — the menu's trigger, inside the dismissal boundary. */
  fieldId: string;
  /** The card's resolved color (override or pair palette default). */
  color: string;
  /** Controlled open state — the composer opens on field focus. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Whether the card currently shows its image face. */
  isImageCard: boolean;
  canRemovePair: boolean;
  /** Flip the card between its phrase and image faces. */
  onFlip: () => void;
  onSetColor: (color: string) => void;
  onSetImage: (image: AppImage) => void;
  /** Remove the whole pair this card belongs to. */
  onRemovePair: () => void;
  openPicker: OpenGalleryPicker;
}

const MatchCardMenu = ({
  card,
  displayIndex,
  fieldId,
  color,
  open,
  onOpenChange,
  isImageCard,
  canRemovePair,
  onFlip,
  onSetColor,
  onSetImage,
  onRemovePair,
  openPicker,
}: MatchCardMenuProps) => {
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
        initialUrl: card.image?.externalSrc,
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
    onRemovePair();
  };

  return (
    <div ref={anchorRef} className={styles.menuAnchor}>
      {open && (
        <OptionMenu
          displayIndex={displayIndex}
          currentColor={color}
          canRemove={canRemovePair}
          hasImage={!isImageEmpty(card.image)}
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

export { MatchCardMenu };
