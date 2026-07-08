/**
 * Modal body that lets the user pick which element kind to add to the deck.
 *
 * Renders the existing `SlideTypeGraphics` as clickable tiles. Clicking a tile
 * immediately invokes `onPick` (which closes the modal and creates the element
 * via the deck-dashboard hook). No two-step "select + confirm" — the click is
 * the commit.
 */

import { SlideType } from "@deck/store/deckEnums.gen";
import { SelectableTile } from "@ui/SelectableTile/SelectableTile";
import { slideTypeGraphics } from "../../Slides/SlideTypeGraphics/slideTypeGraphics";
import styles from "./NewSlideModal.module.css";

interface NewSlideModalProps {
  onPick: (slideType: SlideType) => void;
}

const SLIDE_TYPE_LABELS: Omit<Record<SlideType, string>, "TITLE"> = {
  // TITLE: "Title", omitting title now as it is not necessary
  CONTENT: "Content",
  MCQ: "Multiple Choice",
  TEXT: "Text Answer",
  NUMBER: "Number Answer",
  RANKING: "Ranking",
  SCALES: "Scales",
  Q_AND_A: "Q & A",
  GRID: "Grid",
  AXIS: "Axis",
  PLACE_ON_IMAGE: "Place on Image",
  ALLOCATION: "Allocation",
  MATCHING: "Matching",
  DRAWING: "Drawing",
  MEDIA: "Media",
  INSTRUCTION: "Instructions",
  FOLLOW_UP: "Follow Up",
};

// Preserve the order defined in the graphics map by reading its keys directly.
// Excluded from the picker:
//   - FOLLOW_UP — never created standalone; attached to a parent slide via its
//     "Add follow-up slide" action.
const HIDDEN_SLIDE_TYPES: ReadonlySet<SlideType> = new Set(["FOLLOW_UP"]);

const NON_SCORABLE_SLIDE_TYPE_KEYS = ["CONTENT", "INSTRUCTION", "MEDIA", "TITLE"];

// Seperate into Scorable and Non-Scorable slides
const SCORABLE_SLIDE_TYPES = (Object.keys(slideTypeGraphics) as SlideType[]).filter(
  (slideType) =>
    !HIDDEN_SLIDE_TYPES.has(slideType) && !NON_SCORABLE_SLIDE_TYPE_KEYS.includes(slideType),
);

const NON_SCORABLE_SLIDE_TYPES = (Object.keys(slideTypeGraphics) as SlideType[]).filter(
  (slideType) =>
    !HIDDEN_SLIDE_TYPES.has(slideType) &&
    NON_SCORABLE_SLIDE_TYPE_KEYS.includes(slideType) &&
    slideType !== "TITLE",
);

const NewSlideModal = ({ onPick }: NewSlideModalProps) => {
  return (
    <div className={styles.newSlideModalBody}>
      <div>
        <h2>Interactive Slides</h2>
        <div className={styles.grid}>
          {SCORABLE_SLIDE_TYPES.map((slideType) => {
            const Graphic = slideTypeGraphics[slideType];
            return (
              <SelectableTile
                key={slideType}
                size="sm"
                media={<Graphic />}
                title={SLIDE_TYPE_LABELS[slideType as Exclude<SlideType, "TITLE">]}
                onClick={() => {
                  onPick(slideType);
                }}
              />
            );
          })}
        </div>
        <div>
          <h2>Presentation Slides</h2>

          <div className={styles.grid}>
            {NON_SCORABLE_SLIDE_TYPES.map((slideType) => {
              const Graphic = slideTypeGraphics[slideType];
              return (
                <SelectableTile
                  key={slideType}
                  size="sm"
                  media={<Graphic />}
                  title={SLIDE_TYPE_LABELS[slideType as Exclude<SlideType, "TITLE">]}
                  onClick={() => {
                    onPick(slideType);
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export { NewSlideModal };
