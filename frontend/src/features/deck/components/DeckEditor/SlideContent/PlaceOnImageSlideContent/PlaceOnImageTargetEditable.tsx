/**
 * One target row in the Place-on-Image editor's list: the shared
 * `PlacementRow` in the target's resolved color (the same fill its marker
 * carries on the image), draggable by its grip because row order drives each
 * marker's number, so reordering is how an author renumbers the set. Every row
 * is `scored` and none carries a leading menu entry: a target exists only by
 * being placed, so there is no per-row answer to set.
 *
 * A controlled row: which menu is open lives in the one
 * `useSlideComposerState` in `PlaceOnImageSlideContent`, and every write
 * funnels through the single `usePlaceOnImageEditor` there.
 */
import { resolveDatumColor } from "@/shared/components/Charts/optionPalette";
import type { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { PLACE_LABEL_MAX, type PlaceTargetView } from "@deck/hooks/usePlaceOnImageEditor";
import type { AppImage } from "@deck/store/deckApi.gen";
import { PlacementRow } from "../_shared";

interface PlaceOnImageTargetEditableProps {
  target: PlaceTargetView;
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

const PlaceOnImageTargetEditable = ({
  target,
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
}: PlaceOnImageTargetEditableProps) => {
  const displayIndex = sortIndex + 1;

  return (
    <PlacementRow
      item={target}
      index={sortIndex}
      color={resolveDatumColor(target.color, sortIndex)}
      itemNoun="Target"
      labelMaxLength={PLACE_LABEL_MAX}
      scored
      draggable
      gripLabel={`Reorder target ${displayIndex.toString()}`}
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

export { PlaceOnImageTargetEditable };
