/**
 * One card of a Matching pair. A card holds exactly one face at a time — a
 * phrase (fit-to-slot text field) or an image (gallery-picked thumbnail) —
 * with a footer flip button to switch. Which face shows is derived from the
 * data (an image set → image face) plus a local "flipped to image, nothing
 * uploaded yet" override, so no ambiguous phrase+image state ever persists:
 * flipping an image card back to phrase clears its image.
 *
 * Focusing the card's field (phrase input or image slot) opens its popover
 * menu (flip, color, image, delete pair) — MCQ's option-menu pattern; the
 * composer owns which menu is open. Clicking the image slot goes straight to
 * the gallery picker. A controlled card: the phrase mirror lives here while
 * every write comes in as props from the one `useMatchingEditor` in
 * `MatchingSlideContent`.
 */
import { ArrowsRightLeftIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { useState, type CSSProperties } from "react";

import { TextArea } from "@components/Forms/Input/TextArea/TextArea";
import type { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { useFitText } from "@hooks/useFitText";
import { MATCHING_LABEL_MAX, type MatchSide } from "@deck/hooks/useMatchingEditor";
import type { AppImage, MatchItem } from "@deck/store/deckApi.gen";
import { emptyImage, isImageEmpty, resolveImageUrl } from "@utils/image";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { MatchCardMenu } from "./MatchCardMenu";
import styles from "./MatchingSlideContent.module.css";

interface MatchCardEditableProps {
  card: MatchItem;
  side: MatchSide;
  /** 1-based pair position, for placeholders and accessible names. */
  pairNumber: number;
  /** The card's resolved color (override or pair palette default). */
  color: string;
  /** Whether this card's popover menu is open (at most one per slide). */
  menuOpen: boolean;
  canRemovePair: boolean;
  onMenuOpenChange: (open: boolean) => void;
  /** Debounced phrase edit. */
  onScheduleLabel: (label: string) => void;
  onFlush: () => void;
  onSetColor: (color: string) => void;
  onSetImage: (image: AppImage) => void;
  /** Remove the whole pair this card belongs to. */
  onRemovePair: () => void;
  openPicker: OpenGalleryPicker;
}

const MatchCardEditable = ({
  card,
  side,
  pairNumber,
  color,
  menuOpen,
  canRemovePair,
  onMenuOpenChange,
  onScheduleLabel,
  onFlush,
  onSetColor,
  onSetImage,
  onRemovePair,
  openPicker,
}: MatchCardEditableProps) => {
  const cardId = card.id ?? "";
  const fieldId = `match-card-${cardId}`;

  const [label, setLabel] = useState(card.label ?? "");
  // "Flipped to image but nothing uploaded yet" — pure UI state; the card
  // reads back as a phrase card until an image is actually picked.
  const [flippedToImage, setFlippedToImage] = useState(false);
  const [syncedFromId, setSyncedFromId] = useState(card.id);
  if (syncedFromId !== card.id) {
    setSyncedFromId(card.id);
    setLabel(card.label ?? "");
    setFlippedToImage(false);
  }

  const hasImage = !isImageEmpty(card.image);
  const isImageCard = hasImage || flippedToImage;
  const thumbnailSrc = hasImage ? resolveImageUrl(card.image, "SM", cardId, 200, 200, false) : null;

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
        initialUrl: card.image?.externalSrc,
        cropWidth: 1,
        cropHeight: 1,
      },
    );
  };

  return (
    <div className={styles.card} style={{ "--match-card-color": color } as CSSProperties}>
      {isImageCard ? (
        <button
          type="button"
          id={fieldId}
          className={styles.imageSlot}
          onClick={handlePickImage}
          onFocus={() => {
            onMenuOpenChange(true);
          }}
          aria-label={`Pair ${pairNumber.toString()} ${side} card image`}
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
          maxLength={MATCHING_LABEL_MAX}
          value={label}
          placeholder={`Card ${pairNumber.toString()}${side === "left" ? "a" : "b"}`}
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
        <MatchCardMenu
          card={card}
          displayIndex={`${pairNumber.toString()} · ${side}`}
          fieldId={fieldId}
          color={color}
          open={menuOpen}
          onOpenChange={onMenuOpenChange}
          isImageCard={isImageCard}
          canRemovePair={canRemovePair}
          onFlip={handleFlip}
          onSetColor={onSetColor}
          onSetImage={onSetImage}
          onRemovePair={onRemovePair}
          openPicker={openPicker}
        />
        <IconBtn
          fill="ghost"
          size="xs"
          icon={<ArrowsRightLeftIcon />}
          aria-label={`Switch pair ${pairNumber.toString()} ${side} card to ${isImageCard ? "a phrase" : "an image"}`}
          onClick={handleFlip}
        />
      </div>
    </div>
  );
};

export { MatchCardEditable };
