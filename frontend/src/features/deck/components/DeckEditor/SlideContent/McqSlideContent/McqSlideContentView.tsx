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
import { useState } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { SlideContentWrapper } from "../SlideContentWrapper";
import { RichTextInput } from "@components/Forms/Input/RichTextInput/RichTextInput";
import { McqOptionEditable } from "../_shared/McqOptionEditable/McqOptionEditable";
import { type UseMcqEditorResult } from "@deck/hooks/useMcqEditor";
import styles from "./McqSlideContent.module.css";
import { type OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";


interface McqSlideContentViewProps {
  UseMcqEditorResult: UseMcqEditorResult;
  openPicker: OpenGalleryPicker;


}



const McqSlideContentView = ({ UseMcqEditorResult, openPicker }: McqSlideContentViewProps) => {

  const { question, schedulePrompt, flush, canAddOption, addOption, handleOptionDragEnd, canRemove, isCorrect, scheduleOption, commitOption, toggleCorrect, removeOption } = UseMcqEditorResult;
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

  // Even-column grid: round up half the option count, never below 2.
  const optionCount = question?.options.length ?? 0;
  const columns = optionCount ? Math.max(Math.ceil(optionCount / 2), 2) : 2;

  if (!question) {
    return (
      <SlideContentWrapper title='Multiple choice'>
        <p>Select a slide to edit.</p>
      </SlideContentWrapper>
    );
  }

  const options = question.options;
  const hasCorrectAnswer = question.correctOptionIds.length > 0;

  return (
    <SlideContentWrapper
      footer={
        <p className={hasCorrectAnswer ? styles.footerPlaceholder : undefined}>
          Not setting a correct answer means this slide is not scoreable.
        </p>
      }>
      <div className={styles.slideHeader}>
        <RichTextInput
          showGradient={true}
          isBordered={false}
          id={`mcq-prompt-${question.id}`}
          placeholder='Type your question…'
          value={prompt}
          className={styles.titleField}
          onChange={(html) => {
            setPrompt(html);
            schedulePrompt(html);
          }}
          onBlur={flush}
        />
      </div>
      <div
        className={styles.optionsRow}
        style={{ "--cols": columns } as React.CSSProperties}>
        <DragDropProvider
          onDragEnd={(event) => {
            handleOptionDragEnd(event);
          }}>
          {options.map((option, idx) => (
            <McqOptionEditable
              key={option.id ?? `__no-id-${idx.toString()}`}
              option={option}
              sortIndex={idx}
              index={idx}
              isCorrect={isCorrect(option.id)}
              canRemove={canRemove}
              addOption={addOption}
              canAddOption={canAddOption}
              onScheduleText={(next) => {
                scheduleOption(option.id, next);
              }}
              onCommit={(next) => {
                commitOption(option.id, next);
              }}
              onToggleCorrect={() => {
                toggleCorrect(option.id);
              }}
              onRemove={() => {
                removeOption(option.id);
              }}
              flush={flush}
              openPicker={openPicker}
            />
          ))}
        </DragDropProvider>
      </div>
    </SlideContentWrapper>
  );
};

export { McqSlideContentView };
