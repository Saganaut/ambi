// Compact results-chart control overlaid directly on the slide canvas — the
// on-canvas twin of the sidebar `McqResultsSection`. Collapsed it's a faint tile
// showing the slide's current chart type; on hover it brightens and reveals the
// chart-type grid, so a results visualisation can be chosen without leaving the
// canvas. It shares the exact behaviour of `McqResultsSection` (same data
// source, same immediate commit, same live preview via ResultsPreviewContext)
// and the styling/positioning of `CoverImagePicker`.
//
// Its option set is the registry's: it renders for any content type whose
// results are wired (MCQ, the placement kinds and SCALES today), and nothing at
// all for the rest. Where the choice LANDS differs — MCQ persists it on its
// content's `dataVisualization`, while the other kinds have no such field and
// hold it in the preview context for the authoring session.
import { getPickableViz } from "@components/Charts/registry";
import type { ChartType } from "@components/Charts/Chart.types";
import { VIZ_META } from "@components/Charts/vizMeta";
import { useResultsPreview } from "@deck/contexts/useResultsPreview";
import { useSlide } from "@deck/hooks/useSlide";
import { isMcqDataVisualization } from "@deck/utils/chartTypes";

import styles from "./ChartTypePicker.module.css";

interface ChartTypePickerProps {
  deckId: string;
  slideId: string;
}

const ChartTypePicker = ({ deckId, slideId }: ChartTypePickerProps) => {
  const { getSlide, updateSlide } = useSlide(deckId);
  const { setPreviewVisualization, selectedVisualization, selectVisualization } =
    useResultsPreview();

  const slide = getSlide(slideId);
  if (!slide) return null;
  const content = slide.content;

  const options = getPickableViz(content.contentType);
  if (options.length === 0) return null;

  const committed: ChartType =
    content.contentType === "MCQ"
      ? content.dataVisualization
      : (selectedVisualization(slideId) ?? "NONE");
  const { Icon: CurrentIcon } = VIZ_META[committed];

  // Discrete, immediate commit: MCQ overlays the new viz onto the freshest
  // content and PUTs directly (updateSlide carries the full slide forward +
  // optimistic patches the cache); a placement kind has nothing to persist to,
  // so its choice is held in context. Either way the transient preview drops.
  const commit = (viz: ChartType) => {
    if (content.contentType === "MCQ") {
      if (isMcqDataVisualization(viz)) {
        updateSlide(slide.id, { content: { ...content, dataVisualization: viz } });
      }
    } else {
      selectVisualization(slideId, viz);
    }
    setPreviewVisualization(null);
  };

  return (
    <div className={styles.chartTypePicker}>
      <div className={styles.currentTile}>
        <CurrentIcon aria-hidden="true" />
      </div>

      {/* Hidden until the picker is hovered, then it drops in. Clear the preview
          on leaving the whole grid so the canvas hands straight back to the
          committed viz with no per-icon flicker. */}
      <div
        className={styles.optionsContainer}
        role="radiogroup"
        aria-label="Results visualisation"
        onMouseLeave={() => setPreviewVisualization(null)}
      >
        {options.map((viz) => {
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
  );
};

export { ChartTypePicker };
export type { ChartTypePickerProps };
