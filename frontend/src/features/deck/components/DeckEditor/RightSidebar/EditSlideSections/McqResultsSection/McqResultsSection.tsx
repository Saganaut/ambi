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

import { useSlide } from "@deck/hooks/useSlide";
import { useResultsPreview } from "@deck/contexts/useResultsPreview";
import { ResultsChart } from "@components/Charts/ResultsChart/ResultsChart";
import { mcqResults } from "@components/Charts/registry";
import type { ChartType } from "@components/Charts/types";

import BarHorizontalIcon from "@assets/icons/charts/bar-horizontal.svg?react";
import BarVerticalIcon from "@assets/icons/charts/bar-vertical.svg?react";
import PieIcon from "@assets/icons/charts/pie.svg?react";
import DonutIcon from "@assets/icons/charts/donut.svg?react";
import LineIcon from "@assets/icons/charts/line.svg?react";
import ParetoIcon from "@assets/icons/charts/pareto.svg?react";
import DotIcon from "@assets/icons/charts/dot.svg?react";
import NoneIcon from "@assets/icons/charts/none.svg?react";

import panel from "@deck/components/DeckEditor/RightSidebar/EditSlidePanel/EditSlidePanel.module.css";
import styles from "./McqResultsSection.module.css";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

type VizIcon = typeof BarHorizontalIcon;

const VIZ_META: Record<ChartType, { label: string; Icon: VizIcon }> = {
  BAR_HORIZONTAL: { label: "Bars", Icon: BarHorizontalIcon },
  BAR_VERTICAL: { label: "Columns", Icon: BarVerticalIcon },
  PIE: { label: "Pie", Icon: PieIcon },
  DONUT: { label: "Donut", Icon: DonutIcon },
  LINE: { label: "Line", Icon: LineIcon },
  PARETO: { label: "Pareto", Icon: ParetoIcon },
  DOT: { label: "Dots", Icon: DotIcon },
  NONE: { label: "None", Icon: NoneIcon },
};

const McqResultsSection = () => {
  const { deckId } = routeApi.useParams();
  const { slideId } = routeApi.useSearch();
  const { getSlide, updateSlide } = useSlide(deckId);
  const { previewVisualization, setPreviewVisualization } = useResultsPreview();

  const slide = slideId ? getSlide(slideId) : undefined;
  if (!slide || slide.content.contentType !== "MCQ") return null;
  const content = slide.content;

  const committed = content.dataVisualization;
  // The hover/focus preview wins over the persisted choice. Both are ChartType
  // literals (MCQ's enum is a subset), so this is assignable to ResultsChart.
  const effective = previewVisualization ?? committed;

  const chartData = mcqResults.toChartData(
    content.options,
    content.correctOptionIds,
    mcqResults.sampleDistribution(content.options, content.correctOptionIds),
  );

  // Discrete, immediate commit: overlay the new viz onto the freshest content
  // and PUT directly (updateSlide carries the full slide forward + optimistic
  // patches the cache), then drop the transient preview.
  const commit = (viz: ChartType) => {
    updateSlide(slide.id, { content: { ...content, dataVisualization: viz } });
    setPreviewVisualization(null);
  };

  return (
    <section className={panel.section}>
      <h4 className={panel.heading}>Results display</h4>

      <div
        className={styles.grid}
        role='radiogroup'
        aria-label='Results visualisation'>
        {mcqResults.supportedViz.map((viz) => {
          const { label, Icon } = VIZ_META[viz];
          const selected = committed === viz;
          return (
            <button
              key={viz}
              type='button'
              role='radio'
              aria-checked={selected}
              className={`${styles.option} ${selected ? styles.selected : ""}`}
              onClick={() => {
                commit(viz);
              }}
              onMouseEnter={() => {
                setPreviewVisualization(viz);
              }}
              onMouseLeave={() => {
                setPreviewVisualization(null);
              }}
              onFocus={() => {
                setPreviewVisualization(viz);
              }}
              onBlur={() => {
                setPreviewVisualization(null);
              }}>
              <Icon className={styles.icon} aria-hidden='true' />
              <span className={styles.label}>{label}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.preview}>
        {effective === "NONE" ? (
          <p className={styles.noneHint}>Responses won&apos;t be charted.</p>
        ) : (
          <ResultsChart viz={effective} data={chartData} caption='Sample data' />
        )}
      </div>
    </section>
  );
};

export { McqResultsSection };
