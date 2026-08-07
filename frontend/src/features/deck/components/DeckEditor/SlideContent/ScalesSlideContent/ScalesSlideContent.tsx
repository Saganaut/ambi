/**
 * Author surface for a Scales / Likert slide.
 *
 * Prompt on top, then the "Scale" settings card — two endpoint cards (anchor
 * label + boundary value stepper) joined by a live track preview, with the
 * tolerance input on its own always-visible row — then the statements the
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
 * through a single draft + debounce buffer. The prompt mirror and which row's
 * menu is open live in the shared `useSlideDraft`.
 */
import { useState } from "react";

import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { DragDropWrapper } from "@components/Wrappers/DragDropWrapper";
import {
  MAX_SCALE_STATEMENTS,
  SCALES_TOLERANCE_MAX_FRACTION,
  SCALES_TOLERANCE_MIN_FRACTION,
  useScalesEditor,
} from "@deck/hooks/useScalesEditor";
import { SlideContent, SlideContentSection } from "../SlideContentSection";
import { SlideWrapper } from "../SlideWrapper";
import { AddItemCard, EmptySelect, useSlideDraft } from "../_shared";
import { SortableItemBankRow } from "../_shared/ItemBankRow/ItemBankRow";
import { ScaleEndpointCard } from "./ScaleEndpointCard";
import { ScalePreview } from "./ScalePreview";
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
    scheduleStatementLabel,
    setStatementColor,
    setStatementImage,
    removeStatement,
    handleStatementDragEnd,
    scheduleCorrectAnswerValue,
    commitCorrectAnswerValue,
    clearCorrectAnswerValue,
  } = useScalesEditor(deckId, slideId);
  const openPicker = useGalleryPicker(deckId);
  // The prompt mirror and which row's menu is open — at most one per slide.
  // Focusing a row's label opens its menu (and thereby closes any other); the
  // menu owns dismissal. Scales arms no row, so `selectedItemId` goes unused.
  const composer = useSlideDraft(question);

  // Local mirrors keep the debounced inputs responsive: `updateSlideContent`
  // buffers to a draft and only commits on flush, so binding straight to the
  // store value would make these fields feel frozen mid-edit. Tolerance needs
  // no mirror — `setTolerance` commits immediately (clamped + flushed).
  const [min, setMin] = useState(question?.min ?? 1);
  const [max, setMax] = useState(question?.max ?? 5);
  const [leftLabel, setLeftLabel] = useState(question?.leftLabel ?? "");
  const [rightLabel, setRightLabel] = useState(question?.rightLabel ?? "");
  const [syncedFromId, setSyncedFromId] = useState(question?.id);

  // Resync every mirror when the active slide changes ("derive state during
  // render" — safe when the new value differs).
  if (question && syncedFromId !== question.id) {
    setSyncedFromId(question.id);
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
    <SlideWrapper
      prompt={{
        idBase: `scales-${idBase}`,
        value: composer.prompt,
        placeholder: "What are players rating?",
        onChange: (html: string) => {
          composer.setPrompt(html);
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
      <SlideContent>
        <SlideContentSection>
          <SlideContentSection.Header>
            <span>Statements</span>
            <span>Drag along a statement's scale</span>
          </SlideContentSection.Header>
          <SlideContentSection.Body>
            <DragDropWrapper onReorder={handleStatementDragEnd}>
              {question.items.map((statement, idx) => (
                <SortableItemBankRow
                  type={"scales"}
                  key={statement.id}
                  item={statement}
                  index={idx}
                  color={statement.color ?? "#FFFFFF"}
                  menuOpen={composer.openMenuId === statement.id}
                  canRemove={canRemove}
                  correctValue={question.correctValues[statement.id]}
                  minScale={min}
                  maxScale={max}
                  toleranceScale={question.tolerance}
                  leftLabel={leftLabel}
                  rightLabel={rightLabel}
                  onMenuOpenChange={(open) => {
                    composer.setOpenMenuId(open ? statement.id : null);
                  }}
                  onScheduleLabel={(label) => {
                    scheduleStatementLabel(statement.id, label);
                  }}
                  onCommit={(value) => {
                    commitCorrectAnswerValue(statement.id, value);
                  }}
                  onScheduleAnswer={(value) => {
                    scheduleCorrectAnswerValue(statement.id, value);
                  }}
                  onClear={() => {
                    clearCorrectAnswerValue(statement.id);
                  }}
                  onFlush={flush}
                  onSetColor={(color) => {
                    setStatementColor(statement.id, color);
                  }}
                  onSetImage={(image) => {
                    setStatementImage(statement.id, image);
                  }}
                  onRemove={() => {
                    removeStatement(statement.id);
                  }}
                  openPicker={openPicker}
                />
              ))}
              <AddItemCard
                label={
                  canAddStatement
                    ? "Add statement"
                    : `Maximum ${MAX_SCALE_STATEMENTS.toString()} statements`
                }
                disabled={!canAddStatement}
                onAdd={addStatement}
              />
            </DragDropWrapper>
          </SlideContentSection.Body>
        </SlideContentSection>
        <SlideContentSection className={styles.scaleSection}>
          <SlideContentSection.Header>Scale</SlideContentSection.Header>
          <SlideContentSection.Body>
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
              <NumberInput
                compact
                id={`scales-tolerance-${idBase}`}
                label="Tolerance %"
                labelPosition="labelInFront"
                min={Math.round(SCALES_TOLERANCE_MIN_FRACTION * 100)}
                max={Math.round(SCALES_TOLERANCE_MAX_FRACTION * 100)}
                value={tolerancePercent}
                onChange={(next) => {
                  setTolerance((next / 100) * span);
                }}
              />
              {/* <span className={styles.toleranceValue}>±{formatScaleValue(question.tolerance)}</span> */}
            </div>
          </SlideContentSection.Body>
        </SlideContentSection>
      </SlideContent>
    </SlideWrapper>
  );
};

export { ScalesSlideContent };
