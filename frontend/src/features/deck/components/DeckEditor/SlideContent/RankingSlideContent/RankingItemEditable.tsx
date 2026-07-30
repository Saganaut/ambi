/**
 * One item row in the Ranking editor's list: the shared `PlacementRow` in the
 * item's resolved color, draggable by its grip because the on-screen order IS
 * the answer key. Every row is therefore `scored` and none carries a leading
 * menu entry — there is no per-row answer to set — and no row is armed for
 * placement, so the row has no selected state either.
 *
 * A controlled row: which menu is open lives in the one
 * `useSlideComposerState` in `RankingSlideContent`, and every write funnels
 * through the single `useRankingEditor` there.
 */
import { resolveDatumColor } from "@/shared/components/Charts/optionPalette";
import type { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { RANKING_LABEL_MAX } from "@deck/hooks/useRankingEditor";
import type { AppImage, RankItem } from "@deck/store/deckApi.gen";
import { PlacementRow, type Identified } from "../_shared";

interface RankingItemEditableProps {
  item: Identified<RankItem>;
  sortIndex: number;
  /** Whether this row's popover menu is open (at most one per slide). */
  menuOpen: boolean;
  canRemove: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onScheduleLabel: (label: string) => void;
  onFlush: () => void;
  onSetColor: (color: string) => void;
  onSetImage: (image: AppImage) => void;
  onRemove: () => void;
  openPicker: OpenGalleryPicker;
}

const RankingItemEditable = ({
  item,
  sortIndex,
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
  const displayIndex = sortIndex + 1;

  return (
    <PlacementRow
      item={item}
      index={sortIndex}
      color={resolveDatumColor(item.color, sortIndex)}
      itemNoun="Item"
      labelMaxLength={RANKING_LABEL_MAX}
      scored
      draggable
      gripLabel={`Reorder item ${displayIndex.toString()}`}
      menuOpen={menuOpen}
      canRemove={canRemove}
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

export { RankingItemEditable };
