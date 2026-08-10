import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { DragDropWrapper } from "@components/Wrappers/DragDropWrapper";
import {
  MAX_SCALE_STATEMENTS,
  SCALES_TOLERANCE_MAX_FRACTION,
  SCALES_TOLERANCE_MIN_FRACTION,
  useScalesEditor,
} from "@deck/hooks/useScalesEditor";
import { AddItemCard, EmptySelect, SortableItemBankRow } from "../_shared";
import { SlideContentProps } from "../_shared/Item.types";
import { ItemToEditableScalesItem } from "../AllocationSlideContent/ItemFormatters";
import { SlideContent, SlideContentSection } from "../SlideContentSection";
import { SlideWrapper } from "../SlideWrapper";
import { ScaleEndpointCard } from "./ScaleEndpointCard";
import { ScalePreview } from "./ScalePreview";
import styles from "./ScalesSlideContent.module.css";
import { useScalesDraft } from "./useScalesDraft";

const ScalesSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const editor = useScalesEditor(deckId, slideId);
  const { question } = editor;
  const openPicker = useGalleryPicker(deckId);
  const {
    prompt,
    setPrompt,
    min,
    setMin,
    max,
    setMax,
    leftLabel,
    setLeftLabel,
    rightLabel,
    setRightLabel,
    openMenuId,
    setOpenMenuId,
  } = useScalesDraft({ question });

  if (!question) return <EmptySelect title="Scales" />;

  const idBase = question.id;
  const span = max - min;
  const tolerancePercent = span > 0 ? Math.round((question.tolerance / span) * 100) : 0;

  return (
    <SlideWrapper
      prompt={{
        idBase: `scales-${idBase}`,
        value: prompt,
        placeholder: "What are players rating?",
        onChange: (html: string) => {
          setPrompt(html);
          editor.actions.scheduleQuestionPrompt(html);
        },
        onBlur: editor.actions.flush,
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
            <span>Drag along a statement&apos;s scale</span>
          </SlideContentSection.Header>
          <SlideContentSection.Body>
            <DragDropWrapper onReorder={editor.actions.handleItemDragEnd}>
              {question.items.map((statement, index) => (
                <SortableItemBankRow
                  key={statement.id}
                  {...ItemToEditableScalesItem(
                    statement,
                    index,
                    editor.actions,
                    editor.state,
                    { min, max, leftLabel, rightLabel, tolerance: question.tolerance },
                    openPicker,
                    setOpenMenuId,
                    openMenuId,
                    question.correctValues,
                  )}
                />
              ))}
              <AddItemCard
                label={
                  editor.state.canAddItem
                    ? "Add statement"
                    : `Maximum ${MAX_SCALE_STATEMENTS.toString()} statements`
                }
                disabled={!editor.state.canAddItem}
                onAdd={editor.actions.addItem}
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
                  editor.actions.scheduleMin(next);
                  editor.actions.flush();
                }}
                label={leftLabel}
                labelPlaceholder="e.g. Strongly disagree"
                onScheduleLabel={(next) => {
                  setLeftLabel(next);
                  editor.actions.scheduleLeftLabel(next);
                }}
                onFlush={editor.actions.flush}
              />
              <ScalePreview min={min} max={max} />
              <ScaleEndpointCard
                side="right"
                idBase={idBase}
                value={max}
                decrementDisabled={max - 1 <= min}
                onCommitValue={(next) => {
                  setMax(next);
                  editor.actions.scheduleMax(next);
                  editor.actions.flush();
                }}
                label={rightLabel}
                labelPlaceholder="e.g. Strongly agree"
                onScheduleLabel={(next) => {
                  setRightLabel(next);
                  editor.actions.scheduleRightLabel(next);
                }}
                onFlush={editor.actions.flush}
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
                  editor.actions.setTolerance((next / 100) * span);
                }}
              />
            </div>
          </SlideContentSection.Body>
        </SlideContentSection>
      </SlideContent>
    </SlideWrapper>
  );
};

export { ScalesSlideContent };
