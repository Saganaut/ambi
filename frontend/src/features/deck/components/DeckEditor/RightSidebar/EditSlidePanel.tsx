// Top-level dispatcher for the deck-editor's "edit" drawer. Reads the active
// slide from the slide cache (via useSlide), mounts the per-kind options
// section, then the image section, session pacing, and provenance footer.
// Per-kind sections each own their own useSlideEditor instance.
import { getRouteApi } from "@tanstack/react-router";
import { useSlide } from "@deck/hooks/useSlide";
import type { SlideType } from "@deck/store/deckEnums.gen";
import { SlideOptionsSection } from "./EditSlideSections/SlideOptionsSection";
import { McqOptionsSection } from "./EditSlideSections/McqOptionsSection";
import { TextOptionsSection } from "./EditSlideSections/TextOptionsSection";
import { NumberOptionsSection } from "./EditSlideSections/NumberOptionsSection";
import { RankingOptionsSection } from "./EditSlideSections/RankingOptionsSection";
import { QAndAOptionsSection } from "./EditSlideSections/QAndAOptionsSection";
import { SlideImageSection } from "./EditSlideSections/SlideImageSection";
import { SessionPacingSection } from "./EditSlideSections/SessionPacingSection";
import { ProvenanceFooter } from "./EditSlideSections/ProvenanceFooter";
import styles from "./EditSlidePanel.module.css";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const PerKindSection = ({ contentType }: { contentType: SlideType }) => {
  switch (contentType) {
    case "MCQ":
      return <McqOptionsSection />;
    case "TEXT":
      return <TextOptionsSection />;
    case "NUMBER":
      return <NumberOptionsSection />;
    case "RANKING":
      return <RankingOptionsSection />;
    case "Q_AND_A":
      return <QAndAOptionsSection />;
    case "TITLE":
    case "MEDIA":
    case "FOLLOW_UP":
      return <SlideOptionsSection />;
    default:
      return null;
  }
};

const EditSlidePanel = () => {
  const { deckId } = routeApi.useParams();
  const { slideId } = routeApi.useSearch();
  const { getSlide } = useSlide(deckId);
  const slide = slideId ? getSlide(slideId) : undefined;

  if (!slide) {
    return (
      <div className={styles.empty}>
        <p>Select a slide on the left to edit its display options.</p>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <PerKindSection contentType={slide.content.contentType} />
      <SlideImageSection />
      <SessionPacingSection />
      <ProvenanceFooter
        createdByUserId={slide.createdByUserId}
        lastEditedByUserId={slide.lastEditedByUserId}
        createdAt={undefined}
        updatedAt={undefined}
        version={slide.version}
      />
    </div>
  );
};

export { EditSlidePanel };
