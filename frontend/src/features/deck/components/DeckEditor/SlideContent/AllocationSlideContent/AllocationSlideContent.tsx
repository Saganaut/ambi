import { useAllocationDraft } from "@/features/deck/hooks/useAllocationDraft";
import { DragDropWrapper } from "@/shared/components/Wrappers/DragDropWrapper";
import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { McqOption } from "@/shared/types/Elements.types";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import {
  ALLOCATION_TOTAL_MIN,
  MAX_ALLOCATION_OPTIONS,
  useAllocationEditor,
} from "@deck/hooks/useAllocationEditor";
import { AddItemCard, EmptySelect } from "../_shared";
import { EditableItem, EditableItemContent } from "../_shared/Item.types";
import { SortableItemBankRow } from "../_shared/ItemBankRow/ItemBankRow";
import type { SlideContentProps } from "../slideContentProps";
import { SlideContent, SlideContentSection } from "../SlideContentSection";
import { SlideWrapper } from "../SlideWrapper";
import styles from "./AllocationSlideContent.module.css";

const AllocationSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  //TODO: fix these
  const CONTINUOUS_ANIMATION = false;
  const ANIMATE_ON_MOUNT = false;
  const IS_HIGHLIGHTED = false;
  const IS_SELECTED = false;
  const editor = useAllocationEditor(deckId, slideId);
  const { question } = editor;
  const openPicker = useGalleryPicker(deckId);
  const {
    prompt,
    totalPoints,
    tolerance,
    openMenuId,
    setPrompt,
    setTotalPoints,
    setTolerance,
    setOpenMenuId,
  } = useAllocationDraft({ question: question });

  if (!question) return <EmptySelect title="Allocation" />;

  const { options, correctAllocations } = question;

  const keyedCount = options.filter(
    (option) => option.id && correctAllocations[option.id] !== undefined,
  ).length;
  const fullyKeyed = options.length > 0 && keyedCount === options.length;
  const answerSum = Object.values(correctAllocations).reduce((sum, points) => sum + points, 0);
  const answerSeed = Math.round(totalPoints / Math.max(1, options.length));

  console.log("unused, add when adding footer", fullyKeyed, answerSum, answerSeed);

  const mcqOptionToItem = (option: McqOption): EditableItemContent => {
    return {
      id: option.id,
      label: option.text ?? "",
      color: option.color ?? "#fff",
      image: option.image,
    };
  };

  const OptionToEditableItem = (option: McqOption, idx: number): EditableItem<"ALLOCATION"> => {
    return {
      sourceIndex: idx,
      kind: "ALLOCATION",
      state: {
        canRemove: editor.state.canRemoveItem,
        menuIsOpen: openMenuId == option.id,
        isHighlighted: IS_HIGHLIGHTED,
        isSelected: IS_SELECTED,
        displayAsPercentage: editor.state.displayResultsAsPercentage,
        continuousAnimation: CONTINUOUS_ANIMATION,
        animateOnMount: ANIMATE_ON_MOUNT,
        isScorable: editor.actions.getIsScorable(option.id),
      },
      item: mcqOptionToItem(option),
      detail: {
        correctValue: correctAllocations[option.id],
        value: correctAllocations[option.id],
        totalPool: totalPoints,
      },
      actions: {
        onFlush: editor.actions.flush,
        onCommit: (points) => {
          editor.actions.commitCorrectAnswer(option.id, points);
        },
        onScheduleAnswer: (points) => {
          editor.actions.scheduleCorrectAnswer(option.id, points);
        },
        setMenuIsOpen: (open) => {
          setOpenMenuId(open ? option.id : null);
        },
        onClear: () => {
          editor.actions.clearCorrectAnswer(option.id);
        },
        onSelect: () => {
          console.log("allocation slide content on select not implemented");
        },
        onSetColor: (color) => {
          editor.actions.setItemColor(option.id, color);
        },
        onSetImage: (image) => {
          editor.actions.setItemImage(option.id, image);
        },
        onRemove: () => {
          editor.actions.removeItem(option.id);
        },
        openPicker,

        //TODO: toggleScorability
      },
    };
  };

  // const footer = fullyKeyed ? (
  //   answerSum === totalPoints ? (
  //     <p>
  //       Scored when a player&apos;s split lands within ±{question.tolerancePerOption.toString()} of
  //       every option&apos;s answer.
  //     </p>
  //   ) : (
  //     <ScoringFooter
  //       visible
  //       message={`The answers sum to ${answerSum.toString()}, not the ${totalPoints.toString()}-point pool — adjust them to match.`}
  //     />
  //   )
  // ) : (
  //   <ScoringFooter
  //     visible
  //     message="Set the correct points for every option to make this slide scoreable."
  //   />
  // );

  // Where does this go?  poolShareSeed={answerSeed}

  // onScheduleLabel={(text) => {
  //   editor.scheduleOptionText(option.id, text);
  // }}
  // onFlush={editor.flush}

  // openPicker={openPicker}

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
      // footer={footer}
    >
      <SlideContent>
        <SlideContentSection>
          <SlideContentSection.Header>
            {" "}
            <span>Pool</span>{" "}
            <span className={styles.poolBadge}>
              <strong>{totalPoints}</strong> pts across {options.length} options
            </span>
          </SlideContentSection.Header>
          <SlideContentSection.Body>
            {" "}
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
                <SortableItemBankRow key={option.id} {...OptionToEditableItem(option, index)} />
              ))}
              <AddItemCard
                label={
                  editor.state.canAddItem
                    ? "Add option"
                    : `Maximum ${MAX_ALLOCATION_OPTIONS.toString()} options`
                }
                disabled={!editor.state.canAddItem}
                onAdd={editor.actions.addItem}
              />{" "}
            </DragDropWrapper>
          </SlideContentSection.Body>
        </SlideContentSection>
      </SlideContent>
    </SlideWrapper>
  );
};

export { AllocationSlideContent };
