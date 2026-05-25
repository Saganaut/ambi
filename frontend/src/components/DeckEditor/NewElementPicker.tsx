/**
 * Modal body that lets the user pick which element kind to add to the deck.
 *
 * Renders the existing `SlideTypeGraphics` as clickable tiles. Clicking a tile
 * immediately invokes `onPick` (which closes the modal and creates the element
 * via the deck-dashboard hook). No two-step "select + confirm" — the click is
 * the commit.
 */
import type { ElementKind } from "@/components/Common/Slides/SlideTypeGraphics/slideTypeGraphics";
import { slideTypeGraphics } from "@/components/Common/Slides/SlideTypeGraphics/slideTypeGraphics";
import { SelectableTile } from "@/components/Common/SelectableTile/SelectableTile";
import styles from "./NewElementPicker.module.css";

interface NewElementPickerProps {
  onPick: (kind: ElementKind) => void;
}

const KIND_LABELS: Record<ElementKind, string> = {
  Slide: "Slide",
  McqQuestion: "Multiple Choice",
  TextQuestion: "Text Answer",
  NumberQuestion: "Number Answer",
  RankingQuestion: "Ranking",
  ScalesQuestion: "Scales",
  QAndAQuestion: "Q & A",
  GridQuestion: "Grid",
  PlaceOnImageQuestion: "Place on Image",
  WordCloudQuestion: "Word Cloud",
  AllocationQuestion: "Allocation",
  MatchingQuestion: "Matching",
  DrawingQuestion: "Drawing",
};

// Preserve the order defined in the graphics map by reading its keys directly.
const ELEMENT_KINDS = Object.keys(slideTypeGraphics) as ElementKind[];

const NewElementPicker = ({ onPick }: NewElementPickerProps) => {
  return (
    <div className={styles.grid}>
      {ELEMENT_KINDS.map((kind) => {
        const Graphic = slideTypeGraphics[kind];
        return (
          <SelectableTile
            key={kind}
            size='sm'
            media={<Graphic />}
            title={KIND_LABELS[kind]}
            onClick={() => {
              onPick(kind);
            }}
          />
        );
      })}
    </div>
  );
};

export { NewElementPicker };
