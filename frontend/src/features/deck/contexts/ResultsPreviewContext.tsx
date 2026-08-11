import { createContext, Dispatch, SetStateAction, useState, type ReactNode } from "react";

import type { ChartType } from "@components/Charts/Chart.types";

/**
 * Transient "preview before commit" state for the active slide's results
 * visualisation, mirroring {@link ImageSlotContext}'s placement preview. The
 * only state here is a hover/transient override; the *persisted* choice lives on
 * the slide content (`McqContent.dataVisualization`) in the RTK cache.
 *
 * The picker (in the inspector) and the preview surface live in different parts
 * of the editor tree, so the transient selection is shared through context
 * rather than local state. The value is a {@link ChartType} — the shared
 * visualisation vocabulary every renderer speaks — so a single provider serves
 * every question type (each type's own viz enum, e.g. MCQ's, is a subset).
 *
 * Effective viz consumed by a preview = `previewVisualization ?? <persisted>`.
 * Setting `null` drops the preview and falls back to the committed choice. This
 * never touches the backend — committing is the content mutation's job.
 *
 * The placement kinds (AXIS, PLACE_ON_IMAGE) and SCALES have nothing to commit
 * to — their content carries no `dataVisualization` field — so their *chosen*
 * view lives here too, keyed by slide so leaving and returning to a slide keeps
 * it and a sibling slide is unaffected. Effective viz for those =
 * `previewVisualization ?? selectedVisualization(slideId)`.
 */
export interface ResultsPreviewContextValue {
  /** Transient visualisation override for the active slide, or null when none. */
  previewVisualization: ChartType | null;
  /** Set (or clear, with null) the transient preview. Never persists. */
  setPreviewVisualization: Dispatch<SetStateAction<ChartType | null>>;
  /** The slide's chosen visualisation, for kinds whose content persists none. */
  selectedVisualization: (slideId: string) => ChartType | null;
  /** Choose a slide's visualisation for this authoring session. Never persists. */
  selectVisualization: (slideId: string, viz: ChartType) => void;
}

const ResultsPreviewContext = createContext<ResultsPreviewContextValue | null>(null);

const ResultsPreviewProvider = ({ children }: { children: ReactNode }) => {
  const [previewVisualization, setPreviewVisualization] = useState<ChartType | null>(null);
  const [selectedBySlide, setSelectedBySlide] = useState<Record<string, ChartType>>({});

  const selectedVisualization = (slideId: string): ChartType | null =>
    selectedBySlide[slideId] ?? null;

  const selectVisualization = (slideId: string, viz: ChartType) => {
    setSelectedBySlide((held) => ({ ...held, [slideId]: viz }));
  };

  return (
    <ResultsPreviewContext.Provider
      value={{
        previewVisualization,
        setPreviewVisualization,
        selectedVisualization,
        selectVisualization,
      }}
    >
      {children}
    </ResultsPreviewContext.Provider>
  );
};

export { ResultsPreviewContext, ResultsPreviewProvider };
