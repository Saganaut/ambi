/**
 * Author surface for a Scales / Likert slide.
 *
 * Prompt on top, then a "Scale" settings card (a live `ScalePreview` over the
 * min / max / step + anchor labels, plus an opt-in "Scored" toggle), then a
 * list of statements the player rates on that scale. Each statement is a
 * controlled `ScaleStatementEditable` row.
 *
 * There is exactly one `useScalesEditor` here; the scale-level fields are
 * mirrored locally so the debounced inputs stay responsive, and each row
 * receives its slice of the editor surface as props, so all writes funnel
 * through a single draft + debounce buffer. "Scored" is local UI intent —
 * persistence is simply whether any statement has a target in `correctValues`.
 */
import { useState } from "react";

import { Checkbox } from "@components/Forms/Input/Checkbox/Checkbox";
import { Input } from "@components/Forms/Input/Input/Input";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import {
  MAX_SCALE_STATEMENTS,
  useScalesEditor,
} from "@deck/hooks/useScalesEditor";
import { SlideContentWrapper } from "../SlideContentWrapper";
import { EmptySelect, ItemList, SectionHeader, SettingsCard, SettingsRow } from "../_shared";
import { ScalePreview } from "./ScalePreview";
import { ScaleStatementEditable } from "./ScaleStatementEditable";

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
    clearCorrectValues,
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
  const [scored, setScored] = useState(question?.scored ?? false);
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
    setScored(question.scored);
  }

  if (!question) return <EmptySelect title="Scales" />;

  const idBase = question.id;

  const handleScoredToggle = (next: boolean) => {
    setScored(next);
    // Turning scoring off clears every target so the slide grades as unscored;
    // turning it on just reveals the per-statement inputs (targets persist as
    // the author fills them in).
    if (!next) clearCorrectValues();
  };

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
          {scored
            ? "Players are scored when their rating lands within the tolerance of a statement's answer."
            : "Unscored — collect and show how players rated each statement."}
        </p>
      }
    >
      <SettingsCard title="Scale">
        <ScalePreview min={min} max={max} minLabel={leftLabel} maxLabel={rightLabel} />
        <SettingsRow>
          <NumberInput
            label="Min"
            id={`scales-min-${idBase}`}
            value={min}
            onChange={(next) => {
              setMin(next);
              scheduleMin(next);
            }}
            onBlur={flush}
          />
          <NumberInput
            label="Max"
            id={`scales-max-${idBase}`}
            value={max}
            onChange={(next) => {
              setMax(next);
              scheduleMax(next);
            }}
            onBlur={flush}
          />
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
        </SettingsRow>
        <SettingsRow>
          <Input
            label="Left label"
            id={`scales-leftlabel-${idBase}`}
            type="text"
            value={leftLabel}
            placeholder="e.g. Strongly disagree"
            onChange={(e) => {
              const next = e.target.value;
              setLeftLabel(next);
              scheduleLeftLabel(next);
            }}
            onBlur={flush}
          />
          <Input
            label="Right label"
            id={`scales-rightlabel-${idBase}`}
            type="text"
            value={rightLabel}
            placeholder="e.g. Strongly agree"
            onChange={(e) => {
              const next = e.target.value;
              setRightLabel(next);
              scheduleRightLabel(next);
            }}
            onBlur={flush}
          />
        </SettingsRow>
        <SettingsRow>
          <Checkbox
            label="Scored — grade each statement against a target"
            id={`scales-scored-${idBase}`}
            checked={scored}
            onChange={(e) => {
              handleScoredToggle(e.target.checked);
            }}
          />
        </SettingsRow>
        {scored && (
          <SettingsRow>
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

      <SectionHeader label="Statements" />
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
            scored={scored}
            correctValue={statement.id ? question.correctValues[statement.id] : undefined}
            min={min}
            max={max}
            step={step}
            onScheduleLabel={(next) => {
              scheduleStatement(statement.id, next);
            }}
            onScheduleCorrectValue={(value) => {
              scheduleCorrectValue(statement.id, value);
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
