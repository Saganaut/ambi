/**
 * Loads the MCQ Content Slide and relevant hooks, then hands off to the ResultsDisplaySwitch for
 * Actual visualization.
 * Also passes in question prompt editing calls to the wrapper component
 */
import { AnswerSettings } from "@/features/deck/store/deckApi.gen";
import { ChartDatum, ChartType } from "@/shared/components/Charts/Chart.types";
import { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { McqOption } from "@/shared/types/Elements.types";
import { type UseMcqEditorResult } from "@deck/hooks/useMcqEditor";
import { useState } from "react";
import { OptionField } from "../_shared/OptionControls/OptionField";
import { ResultsDisplaySwitch } from "../ResultsDisplaySwitch/ResultsDisplaySwitch";
import { SlideContentWrapper } from "../SlideContentWrapper";
import styles from "./McqSlideContent.module.css";

interface McqSlideContentViewProps {
  previewVisualization: ChartType | null;
  openPicker: OpenGalleryPicker;
  answerSettings?: AnswerSettings;
  editor: UseMcqEditorResult;
}

const McqSlideContentView = ({
  editor,
  openPicker,
  answerSettings,
  previewVisualization,
}: McqSlideContentViewProps) => {
  const {
    question,
    schedulePrompt,
    flush,
    scheduleOption,
    isCorrect,
    toggleCorrect,
    canRemove,
    commitOption,
    removeOption,
  } = editor;

  const noCorrectAnswerWarning = "Not setting a correct answer means this slide is not scoreable.";
  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  const [syncedFromId, setSyncedFromId] = useState(question?.id);
  // Which option's menu is open — at most one per slide. Focusing an option's
  // label opens its menu (and thereby closes any other); Menu owns dismissal.
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const effective = previewVisualization ?? question?.dataVisualization;

  // Resync the local mirror when the active question changes. "Derive state
  // during render" pattern — safe when the new value differs.
  if (question && syncedFromId !== question.id) {
    setSyncedFromId(question.id);
    setPrompt(question.prompt);
  }

  if (!question) {
    return (
      <SlideContentWrapper title="Multiple choice">
        <p>Select a slide to edit.</p>
      </SlideContentWrapper>
    );
  }

  const hasCorrectAnswer = question.correctOptionIds.length > 0;

  const renderLabel = (datum: ChartDatum) => (
    <OptionField
      option={datum}
      paletteIndex={question.options.findIndex((option) => option.id === datum.id)}
      canRemove={canRemove}
      isCorrect={isCorrect(datum.id)}
      open={openMenuId === datum.id}
      onOpenChange={(open) => {
        setOpenMenuId(open ? datum.id : null);
      }}
      onToggleCorrect={() => {
        toggleCorrect(datum.id);
      }}
      onScheduleText={(next: McqOption) => {
        scheduleOption(datum.id, next);
      }}
      onCommit={(next: McqOption) => {
        commitOption(datum.id, next);
      }}
      onRemove={() => {
        removeOption(datum.id);
      }}
      flush={flush}
      openPicker={openPicker}
    />
  );

  // The menu now lives with the label (it opens off the field, via
  // OptionField). The chart's menu slot renders nothing, but the callback stays
  // truthy so charts that gate their action row on it (e.g. BarChart's correct
  // badge) keep rendering it.
  const renderMenu = () => null;

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
          {noCorrectAnswerWarning}
        </p>
      }
    >
      {effective ? (
        <div className={styles.chartEditor}>
          <ResultsDisplaySwitch
            viz={effective}
            caption="Sample data"
            renderMenu={renderMenu}
            renderLabel={renderLabel}
            editor={editor}
            answerSettings={answerSettings}
          />
        </div>
      ) : (
        <div>Incorrect results type</div>
      )}
    </SlideContentWrapper>
  );
};

export { McqSlideContentView };
