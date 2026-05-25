// Demo wrapper that renders one of the four chart components with a small
// pre-baked sample dataset and the `animateOnMount` flag flipped on. Used by
// the EditSlide chart picker's hover popover so the author can preview what
// each visualisation will look like without leaving the editor. Keeps sample
// data in one place so all four previews stay visually comparable.
import { BarHorizontal } from "../BarHorizontal/BarHorizontal";
import { BarVertical } from "../BarVertical/BarVertical";
import { PieChart } from "../PieChart/PieChart";
import { WordCloud } from "../WordCloud/WordCloud";
import type { ChartType } from "@/components/DeckEditor/RightSidebar/data";
import { SAMPLE_OPTION_COUNTS, SAMPLE_WORDS } from "./samples";

export interface ChartPreviewProps {
  chartType: ChartType;
}

const ChartPreview = ({ chartType }: ChartPreviewProps) => {
  switch (chartType) {
    case "BAR_HORIZONTAL":
      return <BarHorizontal items={SAMPLE_OPTION_COUNTS} animateOnMount />;
    case "BAR_VERTICAL":
      return <BarVertical items={SAMPLE_OPTION_COUNTS} animateOnMount />;
    case "WORD_CLOUD":
      return <WordCloud items={SAMPLE_WORDS} animateOnMount />;
    case "PIE_CHART":
      return <PieChart items={SAMPLE_OPTION_COUNTS} animateOnMount />;
  }
};

export { ChartPreview };
