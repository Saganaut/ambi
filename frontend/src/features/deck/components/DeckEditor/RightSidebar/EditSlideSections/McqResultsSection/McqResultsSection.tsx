// Results-visualisation picker + live preview for an MCQ slide, shown in the
// answers inspector. The author picks how this MCQ's responses are charted; the
// chosen mode is persisted on the content (`McqContent.dataVisualization`).
// Hovering/focusing a mode shows it in the preview *without* committing — the
// transient choice rides on ResultsPreviewContext, exactly like the cover-image
// placement preview. Because there are no real responses at authoring time, the
// preview renders a deterministic sample distribution; the same ResultsChart +
// adapter render live results on the session board later.
//
// `dataVisualization` is a discrete, immediate setting (like the image/colour
// pickers), so it commits straight through `useSlide.updateSlide` rather than
// the debounced slide editor. Crucially this means NOT instantiating a second
// `useMcqEditor`/`useSlideEditor` for this slide — the canvas already owns the
// one allowed instance, and a second draft buffer raced the write so clicks
// didn't persist.
import { getRouteApi } from "@tanstack/react-router";

import { VIZ_META } from "@components/Charts/vizMeta";
import { useResultsPreview } from "@deck/contexts/useResultsPreview";
import { useSlide } from "@deck/hooks/useSlide";
import type { McqDataVisualization } from "@deck/store/deckEnums.gen";
import { mcqSupportedViz } from "@deck/utils/chartTypes";

import panel from "@deck/components/DeckEditor/RightSidebar/EditSlidePanel/EditSlidePanel.module.css";
import styles from "./McqResultsSection.module.css";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const McqResultsSection = () => {
  const { deckId } = routeApi.useParams();
  const { slideId } = routeApi.useSearch();
  const { getSlide, updateSlide } = useSlide(deckId);
  const { setPreviewVisualization } = useResultsPreview();

  const slide = slideId ? getSlide(slideId) : undefined;
  if (!slide || slide.content.contentType !== "MCQ") return null;
  const content = slide.content;

  const committed = content.dataVisualization;

  // Discrete, immediate commit: overlay the new viz onto the freshest content
  // and PUT directly (updateSlide carries the full slide forward + optimistic
  // patches the cache), then drop the transient preview.
  const commit = (viz: McqDataVisualization) => {
    updateSlide(slide.id, { content: { ...content, dataVisualization: viz } });
    setPreviewVisualization(null);
  };

  return (
    <section className={panel.section}>
      <h4 className={panel.heading}>Results display</h4>

      {/* Mirrors CoverImagePicker: the preview is the always-visible tile and the
          option grid drops in on hover. */}
      <div className={styles.resultsPicker}>
        <div
          className={styles.optionsContainer}
          role="radiogroup"
          aria-label="Results visualisation"
          onMouseLeave={() => setPreviewVisualization(null)}
        >
          {mcqSupportedViz.map((viz) => {
            const { label, Icon } = VIZ_META[viz];
            const selected = committed === viz;
            return (
              <button
                key={viz}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={label}
                title={label}
                className={`${styles.iconWrapper} ${selected ? styles.isActive : ""}`}
                onClick={() => {
                  commit(viz);
                }}
                onMouseEnter={() => {
                  setPreviewVisualization(viz);
                }}
                onFocus={() => {
                  setPreviewVisualization(viz);
                }}
                onBlur={() => {
                  setPreviewVisualization(null);
                }}
              >
                <Icon aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export { McqResultsSection };
