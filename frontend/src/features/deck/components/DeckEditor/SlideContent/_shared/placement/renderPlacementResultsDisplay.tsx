/**
 * Picks what a placement slide's canvas shows — `renderMcqResultsDisplay` for
 * the AXIS / PLACE_ON_IMAGE pair.
 *
 * Their only visualisation is the heatmap, and neither persists a chosen one,
 * so "no chart" is the default and it is the target-editing surface: an author
 * who leaves the heatmap preview is handed straight back the plane or the image
 * they place targets on.
 */
import { Heatmap } from "@components/Charts/Heatmap/Heatmap";
import type { ReactNode } from "react";
import { AxisTargetsDisplay } from "../../AxisSlideContent/AxisTargetsDisplay";
import { PlaceOnImageTargetsDisplay } from "../../PlaceOnImageSlideContent/PlaceOnImageTargetsDisplay";
import type { PlacementResultsDisplayOptions } from "./placementResults.types";

const renderTargetsDisplay = (options: PlacementResultsDisplayOptions): ReactNode =>
  options.kind === "AXIS" ? (
    <AxisTargetsDisplay {...options} />
  ) : (
    <PlaceOnImageTargetsDisplay {...options} />
  );

const renderPlacementResultsDisplay = (options: PlacementResultsDisplayOptions): ReactNode => {
  switch (options.visualization) {
    case "HEATMAP":
      return <Heatmap {...options} />;
    case "NONE":
    case null:
      return renderTargetsDisplay(options);
    default: {
      const exhaustiveCheck: never = options.visualization;
      throw new Error(`Unhandled visualization type: ${String(exhaustiveCheck)}`);
    }
  }
};

export { renderPlacementResultsDisplay };
