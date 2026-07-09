/**
 * One editable "phrase or image" card — the shared body for slide-kind items
 * that hold either a short text or a picked image (Matching cards, Grid
 * items). A card shows exactly one face at a time — a phrase (fit-to-slot
 * text field) or an image (gallery-picked thumbnail) — with a footer flip
 * button to switch. Which face shows is derived from the data (an image set →
 * image face) plus a local "flipped to image, nothing uploaded yet" override,
 * so no ambiguous phrase+image state ever persists: flipping an image card
 * back to phrase clears its image.
 *
 * Focusing the card's field (phrase input or image slot) opens its popover
 * menu (flip, color, image, delete) — MCQ's option-menu pattern; the composer
 * owns which menu is open (at most one per slide). Clicking the image slot
 * goes straight to the gallery picker. A controlled card: the phrase mirror
 * lives here while every write comes in as props from the composer's one
 * editor hook. What "delete" means (the whole Matching pair, the one Grid
 * item) is the caller's: it supplies the handler and the enable flag.
 */
import { ArrowsRightLeftIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { useState, type CSSProperties, type ReactNode } from "react";

import { TextArea } from "@components/Forms/Input/TextArea/TextArea";
import type { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { useFitText } from "@hooks/useFitText";
import type { AppImage } from "@deck/store/deckApi.gen";
import { emptyImage, isImageEmpty, resolveImageUrl } from "@utils/image";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { PhraseOrImageCardMenu } from "./PhraseOrImageCardMenu";
import styles from "./PhraseOrImageCard.module.css";

/** The slice of an item a card edits — Matching cards and Grid items fit. */
interface PhraseOrImageItem {
  id?: string;
  label?: string;
  image?: AppImage;
}

interface PhraseOrImageCardProps {
  item: PhraseOrImageItem;
  /** Human name for accessible labels, e.g. "pair 3 left card" / "item 4". */
  itemName: string;
  /** Short display identifier for the menu's accessible name, e.g. "3 · left". */
  displayIndex: string;
  /** Placeholder for the phrase field. */
  placeholder: string;
  /** `maxLength` for the phrase field. */
  labelMaxLength: number;
  /** The card's resolved accent color (override or palette default). */
  color: string;
  /** Whether this card's popover menu is open (the composer owns it). */
  menuOpen: boolean;
  canRemove: boolean;
  onMenuOpenChange: (open: boolean) => void;
  /** Debounced phrase edit. */
  onScheduleLabel: (label: string) => void;
  onFlush: () => void;
  onSetColor: (color: string) => void;
  onSetImage: (image: AppImage) => void;
  /** Remove whatever unit this card stands for (pair, item). */
  onRemove: () => void;
  openPicker: OpenGalleryPicker;
  /** Extra footer action(s) rendered beside the flip button, e.g. a drag grip. */
  actions?: ReactNode;
}

const PhraseOrImageCard = ({
  item,
  itemName,
  displayIndex,
  placeholder,
  labelMaxLength,
  color,
  menuOpen,
  canRemove,
  onMenuOpenChange,
  onScheduleLabel,
  onFlush,
  onSetColor,
  onSetImage,
  onRemove,
  openPicker,
  actions,
}: PhraseOrImageCardProps) => {
  const itemId = item.id ?? "";
  const fieldId = `phrase-image-card-${itemId}`;

  const [label, setLabel] = useState(item.label ?? "");
  // "Flipped to image but nothing uploaded yet" — pure UI state; the card
  // reads back as a phrase card until an image is actually picked.
  const [flippedToImage, setFlippedToImage] = useState(false);
  const [syncedFromId, setSyncedFromId] = useState(item.id);
  if (syncedFromId !== item.id) {
    setSyncedFromId(item.id);
    setLabel(item.label ?? "");
    setFlippedToImage(false);
  }

  const hasImage = !isImageEmpty(item.image);
  const isImageCard = hasImage || flippedToImage;
  const thumbnailSrc = hasImage ? resolveImageUrl(item.image, "SM", itemId, 200, 200, false) : null;

  // Called unconditionally to keep hook order stable; the ref only attaches
  // while the phrase face renders.
  const fitRef = useFitText<HTMLTextAreaElement>(label, { minPx: 11, maxPx: 18 });

  const handleFlip = () => {
    if (isImageCard) {
      // Leaving the image face discards its image so the card can't persist
      // both faces at once (image presence is what marks an image card).
      if (hasImage) onSetImage(emptyImage());
      setFlippedToImage(false);
    } else {
      setFlippedToImage(true);
    }
  };

  const handlePickImage = () => {
    onMenuOpenChange(false);
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

  return (
    <div className={styles.card} style={{ "--card-color": color } as CSSProperties}>
      {isImageCard ? (
        <button
          type="button"
          id={fieldId}
          className={styles.imageSlot}
          onClick={handlePickImage}
          onFocus={() => {
            onMenuOpenChange(true);
          }}
          aria-label={`${itemName} image`}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
        >
          {thumbnailSrc ? (
            <img className={styles.imageThumbnail} src={thumbnailSrc} alt="" />
          ) : (
            <span className={styles.uploadHint}>
              <PhotoIcon className={styles.uploadHintIcon} aria-hidden="true" />
              Upload an image
            </span>
          )}
        </button>
      ) : (
        <TextArea
          isBordered={false}
          fullWidth
          autoGrow={false}
          rows={2}
          ref={fitRef}
          id={fieldId}
          maxLength={labelMaxLength}
          value={label}
          placeholder={placeholder}
          onChange={(e) => {
            const next = e.target.value;
            setLabel(next);
            onScheduleLabel(next);
          }}
          onFocus={() => {
            onMenuOpenChange(true);
          }}
          onBlur={onFlush}
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
        />
      )}
      <div className={styles.cardFooter}>
        <span className={styles.kindBadge}>{isImageCard ? "Image" : "Phrase"}</span>
        <PhraseOrImageCardMenu
          item={item}
          displayIndex={displayIndex}
          fieldId={fieldId}
          color={color}
          open={menuOpen}
          onOpenChange={onMenuOpenChange}
          isImageCard={isImageCard}
          canRemove={canRemove}
          onFlip={handleFlip}
          onSetColor={onSetColor}
          onSetImage={onSetImage}
          onRemove={onRemove}
          openPicker={openPicker}
        />
        {actions}
        <IconBtn
          fill="ghost"
          size="xs"
          icon={<ArrowsRightLeftIcon />}
          aria-label={`Switch ${itemName} to ${isImageCard ? "a phrase" : "an image"}`}
          onClick={handleFlip}
        />
      </div>
    </div>
  );
};

export { PhraseOrImageCard };
export type { PhraseOrImageItem };
