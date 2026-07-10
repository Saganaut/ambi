/**
 * Single-row editor for a Ranking item: a palette-colored index badge, the
 * label field, and an image thumbnail when one is set. Focusing the label
 * field opens the row's popover menu (color, image upload/clear, delete) — the
 * same focus-opened pattern as MCQ's option menu and `AxisItemEditable`. A
 * controlled row: the label mirror lives here while structural ops (schedule /
 * flush / remove / color / image) come in as props from the one
 * `useRankingEditor` in `RankingSlideContent`, so every write funnels through a
 * single draft + debounce buffer.
 *
 * The row is drag-sortable via a dedicated grip handle (`handleRef`) rather than
 * the whole card, so dragging to reorder never fights with typing into the
 * label input. Authoring order is the correct order, so a drop rewrites
 * `correctOrder` upstream in the parent hook.
 */
import { Bars2Icon } from "@heroicons/react/24/outline";
import { useSortable } from "@dnd-kit/react/sortable";
import { useState } from "react";

import type { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { Input } from "@components/Forms/Input/Input/Input";
import type { AppImage, RankItem } from "@deck/store/deckApi.gen";
import { resolveImageUrl } from "@utils/image";
import { ItemCard } from "../_shared";
import { RankItemMenu } from "./RankItemMenu";
import styles from "./RankingSlideContent.module.css";

interface RankingItemEditableProps {
  item: RankItem;
  sortIndex: number;
  /** The item's resolved color — the index badge fill. */
  color: string;
  /** Whether this row's popover menu is open (at most one per slide). */
  menuOpen: boolean;
  canRemove: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onScheduleLabel: (next: RankItem) => void;
  onFlush: () => void;
  onSetColor: (color: string) => void;
  onSetImage: (image: AppImage) => void;
  onRemove: () => void;
  openPicker: OpenGalleryPicker;
}

const RankingItemEditable = ({
  item,
  sortIndex,
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
}: RankingItemEditableProps) => {
  const itemId = item.id ?? "";
  const { ref, handleRef, isDragging } = useSortable({ id: itemId, index: sortIndex });

  const [label, setLabel] = useState(item.label ?? "");
  const [syncedFromId, setSyncedFromId] = useState(item.id);

  // Resync the local mirror when this row is reused for a different item
  // ("derive state during render" — safe when the value differs).
  if (syncedFromId !== item.id) {
    setSyncedFromId(item.id);
    setLabel(item.label ?? "");
  }

  const displayIndex = sortIndex + 1;
  const fieldId = `rank-item-label-${itemId}`;
  const thumbnailSrc = resolveImageUrl(item.image, "SM", itemId, 200, 200, false);

  return (
    <div ref={ref} className={isDragging ? styles.dragging : undefined}>
      <ItemCard
        index={sortIndex}
        indexColor={color}
        actions={
          <span
            ref={handleRef}
            className={styles.dragHandle}
            role="button"
            aria-label={`Reorder item ${displayIndex.toString()}`}
          >
            <Bars2Icon className={styles.dragHandleIcon} />
          </span>
        }
      >
        <div className={styles.itemFields}>
          <Input
            type="text"
            fullWidth
            withPadding={false}
            id={fieldId}
            className={styles.labelField}
            value={label}
            placeholder={`Item ${displayIndex.toString()}`}
            onChange={(e) => {
              const next = e.target.value;
              setLabel(next);
              onScheduleLabel({ ...item, label: next });
            }}
            onFocus={() => {
              onMenuOpenChange(true);
            }}
            onBlur={onFlush}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
          />
          <RankItemMenu
            item={item}
            displayIndex={displayIndex}
            fieldId={fieldId}
            color={color}
            open={menuOpen}
            onOpenChange={onMenuOpenChange}
            canRemove={canRemove}
            onSetColor={onSetColor}
            onSetImage={onSetImage}
            onRemove={onRemove}
            openPicker={openPicker}
          />
          {thumbnailSrc && <img className={styles.itemThumbnail} src={thumbnailSrc} alt="" />}
        </div>
      </ItemCard>
    </div>
  );
};

export { RankingItemEditable };
