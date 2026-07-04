// Scatter/heatmap of pin coordinates overlaid on the slide image, with target
// circles drawn — for PLACE_ON_IMAGE. Placeholder stub for now; see PlaceholderChart.
import type { ChartProps } from "../Chart.types";
import { PlaceholderChart } from "../PlaceholderChart/PlaceholderChart";

export type ImageOverlayProps = ChartProps;

const ImageOverlay = (props: ImageOverlayProps) => (
  <PlaceholderChart label="Image overlay" {...props} />
);

export { ImageOverlay };
