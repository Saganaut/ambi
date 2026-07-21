/**
 * Modal body that lets the user pick which element kind to add to the deck.
 *
 * Two eyebrow-headed sections (Interactive / Presentation) of descriptive DS
 * Slide Card tiles — icon + name + one-line blurb, per the Figma New Slide
 * Modal. Clicking a tile immediately invokes `onPick` (which closes the modal
 * and creates the element via the deck-dashboard hook). No two-step
 * "select + confirm" — the click is the commit.
 */

import { SlideType } from "@deck/store/deckEnums.gen";
import { SlideCard } from "../../SlideCard/SlideCard";
import styles from "./NewSlideModal.module.css";

interface NewSlideModalProps {
  onPick: (slideType: SlideType) => void;
}

interface SlideTypeOption {
  slideType: SlideType;
  label: string;
  description: string;
}

// Ordered as laid out in the design. TITLE (retired) and FOLLOW_UP (only
// created via a parent slide's "Add follow-up slide" action) are not offered.
const INTERACTIVE_SLIDE_TYPES: SlideTypeOption[] = [
  { slideType: "MCQ", label: "Multiple Choice", description: "Pick the right answer from options" },
  { slideType: "TEXT", label: "Text Answer", description: "Type a short free-text answer" },
  { slideType: "NUMBER", label: "Number Answer", description: "Closest number to the target wins" },
  { slideType: "RANKING", label: "Ranking", description: "Put items in the correct order" },
  { slideType: "SCALES", label: "Scales", description: "Rate statements along a scale" },
  { slideType: "Q_AND_A", label: "Q & A", description: "Collect and answer questions" },
  { slideType: "GRID", label: "Grid", description: "Sort items into the right cells" },
  { slideType: "AXIS", label: "Axis", description: "Place items on a 2-D plane" },
  {
    slideType: "PLACE_ON_IMAGE",
    label: "Place on Image",
    description: "Pin the right spot on a picture",
  },
  { slideType: "ALLOCATION", label: "Allocation", description: "Split points across the options" },
  { slideType: "MATCHING", label: "Matching", description: "Pair up related items" },
  { slideType: "DRAWING", label: "Drawing", description: "Sketch your answer freehand" },
];

const PRESENTATION_SLIDE_TYPES: SlideTypeOption[] = [
  { slideType: "CONTENT", label: "Content", description: "Rich text and images, no scoring" },
  { slideType: "MEDIA", label: "Media", description: "A full-slide image or video" },
  { slideType: "INSTRUCTION", label: "Instructions", description: "Explain what happens next" },
];

interface SlideTypeSectionProps {
  heading: string;
  options: SlideTypeOption[];
  onPick: (slideType: SlideType) => void;
}

const SlideTypeSection = ({ heading, options, onPick }: SlideTypeSectionProps) => (
  <section className={styles.section}>
    <h3 className={styles.sectionHeading}>{heading}</h3>
    <div className={styles.grid}>
      {options.map(({ slideType, label, description }) => (
        <SlideCard
          key={slideType}
          as="button"
          variant="tile"
          slideType={slideType}
          title={label}
          description={description}
          onClick={() => {
            onPick(slideType);
          }}
        />
      ))}
    </div>
  </section>
);

const NewSlideModal = ({ onPick }: NewSlideModalProps) => {
  return (
    <div className={styles.newSlideModalBody}>
      <SlideTypeSection heading="Interactive" options={INTERACTIVE_SLIDE_TYPES} onPick={onPick} />
      <SlideTypeSection heading="Presentation" options={PRESENTATION_SLIDE_TYPES} onPick={onPick} />
    </div>
  );
};

export { NewSlideModal };
