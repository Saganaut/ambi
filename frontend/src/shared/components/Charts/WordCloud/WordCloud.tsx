// Word cloud of submitted terms sized by frequency — for TEXT (word-cloud mode),
// FOLLOW_UP and Q&A responses. Placeholder stub for now; see PlaceholderChart.
import type { ChartProps } from "../Chart.types";
import { PlaceholderChart } from "../PlaceholderChart/PlaceholderChart";

export type WordCloudProps = ChartProps;

const WordCloud = (props: WordCloudProps) => <PlaceholderChart label="Word cloud" {...props} />;

export { WordCloud };
