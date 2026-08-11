// Bridges the renderer-layer `ChartType` union to the backend `McqDataVisualization`
// enum. The results registry lives in `shared/` and is typed with the wider
// `ChartType[]` (it can't import the generated deck enum), but an MCQ slide only
// ever commits one of the `McqDataVisualization` values to
// `McqContent.dataVisualization`. This narrows `mcqResults.supportedViz` back to
// that set with a runtime-checked guard — so should MCQ's supported list ever
// gain a `ChartType` outside the enum, it is dropped here rather than PUT to the
// backend as an invalid value.
import type { ChartType } from "@components/Charts/Chart.types";
import { mcqResults } from "@components/Charts/registry";
import { McqDataVisualization } from "@deck/store/deckEnums.gen";

const MCQ_VIZ = new Set<string>(Object.values(McqDataVisualization));

const isMcqDataVisualization = (viz: ChartType): viz is McqDataVisualization =>
  MCQ_VIZ.has(viz);

/** MCQ's supported visualisations, narrowed to the committable enum set. */
export const mcqSupportedViz: McqDataVisualization[] =
  mcqResults.supportedViz.filter(isMcqDataVisualization);

export { isMcqDataVisualization };
