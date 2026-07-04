// Stub renderer for a results visualization that's mapped in the registry but not
// yet built. Takes the standard `ChartProps` so it drops straight into the
// dispatcher and preview pipeline, and renders a neutral "coming soon" tile
// instead of a chart. Each mapped-but-unbuilt viz gets its own thin wrapper
// (`WordCloud`, `Heatmap`, `DivergingBar`, `ImageOverlay`) so there's a file to
// grow into when it's implemented for real.
import type { ChartProps } from "../Chart.types";
import styles from "./PlaceholderChart.module.css";

export interface PlaceholderChartProps extends ChartProps {
  /** Human-readable name of the not-yet-built visualization. */
  label: string;
}

const PlaceholderChart = ({ label, caption }: PlaceholderChartProps) => {
  return (
    <div className={styles.placeholder} role="img" aria-label={`${label} — coming soon`}>
      <span className={styles.label}>{label}</span>
      <span className={styles.note}>Visualization coming soon</span>
      {caption && <span className={styles.caption}>{caption}</span>}
    </div>
  );
};

export { PlaceholderChart };
