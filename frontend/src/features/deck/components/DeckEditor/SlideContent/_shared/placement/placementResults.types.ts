/**
 * The options a placement slide's results display is rendered from — the
 * AXIS / PLACE_ON_IMAGE counterpart of `RenderMcqResultsDisplayOptions`.
 *
 * One discriminated union rather than a props type per kind: the two editors
 * differ only in the surface a point is placed on (a labelled plane vs. a
 * backing image) and in the view their editor hook hands back, so a renderer
 * that handles both — the heatmap does — narrows on `kind` and shares
 * everything else. The item-bank draft state travels alongside the editor
 * because the editable legend rows are built from both.
 *
 * Neither kind persists a chosen visualisation (their content carries no
 * `dataVisualization` field, unlike MCQ's), so `visualization` is only ever the
 * transient choice from `ResultsPreviewContext`; null means "no chart", which
 * is what the target-editing surfaces are.
 */
import type { ChartType } from "@components/Charts/Chart.types";
import type { UseAxisEditorResult } from "@deck/hooks/useAxisEditor";
import type { UsePlaceOnImageEditorResult } from "@deck/hooks/usePlaceOnImageEditor";
import type { OpenGalleryPicker } from "@hooks/useGalleryPicker";
import type { Dispatch, SetStateAction } from "react";
import type { ItemId } from "../Item.types";

/** The visualisations a placement question offers — `registry.ts`' entry for both kinds. */
type PlacementVisualization = Extract<ChartType, "HEATMAP" | "NONE">;

const isPlacementVisualization = (viz: ChartType | null): viz is PlacementVisualization =>
  viz === "HEATMAP" || viz === "NONE";

interface PlacementResultsDisplayBase {
  /** The visualisation to show, or null to fall back to the editing surface. */
  visualization: PlacementVisualization | null;
  openPicker: OpenGalleryPicker;
  openMenuId: string | null;
  setOpenMenuId: Dispatch<SetStateAction<string | null>>;
  /** The item armed for placement, shared by the surface and its bank rows. */
  selectedItemId: ItemId | null;
  setSelectedItemId: Dispatch<SetStateAction<ItemId | null>>;
  /** The draft's tolerance mirror — the committed value lags behind the slider. */
  tolerance: number;
  setTolerance: Dispatch<SetStateAction<number>>;
}

interface AxisResultsDisplayOptions extends PlacementResultsDisplayBase {
  kind: "AXIS";
  editor: UseAxisEditorResult;
  /** The active question, already narrowed out of `editor` by the container. */
  question: NonNullable<UseAxisEditorResult["question"]>;
}

interface PlaceOnImageResultsDisplayOptions extends PlacementResultsDisplayBase {
  kind: "PLACE_ON_IMAGE";
  editor: UsePlaceOnImageEditorResult;
  /** The active question, already narrowed out of `editor` by the container. */
  question: NonNullable<UsePlaceOnImageEditorResult["question"]>;
}

type PlacementResultsDisplayOptions = AxisResultsDisplayOptions | PlaceOnImageResultsDisplayOptions;

export { isPlacementVisualization };
export type {
  AxisResultsDisplayOptions,
  PlaceOnImageResultsDisplayOptions,
  PlacementResultsDisplayOptions,
  PlacementVisualization,
};
