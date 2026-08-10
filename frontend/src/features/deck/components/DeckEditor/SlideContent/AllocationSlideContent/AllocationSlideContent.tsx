import { useAllocationDraft } from "@/features/deck/components/DeckEditor/SlideContent/AllocationSlideContent/useAllocationDraft";
import { DragDropWrapper } from "@/shared/components/Wrappers/DragDropWrapper";
import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { ALLOCATION_TOTAL_MIN, useAllocationEditor } from "@deck/hooks/useAllocationEditor";
import { AddItemCard, EmptySelect, ScoringFooter } from "../_shared";
import { SlideContentProps } from "../_shared/Item.types";
import { SortableItemBankRow } from "../_shared/BankItems/ItemBankRow";
import { SlideContent, SlideContentSection } from "../SlideContentSection";
import { SlideWrapper } from "../SlideWrapper";
import styles from "./AllocationSlideContent.module.css";
import { OptionToEditableAllocationItem } from "./ItemFormatters";

const AllocationSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const editor = useAllocationEditor(deckId, slideId);
  const { question } = editor;
  const {
    prompt,
    totalPoints,
    tolerance,
    setPrompt,
    setTotalPoints,
    setTolerance,
    openMenuId,
    setOpenMenuId,
  } = useAllocationDraft({ question });
  const openPicker = useGalleryPicker(deckId);

  if (!question) return <EmptySelect title="Allocation" />;

  const { options, correctAllocations } = question;

  const keyedCount = options.filter(
    (option) => option.id && correctAllocations[option.id] !== undefined,
  ).length;
  const fullyKeyed = options.length > 0 && keyedCount === options.length;
  const answerSum = Object.values(correctAllocations).reduce((sum, points) => sum + points, 0);

  const footer = fullyKeyed ? (
    answerSum === totalPoints ? (
      <p>
        Scored when a player&apos;s split lands within ±{question.tolerancePerItem.toString()} of
        every option&apos;s answer.
      </p>
    ) : (
      <ScoringFooter
        visible
        message={`The answers sum to ${answerSum.toString()}, not the ${totalPoints.toString()}-point pool — adjust them to match.`}
      />
    )
  ) : (
    <ScoringFooter
      visible
      message="Set the correct points for every option to make this slide scoreable."
    />
  );
  return (
    <SlideWrapper
      prompt={{
        idBase: `alloc-${question.id}`,
        value: prompt,
        placeholder: "Ask players to split the pool…",
        onChange: (html) => {
          setPrompt(html);
          editor.actions.scheduleQuestionPrompt(html);
        },
        onBlur: editor.actions.flush,
      }}
      footer={footer}
    >
      <SlideContent>
        <SlideContentSection>
          <SlideContentSection.Header>
            <span>Pool</span>
            <span className={styles.poolBadge}>
              <strong>{totalPoints}</strong> pts across {options.length} options
            </span>
          </SlideContentSection.Header>
          <SlideContentSection.Body>
            <NumberInput
              label="Points to allocate"
              id={`alloc-total-${question.id}`}
              min={ALLOCATION_TOTAL_MIN}
              value={totalPoints}
              onChange={(next) => {
                setTotalPoints(next);
                editor.actions.scheduleTotalPoints(next);
              }}
              onBlur={editor.actions.flush}
            />
            <NumberInput
              label="Tolerance ±"
              id={`alloc-tolerance-${question.id}`}
              min={0}
              max={totalPoints}
              value={tolerance}
              onChange={(next) => {
                setTolerance(next);
                editor.actions.scheduleTolerance(next);
              }}
              onBlur={editor.actions.flush}
            />
          </SlideContentSection.Body>
        </SlideContentSection>
        <SlideContentSection>
          <SlideContentSection.Header>
            <span>Options</span> <span>players split the pool across these options</span>
          </SlideContentSection.Header>
          <SlideContentSection.Body>
            <DragDropWrapper onReorder={editor.actions.handleItemDragEnd}>
              {options.map((option, index) => (
                <SortableItemBankRow
                  key={option.id}
                  {...OptionToEditableAllocationItem(
                    option,
                    index,
                    editor.actions,
                    editor.state,
                    totalPoints,
                    tolerance,
                    openPicker,
                    setOpenMenuId,
                    openMenuId,
                    editor.question?.correctAllocations,
                  )}
                />
              ))}
              {editor.state.canAddItem && (
                <AddItemCard
                  label={"Add option"}
                  disabled={!editor.state.canAddItem}
                  onAdd={editor.actions.addItem}
                />
              )}
            </DragDropWrapper>
          </SlideContentSection.Body>
        </SlideContentSection>
      </SlideContent>
    </SlideWrapper>
  );
};

export { AllocationSlideContent };
