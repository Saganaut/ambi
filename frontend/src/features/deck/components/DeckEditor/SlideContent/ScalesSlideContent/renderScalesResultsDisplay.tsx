/**
 * Picks what a SCALES slide's canvas shows — `renderMcqResultsDisplay` for
 * statement ratings.
 *
 * Its only visualisation is the diverging bar, and the slide persists no chosen
 * one, so "no chart" is the default and it is the target-editing plane: an
 * author who leaves the preview is handed straight back the statements and the
 * scale they author against.
 */
import { DivergingBar } from "@components/Charts/DivergingBar/DivergingBar";
import type { ReactNode } from "react";
import type { RenderScalesResultsDisplayOptions } from "./scalesResults.types";
import { ScalesTargetsDisplay } from "./ScalesTargetsDisplay";

const renderScalesResultsDisplay = (options: RenderScalesResultsDisplayOptions): ReactNode => {
  switch (options.visualization) {
    case "DIVERGING_BAR":
      return <DivergingBar {...options} />;
    case "NONE":
    case null:
      return <ScalesTargetsDisplay {...options} />;
    default: {
      const exhaustiveCheck: never = options.visualization;
      throw new Error(`Unhandled visualization type: ${String(exhaustiveCheck)}`);
    }
  }
};

export { renderScalesResultsDisplay };
