/**
 * One item row in the Grid editor's bank: the shared `PlacementRow` in the
 * item's resolved color (the same fill its chip carries in the matrix), a
 * placed item carrying its cell name as trailing meta plus the row's "answer
 * set" check — an unplaced one shows neither, the absent pair saying
 * "unplaced" without a word for it. Unplacing is the matrix's job (drag a chip
 * off it), so the row menu carries no leading entry.
 *
 * A controlled row: which row is armed and which menu is open live in the one
 * `useSlideComposerState` in `GridSlideContent`, and every write funnels
 * through the single `useGridEditor` there.
 */
import { resolveDatumColor } from "@/shared/components/Charts/optionPalette";
import type { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { GRID_ITEM_LABEL_MAX } from "@deck/hooks/useGridEditor";
import type { AppImage, GridItem } from "@deck/store/deckApi.gen";
import { PlacementRow, type Identified } from "../_shared";
import styles from "./GridSlideContent.module.css";

interface GridItemEditableProps {
  item: Identified<GridItem>;
  sortIndex: number;
  /** The cell id this item is targeted at, or undefined while unplaced. */
  cell: string | undefined;
  /** Human name of a cell id, e.g. "Forest × Small". */
  cellNameOf: (cell: string) => string;
  /** Whether this row is armed — a cell's "Place here" places its item. */
  selected: boolean;
  /** Whether this row's popover menu is open (at most one per slide). */
  menuOpen: boolean;
  canRemove: boolean;
  onSelect: () => void;
  onMenuOpenChange: (open: boolean) => void;
  onScheduleLabel: (label: string) => void;
  onFlush: () => void;
  onSetColor: (color: string) => void;
  onSetImage: (image: AppImage) => void;
  onRemove: () => void;
  openPicker: OpenGalleryPicker;
}

const GridItemEditable = ({
  item,
  sortIndex,
  cell,
  cellNameOf,
  selected,
  menuOpen,
  canRemove,
  onSelect,
  onMenuOpenChange,
  onScheduleLabel,
  onFlush,
  onSetColor,
  onSetImage,
  onRemove,
  openPicker,
}: GridItemEditableProps) => {
  const displayIndex = sortIndex + 1;

  return (
    <PlacementRow
      item={item}
      index={sortIndex}
      color={resolveDatumColor(item.color, sortIndex)}
      itemNoun="Item"
      labelMaxLength={GRID_ITEM_LABEL_MAX}
      scored={cell != null}
      draggable
      gripLabel={`Reorder item ${displayIndex.toString()}`}
      selected={selected}
      menuOpen={menuOpen}
      canRemove={canRemove}
      meta={cell == null ? undefined : <span className={styles.rowMeta}>{cellNameOf(cell)}</span>}
      onSelect={onSelect}
      onMenuOpenChange={onMenuOpenChange}
      onScheduleLabel={onScheduleLabel}
      onFlush={onFlush}
      onSetColor={onSetColor}
      onSetImage={onSetImage}
      onRemove={onRemove}
      openPicker={openPicker}
    />
  );
};

export { GridItemEditable };
