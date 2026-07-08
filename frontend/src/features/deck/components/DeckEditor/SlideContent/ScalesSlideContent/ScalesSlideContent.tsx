/**
 * Author surface for a Scales / Likert slide.
 *
 * Prompt on top, then the "Scale" settings card — two endpoint cards (anchor
 * label + boundary value stepper) joined by a live track preview, with the
 * tolerance slider on its own always-visible row — then the statements the
 * player rates on that scale.
 *
 * Scoring is per statement: each row repeats the scale as a continuous drag
 * track and the author drags a marker to set that statement's correct answer
 * (the X next to the numeric field clears it). There is no global "scored"
 * switch — the slide is graded the moment any statement has a target, and
 * unscored when none do.
 *
 * There is exactly one `useScalesEditor` here; the scale-level fields are
 * mirrored locally so the debounced inputs stay responsive, and each row
 * receives its slice of the editor surface as props, so all writes funnel
 * through a single draft + debounce buffer.
 */
import { useState } from "react";

import {
  MAX_SCALE_STATEMENTS,
  SCALES_TOLERANCE_MAX_FRACTION,
  SCALES_TOLERANCE_MIN_FRACTION,
  useScalesEditor,
} from "@deck/hooks/useScalesEditor";
import { SlideContentWrapper } from "../SlideContentWrapper";
import { EmptySelect, ItemList, SectionHeader, SettingsCard } from "../_shared";
import { ScaleEndpointCard } from "./ScaleEndpointCard";
import { ScalePreview } from "./ScalePreview";
import { ScaleStatementEditable } from "./ScaleStatementEditable";
import { formatScaleValue } from "@/shared/utils/scaleValue";
import styles from "./ScalesSlideContent.module.css";

interface ScalesSlideContentProps {
  deckId: string;
  slideId: string;
}

const ScalesSlideContent = ({ deckId, slideId }: ScalesSlideContentProps) => {
  const {
    question,
    schedulePrompt,
    flush,
    scheduleMin,
    scheduleMax,
    scheduleLeftLabel,
    scheduleRightLabel,
    setTolerance,
    canAddStatement,
    addStatement,
    canRemove,
    scheduleStatement,
    removeStatement,
    scheduleCorrectValue,
    commitCorrectValue,
    clearCorrectValue,
  } = useScalesEditor(deckId, slideId);

  // Local mirrors keep the debounced inputs responsive: `updateSlideContent`
  // buffers to a draft and only commits on flush, so binding straight to the
  // store value would make these fields feel frozen mid-edit. Tolerance needs
  // no mirror — `setTolerance` commits immediately (clamped + flushed).
  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  const [min, setMin] = useState(question?.min ?? 1);
  const [max, setMax] = useState(question?.max ?? 5);
  const [leftLabel, setLeftLabel] = useState(question?.leftLabel ?? "");
  const [rightLabel, setRightLabel] = useState(question?.rightLabel ?? "");
  const [syncedFromId, setSyncedFromId] = useState(question?.id);

  // Resync every mirror when the active slide changes ("derive state during
  // render" — safe when the new value differs).
  if (question && syncedFromId !== question.id) {
    setSyncedFromId(question.id);
    setPrompt(question.prompt);
    setMin(question.min);
    setMax(question.max);
    setLeftLabel(question.leftLabel);
    setRightLabel(question.rightLabel);
  }

  if (!question) return <EmptySelect title="Scales" />;

  const idBase = question.id;
  const span = max - min;
  const tolerancePercent = span > 0 ? Math.round((question.tolerance / span) * 100) : 0;

  return (
    <SlideContentWrapper
      prompt={{
        idBase: `scales-${idBase}`,
        value: prompt,
        placeholder: "What are players rating?",
        onChange: (html: string) => {
          setPrompt(html);
          schedulePrompt(html);
        },
        onBlur: flush,
      }}
      footer={
        <p>
          {question.scored
            ? "Players are scored when their rating lands within the tolerance of a statement's answer."
            : "Unscored — collect and show how players rated each statement."}
        </p>
      }
    >
      <SettingsCard title="Scale">
        <div className={styles.scaleGrid}>
          <ScaleEndpointCard
            side="left"
            idBase={idBase}
            value={min}
            incrementDisabled={min + 1 >= max}
            onCommitValue={(next) => {
              setMin(next);
              scheduleMin(next);
              flush();
            }}
            label={leftLabel}
            labelPlaceholder="e.g. Strongly disagree"
            onScheduleLabel={(next) => {
              setLeftLabel(next);
              scheduleLeftLabel(next);
            }}
            onFlush={flush}
          />
          <ScalePreview min={min} max={max} />
          <ScaleEndpointCard
            side="right"
            idBase={idBase}
            value={max}
            decrementDisabled={max - 1 <= min}
            onCommitValue={(next) => {
              setMax(next);
              scheduleMax(next);
              flush();
            }}
            label={rightLabel}
            labelPlaceholder="e.g. Strongly agree"
            onScheduleLabel={(next) => {
              setRightLabel(next);
              scheduleRightLabel(next);
            }}
            onFlush={flush}
          />
        </div>
        <div className={styles.toleranceRow}>
          <label htmlFor={`scales-tolerance-${idBase}`}>Tolerance</label>
          <input
            id={`scales-tolerance-${idBase}`}
            type="range"
            min={Math.round(SCALES_TOLERANCE_MIN_FRACTION * 100)}
            max={Math.round(SCALES_TOLERANCE_MAX_FRACTION * 100)}
            step={1}
            value={tolerancePercent}
            onChange={(event) => {
              setTolerance((Number(event.target.value) / 100) * span);
            }}
          />
          <span className={styles.toleranceValue}>
            ±{formatScaleValue(question.tolerance)}
          </span>
        </div>
      </SettingsCard>

      <SectionHeader
        label="Statements"
        hint="drag along a statement's scale to set its correct answer"
      />
      <ItemList
        addLabel={
          canAddStatement
            ? "Add statement"
            : `Maximum ${MAX_SCALE_STATEMENTS.toString()} statements`
        }
        canAdd={canAddStatement}
        onAdd={addStatement}
      >
        {question.items.map((statement, idx) => (
          <ScaleStatementEditable
            key={statement.id ?? idx}
            statement={statement}
            sortIndex={idx}
            canRemove={canRemove}
            correctValue={statement.id ? question.correctValues[statement.id] : undefined}
            min={min}
            max={max}
            tolerance={question.tolerance}
            leftLabel={leftLabel}
            rightLabel={rightLabel}
            onScheduleLabel={(next) => {
              scheduleStatement(statement.id, next);
            }}
            onCommitCorrectValue={(value) => {
              commitCorrectValue(statement.id, value);
            }}
            onScheduleCorrectValue={(value) => {
              scheduleCorrectValue(statement.id, value);
            }}
            onClearCorrectValue={() => {
              clearCorrectValue(statement.id);
            }}
            onFlush={flush}
            onRemove={() => {
              removeStatement(statement.id);
            }}
          />
        ))}
      </ItemList>
    </SlideContentWrapper>
  );
};

export { ScalesSlideContent };
