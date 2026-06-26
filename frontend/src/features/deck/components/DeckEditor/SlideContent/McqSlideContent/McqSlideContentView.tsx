/**
 * Loads the MCQ Content Slide and relevant hooks, then hands off to the ResultsDisplaySwitch for
 * Actual visualization.
 * Also passes in question prompt editing calls to the wrapper component
 */
import { AnswerSettings } from "@/features/deck/store/deckApi.gen";
import { ChartDatum, ChartType } from "@/shared/components/Charts/types";
import { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { McqOption } from "@/shared/types/elements";
import { type UseMcqEditorResult } from "@deck/hooks/useMcqEditor";
import { useState } from "react";
import { CorrectToggle } from "../_shared/OptionControls/CorrectToggle";
import { Label } from "../_shared/OptionControls/Label";
import { Menu } from "../_shared/OptionControls/Menu";
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
    <Label
      option={datum}
      flush={flush}
      onScheduleText={(next: McqOption) => {
        scheduleOption(datum.id, next);
      }}
    />
  );

  const renderToggle = (datum: ChartDatum) => (
    <CorrectToggle
      isCorrect={isCorrect(datum.id)}
      onToggleCorrect={() => {
        toggleCorrect(datum.id);
      }}
    />
  );

  const renderMenu = (datum: ChartDatum) => (
    <Menu
      activeOption={datum}
      activeOptionId={datum.id}
      index={datum.id}
      canRemove={canRemove}
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
            renderToggle={renderToggle}
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
