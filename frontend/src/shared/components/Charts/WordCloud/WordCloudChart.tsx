/**
 * Editor-facing word cloud: seats the presentational {@link WordCloud} in the
 * deck editor's SlideContent shell and drives its mount reveal.
 *
 * There is no option bank, legend or drag-reorder here — the cloud's words come
 * from submissions, not from an authored option list — so it takes plain
 * `ChartProps` rather than the MCQ editor's render options.
 */
import {
  SlideContent,
  SlideContentSection,
} from "@/features/deck/components/DeckEditor/SlideContent/SlideContentSection";
import { useEffect, useState } from "react";
import type { ChartProps } from "../Chart.types";
import { withChartErrorBoundary } from "../withChartErrorBoundary";
import { WordCloud } from "./WordCloud";
import styles from "./WordCloud.module.css";

const WordCloudChartInner = ({ animateOnMount = true, ...props }: ChartProps) => {
  const [revealed, setRevealed] = useState(!animateOnMount);

  useEffect(() => {
    if (!animateOnMount) return;
    const id = requestAnimationFrame(() => {
      setRevealed(true);
    });
    return () => {
      cancelAnimationFrame(id);
    };
  }, [animateOnMount]);

  return (
    <SlideContent className={styles.chartContent}>
      <SlideContentSection>
        <SlideContentSection.Body>
          <WordCloud {...props} revealed={revealed} />
        </SlideContentSection.Body>
      </SlideContentSection>
    </SlideContent>
  );
};

const WordCloudChart = withChartErrorBoundary("word-cloud", WordCloudChartInner);

export { WordCloudChart };
