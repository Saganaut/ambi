/**
 * One authored pair in the Matching editor: the numbered `ItemCard` row whose
 * body is left card ↔ right card with a "match" connector between them. The
 * two cards share the pair's palette color by default (mirrored on the index
 * pill) but each can be recolored on its own. Removal lives in the cards'
 * menus (a pair is deleted whole), so the row itself renders no remove
 * button. A controlled row: all writes come in as props from the one
 * `useMatchingEditor` in `MatchingSlideContent`.
 */
import type { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { resolveDatumColor } from "@/shared/components/Charts/optionPalette";
import type { MatchingPairView, MatchSide } from "@deck/hooks/useMatchingEditor";
import type { AppImage } from "@deck/store/deckApi.gen";
import { ItemCard } from "../_shared";
import { MatchCardEditable } from "./MatchCardEditable";
import styles from "./MatchingSlideContent.module.css";

interface MatchingPairEditableProps {
  pair: MatchingPairView;
  pairIndex: number;
  /** Which card's menu is open (card id), if any — at most one per slide. */
  openMenuId: string | null;
  canRemovePair: boolean;
  onMenuOpenChange: (cardId: string | undefined, open: boolean) => void;
  onScheduleLabel: (side: MatchSide, cardId: string | undefined, label: string) => void;
  onFlush: () => void;
  onSetColor: (side: MatchSide, cardId: string | undefined, color: string) => void;
  onSetImage: (side: MatchSide, cardId: string | undefined, image: AppImage) => void;
  /** Remove this whole pair (keyed by its left card id). */
  onRemovePair: () => void;
  openPicker: OpenGalleryPicker;
}

const MatchingPairEditable = ({
  pair,
  pairIndex,
  openMenuId,
  canRemovePair,
  onMenuOpenChange,
  onScheduleLabel,
  onFlush,
  onSetColor,
  onSetImage,
  onRemovePair,
  openPicker,
}: MatchingPairEditableProps) => {
  const pairNumber = pairIndex + 1;

  const renderCard = (side: MatchSide) => {
    const card = pair[side];
    return (
      <MatchCardEditable
        card={card}
        side={side}
        pairNumber={pairNumber}
        color={resolveDatumColor(card.color, pairIndex)}
        menuOpen={card.id != null && openMenuId === card.id}
        canRemovePair={canRemovePair}
        onMenuOpenChange={(open) => {
          onMenuOpenChange(card.id, open);
        }}
        onScheduleLabel={(label) => {
          onScheduleLabel(side, card.id, label);
        }}
        onFlush={onFlush}
        onSetColor={(color) => {
          onSetColor(side, card.id, color);
        }}
        onSetImage={(image) => {
          onSetImage(side, card.id, image);
        }}
        onRemovePair={onRemovePair}
        openPicker={openPicker}
      />
    );
  };

  return (
    <ItemCard index={pairIndex} indexColor={resolveDatumColor(undefined, pairIndex)}>
      <div className={styles.pairBody}>
        {renderCard("left")}
        <span className={styles.connector} aria-hidden="true">
          <span className={styles.connectorArrow}>↔</span>
          <span className={styles.connectorLabel}>match</span>
        </span>
        {renderCard("right")}
      </div>
    </ItemCard>
  );
};

export { MatchingPairEditable };
