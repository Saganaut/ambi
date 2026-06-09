/**
 * Modal body that lets the user pick which element kind to add to the deck.
 *
 * Renders the existing `SlideTypeGraphics` as clickable tiles. Clicking a tile
 * immediately invokes `onPick` (which closes the modal and creates the element
 * via the deck-dashboard hook). No two-step "select + confirm" — the click is
 * the commit.
 */

import { SelectableTile } from "@ui/SelectableTile/SelectableTile";
import styles from "./NewSlideModal.module.css";
import { slideTypeGraphics } from "../../Slides/SlideTypeGraphics/slideTypeGraphics";
import { SlideType } from "@deck/store/deckEnums.gen";

interface NewSlideModalProps {
  onPick: (slideType: SlideType) => void;
}

const SLIDE_TYPE_LABELS: Record<SlideType, string> = {
  TITLE: "Title",
  MCQ: "Multiple Choice",
  TEXT: "Text Answer",
  NUMBER: "Number Answer",
  RANKING: "Ranking",
  SCALES: "Scales",
  Q_AND_A: "Q & A",
  GRID: "Grid",
  PLACE_ON_IMAGE: "Place on Image",
  ALLOCATION: "Allocation",
  MATCHING: "Matching",
  DRAWING: "Drawing",
  MEDIA: "Media",
  FOLLOW_UP: "Follow Up",
};

// Preserve the order defined in the graphics map by reading its keys directly.
const SLIDE_TYPES = Object.keys(slideTypeGraphics) as SlideType[];

const NewSlideModal = ({ onPick }: NewSlideModalProps) => {
  return (
    <div className={styles.grid}>
      {SLIDE_TYPES.map((slideType) => {
        const Graphic = slideTypeGraphics[slideType];
        return (
          <SelectableTile
            key={slideType}
            size='sm'
            media={<Graphic />}
            title={SLIDE_TYPE_LABELS[slideType]}
            onClick={() => {
              onPick(slideType);
            }}
          />
        );
      })}
    </div>
  );
};

export { NewSlideModal };
