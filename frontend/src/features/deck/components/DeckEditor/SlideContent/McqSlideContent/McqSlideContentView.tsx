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
import { ResultsChart } from "@/shared/components/Charts/ResultsChart/ResultsChart";
import { mcqResults } from "@/shared/components/Charts/registry";
import { ChartType } from "@/shared/components/Charts/types";
import { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { type UseMcqEditorResult } from "@deck/hooks/useMcqEditor";
import { DragDropProvider } from "@dnd-kit/react";
import { PlusIcon } from "@heroicons/react/24/solid";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { useState } from "react";
import { SlideContentWrapper } from "../SlideContentWrapper";
import { McqOptionEditable } from "../_shared/McqOptionEditable/McqOptionEditable";
import styles from "./McqSlideContent.module.css";

interface McqSlideContentViewProps {
  UseMcqEditorResult: UseMcqEditorResult;
  /** Render chart values as a percentage of the total (slide answer setting). */
  displayAsPercentage?: boolean;
  previewVisualization: ChartType | null;
  openPicker: OpenGalleryPicker;
}

const McqSlideContentView = ({
  UseMcqEditorResult,
  displayAsPercentage = false,
  previewVisualization,
  openPicker,
}: McqSlideContentViewProps) => {
  const { question, schedulePrompt, flush, canAddOption, addOption, handleOptionDragEnd } =
    UseMcqEditorResult;
  // Only the prompt needs a local mirror — typing should feel responsive and
  // the rich-text editor controls its own DOM. Options come down as props from
  // the single editor. `syncedFromId` resets the mirror when the active slide
  // changes (this resync is purely local, hence the local state).
  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  const [syncedFromId, setSyncedFromId] = useState(question?.id);

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

  // Deterministic sample data
  const chartData = mcqResults.toChartData(
    options,
    question.correctOptionIds,
    mcqResults.sampleDistribution(options),
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
                optionId={option.id}
                sortIndex={idx}
                UseMcqEditorResult={UseMcqEditorResult}
                openPicker={openPicker}
              />
            ))}
          </DragDropProvider>
        </div>
      ) : (
        <div className={styles.chartEditor}>
          <DragDropProvider
            onDragEnd={(event) => {
              handleOptionDragEnd(event);
            }}
          >
            <ResultsChart
              viz={effective}
              data={chartData}
              caption="Sample data"
              displayAsPercentage={displayAsPercentage}
            />
          </DragDropProvider>
          {canAddOption && (
            <div className={styles.addOptionRow}>
              <IconBtn
                size="sm"
                shape="round"
                variant="info"
                onClick={addOption}
                aria-label="Add option"
                icon={<PlusIcon />}
              />
            </div>
          )}
        </div>
      )}
    </SlideContentWrapper>
  );
};

export { McqSlideContentView };
