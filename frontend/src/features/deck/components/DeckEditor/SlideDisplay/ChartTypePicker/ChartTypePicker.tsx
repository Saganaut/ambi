// Compact results-chart control overlaid directly on the slide canvas — the
// on-canvas twin of the sidebar `McqResultsSection`. Collapsed it's a faint tile
// showing the currently committed chart type; on hover it brightens and reveals
// the chart-type grid, so an MCQ's results visualisation can be chosen without
// leaving the canvas. It shares the exact behaviour of `McqResultsSection`
// (same data source, same immediate commit, same live preview via
// ResultsPreviewContext) and the styling/positioning of `CoverImagePicker`.
//
// Only renders for MCQ slides, whose content carries `dataVisualization`.
import { VIZ_META } from "@components/Charts/vizMeta";
import { useResultsPreview } from "@deck/contexts/useResultsPreview";
import { useSlide } from "@deck/hooks/useSlide";
import type { McqDataVisualization } from "@deck/store/deckEnums.gen";
import { mcqSupportedViz } from "@deck/utils/chartTypes";

import styles from "./ChartTypePicker.module.css";

interface ChartTypePickerProps {
  deckId: string;
  slideId: string;
}

const ChartTypePicker = ({ deckId, slideId }: ChartTypePickerProps) => {
  const { getSlide, updateSlide } = useSlide(deckId);
  const { setPreviewVisualization } = useResultsPreview();

  const slide = getSlide(slideId);
  if (!slide || slide.content.contentType !== "MCQ") return null;
  const content = slide.content;

  const committed = content.dataVisualization;
  const { Icon: CurrentIcon } = VIZ_META[committed];

  // Discrete, immediate commit: overlay the new viz onto the freshest content
  // and PUT directly (updateSlide carries the full slide forward + optimistic
  // patches the cache), then drop the transient preview.
  const commit = (viz: McqDataVisualization) => {
    updateSlide(slide.id, { content: { ...content, dataVisualization: viz } });
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
  );
};

export { ChartTypePicker };
export type { ChartTypePickerProps };
