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
 * menu (flip, color, image, delete) — the same field-as-trigger pattern as
 * MCQ's `OptionField` and the shared `ItemField`. The face is the popover's anchor;
 * `FloatingPopover` handles portalling, positioning, and dismissal (outside
 * press + Escape), with focus management off so opening never pulls the caret
 * out of the phrase field and `listNavigation` for arrow-key access into the
 * shared `OptionMenuContent`. The custom-color path swaps the popover body to
 * the shared `CustomColorPanel` (back returns to the menu). The composer owns
 * which menu is open (at most one per slide). Clicking the image slot goes
 * straight to the gallery picker. A controlled card: the phrase mirror lives
 * here while every write
 * comes in as props from the composer's one editor hook. What "delete" means
 * (the whole Matching pair, the one Grid item) is the caller's: it supplies
 * the handler and the enable flag.
 */
import { ArrowsRightLeftIcon, PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState, type CSSProperties, type HTMLProps, type ReactNode } from "react";

import { PopoverNavContext } from "@/shared/components/Popover/PopoverNavContext";
import { FloatingPopover } from "@/shared/components/Popover/PopoverWrapper";
import type { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { AppImg } from "@components/Images/AppImg";
import { TextArea } from "@components/Forms/Input/TextArea/TextArea";
import type { AppImage } from "@deck/store/deckApi.gen";
import { useFitText } from "@hooks/useFitText";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { emptyImage, isImageEmpty, resolveImageUrl } from "@utils/image";
import { CustomColorPanel } from "../OptionMenu/CustomColorPanel";
import { OptionMenuContent } from "../OptionMenu/OptionMenuContent";
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

  // Whether the popover shows the custom-color view instead of the menu.
  const [customColorOpen, setCustomColorOpen] = useState(false);

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

  // Route open-state changes so closing (dismissal included) always lands
  // back on the menu view the next time the popover opens.
  const handleMenuOpenChange = (next: boolean) => {
    if (!next) setCustomColorOpen(false);
    onMenuOpenChange(next);
  };

  const handlePickImage = () => {
    onMenuOpenChange(false);
    openPicker(
      (image) => {
        onSetImage(image);
      },
      {
        title: "Upload an image",
        current: item.image,
        // Option thumbnails are square: a gallery pick has to be cropped to that
        // frame too, not just an upload.
        crop: { mode: "required", aspect: 1 },
      },
    );
  };

  const handleMenuFlip = () => {
    onMenuOpenChange(false);
    handleFlip();
  };

  const handlePickColor = (next: string) => {
    onMenuOpenChange(false);
    onSetColor(next);
  };

  const handleCustomColor = () => {
    setCustomColorOpen(true);
  };

  const handleClearImage = () => {
    onMenuOpenChange(false);
    onSetImage(emptyImage());
  };

  const handleRemove = () => {
    onMenuOpenChange(false);
    onRemove();
  };

  return (
    <div className={styles.card} style={{ "--card-color": color } as CSSProperties}>
      <FloatingPopover
        openOn="controlled"
        manageFocus={false}
        listNavigation
        open={menuOpen}
        onOpenChange={handleMenuOpenChange}
        placement="bottom-start"
        offsetAmount={8}
        zIndex={100}
        renderTrigger={(triggerProps) => (
          // triggerProps carries floating-ui's callback ref (typed for a generic
          // HTMLElement); it attaches fine to a div at runtime.
          <div {...(triggerProps as HTMLProps<HTMLDivElement>)} className={styles.triggerWrap}>
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
                  <AppImg className={styles.imageThumbnail} src={thumbnailSrc} alt="" fallbackSeed={itemId} />
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
            {/* Sibling of the image slot, never nested inside it: the slot is
                itself a button. Same clear the menu's "Remove image" row runs,
                so the card falls back to its phrase face. */}
            {hasImage && (
              <IconBtn
                fill="ghost"
                size="xs"
                className={styles.imageClear}
                icon={<XMarkIcon />}
                aria-label={`Remove ${itemName} image`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearImage();
                }}
              />
            )}
          </div>
        )}
      >
        {({ ctx }) => (
          <div style={ctx.styles}>
            {customColorOpen ? (
              <CustomColorPanel
                value={color}
                onPick={onSetColor}
                onBack={() => {
                  setCustomColorOpen(false);
                }}
                onClose={() => {
                  handleMenuOpenChange(false);
                }}
              />
            ) : (
              <PopoverNavContext value={ctx.listNav ?? null}>
                <OptionMenuContent
                  displayIndex={displayIndex}
                  currentColor={color}
                  canRemove={canRemove}
                  hasImage={hasImage}
                  primaryAction={{
                    label: isImageCard ? "Use a phrase" : "Use an image",
                    icon: ArrowsRightLeftIcon,
                    pressed: isImageCard,
                    onSelect: handleMenuFlip,
                  }}
                  onPickColor={handlePickColor}
                  onCustomColor={handleCustomColor}
                  onUploadImage={handlePickImage}
                  onClearImage={handleClearImage}
                  onRemove={handleRemove}
                />
              </PopoverNavContext>
            )}
          </div>
        )}
      </FloatingPopover>
      <div className={styles.cardFooter}>
        <span className={styles.kindBadge}>{isImageCard ? "Image" : "Phrase"}</span>
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
