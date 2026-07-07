/**
 * Author surface for a Scales / Likert slide.
 *
 * Prompt on top, then the "Scale" settings card — two endpoint cards (anchor
 * label + boundary value stepper) joined by a live track preview, with step
 * and tolerance tucked behind an "Advanced" disclosure — then the statements
 * the player rates on that scale.
 *
 * Scoring is per statement: each row repeats the scale as tappable points and
 * the author taps one to set that statement's correct answer (tap it again to
 * clear). There is no global "scored" switch — the slide is graded the moment
 * any statement has a target, and unscored when none do.
 *
 * There is exactly one `useScalesEditor` here; the scale-level fields are
 * mirrored locally so the debounced inputs stay responsive, and each row
 * receives its slice of the editor surface as props, so all writes funnel
 * through a single draft + debounce buffer.
 */
import { useState } from "react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";

import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import {
  MAX_SCALE_STATEMENTS,
  useScalesEditor,
} from "@deck/hooks/useScalesEditor";
import { SlideContentWrapper } from "../SlideContentWrapper";
import { EmptySelect, ItemList, SectionHeader, SettingsCard, SettingsRow } from "../_shared";
import { ScaleEndpointCard } from "./ScaleEndpointCard";
import { ScalePreview } from "./ScalePreview";
import { ScaleStatementEditable } from "./ScaleStatementEditable";
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
    scheduleStep,
    scheduleLeftLabel,
    scheduleRightLabel,
    scheduleTolerance,
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
  // store value would make these fields feel frozen mid-edit.
  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  const [min, setMin] = useState(question?.min ?? 1);
  const [max, setMax] = useState(question?.max ?? 5);
  const [step, setStep] = useState(question?.step ?? 1);
  const [leftLabel, setLeftLabel] = useState(question?.leftLabel ?? "");
  const [rightLabel, setRightLabel] = useState(question?.rightLabel ?? "");
  const [tolerance, setTolerance] = useState(question?.tolerance ?? 0);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [syncedFromId, setSyncedFromId] = useState(question?.id);

  // Resync every mirror when the active slide changes ("derive state during
  // render" — safe when the new value differs).
  if (question && syncedFromId !== question.id) {
    setSyncedFromId(question.id);
    setPrompt(question.prompt);
    setMin(question.min);
    setMax(question.max);
    setStep(question.step);
    setLeftLabel(question.leftLabel);
    setRightLabel(question.rightLabel);
    setTolerance(question.tolerance);
  }

  if (!question) return <EmptySelect title="Scales" />;

  const idBase = question.id;

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
          <ScalePreview min={min} max={max} step={step} />
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
        <button
          type="button"
          className={styles.advancedToggle}
          aria-expanded={advancedOpen}
          onClick={() => {
            setAdvancedOpen((open) => !open);
          }}
        >
          <ChevronRightIcon
            aria-hidden="true"
            className={[
              styles.advancedChevron,
              advancedOpen ? styles.advancedChevronOpen : "",
            ]
              .filter(Boolean)
              .join(" ")}
          />
          Advanced · step {step}
          {tolerance > 0 && <> · ±{tolerance}</>}
        </button>
        {advancedOpen && (
          <SettingsRow>
            <NumberInput
              label="Step"
              id={`scales-step-${idBase}`}
              value={step}
              min={0}
              onChange={(next) => {
                setStep(next);
                scheduleStep(next);
              }}
              onBlur={flush}
            />
            <NumberInput
              label="Tolerance (±)"
              id={`scales-tolerance-${idBase}`}
              value={tolerance}
              min={0}
              step={step}
              onChange={(next) => {
                setTolerance(next);
                scheduleTolerance(next);
              }}
              onBlur={flush}
            />
          </SettingsRow>
        )}
      </SettingsCard>

      <SectionHeader
        label="Statements"
        hint="tap a point on a statement's scale to set its correct answer"
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
            step={step}
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
