/**
 * Single-row editor for a Ranking item: a palette-colored index badge, the
 * label field with its popover menu (the shared `ItemField` — color, image
 * upload/clear, delete), and an image thumbnail when one is set. Focusing the
 * label field opens the row's menu — the same focus-opened pattern as MCQ's
 * option menu and `AxisItemEditable`; `ItemField` owns the label mirror,
 * positioning, and dismissal. Ranking has no kind-specific primary action
 * (the correct order is the drag order, so there is nothing to toggle), so the
 * menu omits the leading action row. Structural ops (schedule / flush / remove
 * / color / image) come in as props from the one `useRankingEditor` in
 * `RankingSlideContent`, so every write funnels through a single draft +
 * debounce buffer.
 *
 * The row is drag-sortable via a dedicated grip handle (`handleRef`) rather than
 * the whole card, so dragging to reorder never fights with typing into the
 * label input. Authoring order is the correct order, so a drop rewrites
 * `correctOrder` upstream in the parent hook.
 */
import { Bars2Icon } from "@heroicons/react/24/outline";
import { useSortable } from "@dnd-kit/react/sortable";

import type { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { RANKING_LABEL_MAX } from "@deck/hooks/useRankingEditor";
import type { AppImage, RankItem } from "@deck/store/deckApi.gen";
import { resolveImageUrl } from "@utils/image";
import { ItemCard, ItemField } from "../_shared";
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

  const displayIndex = sortIndex + 1;
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
          <ItemField
            itemId={item.id}
            label={item.label}
            image={item.image}
            displayIndex={displayIndex}
            placeholder={`Item ${displayIndex.toString()}`}
            maxLength={RANKING_LABEL_MAX}
            color={color}
            open={menuOpen}
            onOpenChange={onMenuOpenChange}
            canRemove={canRemove}
            onScheduleLabel={(label) => {
              onScheduleLabel({ ...item, label });
            }}
            onFlush={onFlush}
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
