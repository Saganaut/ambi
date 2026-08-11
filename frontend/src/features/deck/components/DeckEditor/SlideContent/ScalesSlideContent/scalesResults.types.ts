/**
 * The options a SCALES slide's results display is rendered from — the
 * statement-rating counterpart of `RenderMcqResultsDisplayOptions`.
 *
 * SCALES persists no chosen visualisation (its content carries no
 * `dataVisualization` field, unlike MCQ's), so `visualization` is only ever the
 * session-held choice from `ResultsPreviewContext`; null means "no chart", which
 * is the statement/scale editing plane. The endpoint draft travels alongside the
 * editor because both the statement rows and the diverging bar's axis read the
 * in-flight endpoints — a committed value lags an endpoint edit by a debounce.
 */
import type { ChartType } from "@components/Charts/Chart.types";
import type { ScalesQuestionView, UseScalesEditorResult } from "@deck/hooks/useScalesEditor";
import type { OpenGalleryPicker } from "@hooks/useGalleryPicker";
import type { SlideDraft } from "../_shared/Item.types";

/** The visualisations a scales question offers — `registry.ts`' SCALES entry. */
type ScalesDataVisualization = Extract<ChartType, "DIVERGING_BAR" | "NONE">;

const isScalesVisualization = (viz: ChartType | null): viz is ScalesDataVisualization =>
  viz === "DIVERGING_BAR" || viz === "NONE";

/** The slice of the scales draft the statement rows and endpoint cards read. */
type ScalesDraftSlice = Pick<
  SlideDraft<"SCALES">,
  | "min"
  | "setMin"
  | "max"
  | "setMax"
  | "leftLabel"
  | "setLeftLabel"
  | "rightLabel"
  | "setRightLabel"
  | "openMenuId"
  | "setOpenMenuId"
>;

interface RenderScalesResultsDisplayOptions extends ScalesDraftSlice {
  /** The visualisation to show, or null to fall back to the editing plane. */
  visualization: ScalesDataVisualization | null;
  editor: UseScalesEditorResult;
  /** The active question, already narrowed out of `editor` by the container. */
  question: ScalesQuestionView;
  openPicker: OpenGalleryPicker;
}

export { isScalesVisualization };
export type { RenderScalesResultsDisplayOptions, ScalesDataVisualization, ScalesDraftSlice };
