/**
 * Presentational surface for an MCQ slide — the "view" half of the
 * view/container split. The container (`McqSlideContent`) owns the single
 * {@link useMcqEditor} instance and the gallery picker; this view just renders
 * the surface it's handed, so it holds no store / router / modal state and
 * renders in isolation (Storybook, tests) with mock props.
 *
 * Composition:
 *   - Prompt editor (debounced rich text) — owns a local mirror so typing
 *     stays responsive.
 *   - A CSS grid of controlled `<McqOptionEditable />` cards.
 *
 * Receives the whole editor surface plus an injected `openPicker` as props and
 * hands each card its slice — the freshest option plus bound write handlers.
 * Funnelling every write through the one editor (owned by the container) is what
 * stops concurrent option edits from stomping each other; there is no separate
 * per-card editor.
 *
 * MCQ rules enforced by the hook:
 *   - `MIN_MCQ_OPTIONS`–`MAX_MCQ_OPTIONS` bound the option count (`canAddOption`
 *     / `canRemove`).
 *   - Zero correct answers is allowed but flagged, because the slide isn't
 *     scoreable in that state.
 */
import { useResultsPreview } from "@/features/deck/contexts/useResultsPreview";
import { ResultsChart } from "@/shared/components/Charts/ResultsChart/ResultsChart";
import { mcqResults } from "@/shared/components/Charts/registry";
import { type OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { type UseMcqEditorResult } from "@deck/hooks/useMcqEditor";
import { useMcqOptionControls } from "@deck/hooks/useMcqOptionControls";
import { Btn } from "@ui/Buttons/Btn";
import { DragDropProvider } from "@dnd-kit/react";
import { useState } from "react";
import { SlideContentWrapper } from "../SlideContentWrapper";
import { McqOptionEditable } from "../_shared/McqOptionEditable/McqOptionEditable";
import { EditableChartOptionLabel } from "../_shared/EditableChartOptionLabel/EditableChartOptionLabel";
import styles from "./McqSlideContent.module.css";

interface McqSlideContentViewProps {
  UseMcqEditorResult: UseMcqEditorResult;
  openPicker: OpenGalleryPicker;
}

const McqSlideContentView = ({ UseMcqEditorResult, openPicker }: McqSlideContentViewProps) => {
  const { question, schedulePrompt, flush, canAddOption, addOption, handleOptionDragEnd } =
    UseMcqEditorResult;
  // One binder over the single editor instance, shared by the option-card grid
  // and the inline chart-label editors so every option write funnels through the
  // same debounce buffer.
  const { getOptionProps } = useMcqOptionControls(UseMcqEditorResult, openPicker);
  // Only the prompt needs a local mirror — typing should feel responsive and
  // the rich-text editor controls its own DOM. Options come down as props from
  // the single editor. `syncedFromId` resets the mirror when the active slide
  // changes (this resync is purely local, hence the local state).
  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  const [syncedFromId, setSyncedFromId] = useState(question?.id);
  const { previewVisualization } = useResultsPreview();

  // Resync the local mirror when the active question changes. "Derive state
  // during render" pattern — safe when the new value differs.
  if (question && syncedFromId !== question.id) {
    setSyncedFromId(question.id);
    setPrompt(question.prompt);
  }

  const committed = question?.dataVisualization;
  // The hover/focus preview wins over the persisted choice. Both are ChartType
  // literals (MCQ's enum is a subset), so this is assignable to ResultsChart.
  const effective = previewVisualization ?? committed;
  // Even-column grid: round up half the option count, never below 2.
  const optionCount = question?.options.length ?? 0;
  const columns = optionCount ? Math.max(Math.ceil(optionCount / 2), 2) : 2;

  if (!question) {
    return (
      <SlideContentWrapper title="Multiple choice">
        <p>Select a slide to edit.</p>
      </SlideContentWrapper>
    );
  }

  const options = question.options;
  const hasCorrectAnswer = question.correctOptionIds.length > 0;

  // Deterministic sample data — there are no real responses at authoring time,
  // and a stable distribution keeps chart values from jumping while the author
  // edits option labels inline. The same adapter renders live results on the
  // session board later.
  const chartData = mcqResults.toChartData(
    options,
    question.correctOptionIds,
    mcqResults.sampleDistribution(options, question.correctOptionIds),
  );

  // Pre-bind each option's editing surface, keyed by id, so the chart's
  // renderLabel can map an edited label back to the right option.
  const controlsById = new Map(
    options.map((option, idx) => [option.id, getOptionProps(option, idx)]),
  );

  return (
    <SlideContentWrapper
      prompt={{
        idBase: `mcq-${question.id}`,
        value: prompt,
        placeholder: "Type your question…",
        onChange: (html: string) => {
          setPrompt(html);
          schedulePrompt(html);
        },
        onBlur: flush,
      }}
      footer={
        <p className={hasCorrectAnswer ? styles.footerPlaceholder : undefined}>
          Not setting a correct answer means this slide is not scoreable.
        </p>
      }
    >
      {effective === "NONE" || effective == null ? (
        <div className={styles.optionsRow} style={{ "--cols": columns } as React.CSSProperties}>
          <DragDropProvider
            onDragEnd={(event) => {
              handleOptionDragEnd(event);
            }}
          >
            {options.map((option, idx) => (
              <McqOptionEditable
                key={option.id ?? `__no-id-${idx.toString()}`}
                sortIndex={idx}
                {...getOptionProps(option, idx)}
              />
            ))}
          </DragDropProvider>
        </div>
      ) : (
        <div className={styles.chartEditor}>
          {/* The chart replaces the option-card grid, but options stay fully
              editable: each label is an inline EditableChartOptionLabel wired to
              the same editor. */}
          <ResultsChart
            viz={effective}
            data={chartData}
            caption="Sample data"
            renderLabel={(d) => {
              const props = d.id ? controlsById.get(d.id) : undefined;
              return props ? <EditableChartOptionLabel {...props} /> : d.label;
            }}
          />
          {canAddOption && (
            <div className={styles.addOptionRow}>
              <Btn fill="ghost" size="sm" onClick={addOption}>
                Add option
              </Btn>
            </div>
          )}
        </div>
      )}
    </SlideContentWrapper>
  );
};

export { McqSlideContentView };
