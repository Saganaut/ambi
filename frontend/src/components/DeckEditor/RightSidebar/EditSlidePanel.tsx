// Top-level dispatcher for the deck-editor's "edit" drawer. Pulls the active
// element from the deck cache, mounts the per-kind options section, then the
// cross-cutting Tags + Common sections that every kind shares, and finally
// the provenance footer. Each subsection owns its own debounced commit and
// local-state mirror (see `useElementEditor`); this file just routes.
import { getRouteApi } from "@tanstack/react-router";
import { useGetDeckQuery } from "@/store/AmbiApi";
import { SlideOptionsSection } from "./EditSlideSections/SlideOptionsSection";
import { McqOptionsSection } from "./EditSlideSections/McqOptionsSection";
import { TextOptionsSection } from "./EditSlideSections/TextOptionsSection";
import { NumberOptionsSection } from "./EditSlideSections/NumberOptionsSection";
import { RankingOptionsSection } from "./EditSlideSections/RankingOptionsSection";
import { QAndAOptionsSection } from "./EditSlideSections/QAndAOptionsSection";
import { BehaviorSection } from "./EditSlideSections/BehaviorSection";
import { SlideImageSection } from "./EditSlideSections/SlideImageSection";
import { SessionPacingSection } from "./EditSlideSections/SessionPacingSection";
import { CommonOptionsSection } from "./EditSlideSections/CommonOptionsSection";
import { ProvenanceFooter } from "./EditSlideSections/ProvenanceFooter";
import styles from "./EditSlidePanel.module.css";

const routeApi = getRouteApi("/decks/$deckId/edit");

const PerKindSection = ({ kind }: { kind: string }) => {
  switch (kind) {
    case "Slide":
      return <SlideOptionsSection />;
    case "McqQuestion":
      return <McqOptionsSection />;
    case "TextQuestion":
      return <TextOptionsSection />;
    case "NumberQuestion":
      return <NumberOptionsSection />;
    case "RankingQuestion":
      return <RankingOptionsSection />;
    case "QAndAQuestion":
      return <QAndAOptionsSection />;
    default:
      return null;
  }
};

const EditSlidePanel = () => {
  const { deckId } = routeApi.useParams();
  const { questionId } = routeApi.useSearch();

  const { element } = useGetDeckQuery(
    { id: deckId },
    {
      selectFromResult: ({ data }) => ({
        element: data?.elements?.find((e) => e.id === questionId),
      }),
    },
  );

  if (!element) {
    return (
      <div className={styles.empty}>
        <p>Select a slide on the left to edit its display options.</p>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <PerKindSection kind={element.kind} />
      {/* Per-slide content image — moved out of ThemePanel (the deck
          background stays there as a styling concern). */}
      <SlideImageSection />
      {/* Chunk 24 — shared Behavior section sits between the per-kind
          options and the universal Common section. Currently hosts the
          promoted `showResponses` dropdown; future runtime cascade knobs
          (scoringEnabledOverride, etc.) land here too. */}
      <BehaviorSection />
      {/* Deck-wide default session pacing/scoring (defaultSettings). Author
          suggestions a host may override at session start — not per-slide. */}
      <SessionPacingSection />
      <CommonOptionsSection />
      <ProvenanceFooter
        createdByUserId={element.chrome?.createdByUserId}
        lastEditedByUserId={element.chrome?.lastEditedByUserId}
        createdAt={element.chrome?.createdAt}
        updatedAt={element.chrome?.updatedAt}
        version={element.chrome?.version}
      />
    </div>
  );
};

export { EditSlidePanel };
