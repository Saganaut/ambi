import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { DragDropWrapper } from "@components/Wrappers/DragDropWrapper";
import {
  AXIS_TOLERANCE_MAX,
  AXIS_TOLERANCE_MIN,
  MAX_AXIS_ITEMS,
  useAxisEditor,
} from "@deck/hooks/useAxisEditor";
import type { AxisPoint } from "@deck/store/deckApi.gen";
import { ItemToEditableAxisItem } from "../AllocationSlideContent/ItemFormatters";
import { EmptySelect, ScoringFooter, ToleranceField } from "../_shared";
import { AddItemCard } from "../_shared/AddItemCard/AddItemCard";
import { SortableItemBankRow } from "../_shared/BankItems/ItemBankRow";
import { SlideContentProps } from "../_shared/Item.types";
import shared from "../_shared/_shared.module.css";
import { SlideContent, SlideContentSection } from "../SlideContentSection";
import { SlideWrapper } from "../SlideWrapper";
import { AxisPlaneEditor } from "./AxisPlaneEditor";
import { useAxisDraft } from "./useAxisDraft";

const AxisSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const editor = useAxisEditor(deckId, slideId);
  const { question } = editor;
  const openPicker = useGalleryPicker(deckId);
  const {
    prompt,
    tolerance,
    setPrompt,
    setTolerance,
    openMenuId,
    setOpenMenuId,
    selectedItemId,
    setSelectedItemId,
  } = useAxisDraft({ question });

  if (!question) return <EmptySelect title="Axis" />;

  const { items, correctPositions } = question;
  const placedCount = items.filter((item) => correctPositions[item.id]).length;
  const fullyAssigned = items.length > 0 && placedCount === items.length;

  const setTargetPosition = (itemId: string, point: AxisPoint | null) => {
    if (point == null) {
      editor.actions.clearCorrectAnswer(itemId);
      return;
    }
    editor.actions.commitCorrectAnswer(itemId, point);
  };

  return (
    <SlideWrapper
      prompt={{
        idBase: `axis-${question.id}`,
        value: prompt,
        placeholder: "Ask players to place the items on the plane…",
        onChange: (html) => {
          setPrompt(html);
          editor.actions.scheduleQuestionPrompt(html);
        },
        onBlur: editor.actions.flush,
      }}
      footer={
        fullyAssigned ? (
          <p>Scored when a player places every item within tolerance of its target.</p>
        ) : (
          <ScoringFooter
            visible
            message="Set a target position for every item to make this slide scoreable."
          />
        )
      }
    >
      <SlideContent>
        <SlideContentSection>
          <SlideContentSection.Header>
            <span className={shared.placedCount}>
              {placedCount} of {items.length} placed
            </span>
            <span>
              <ToleranceField
                id={`axis-tolerance-${question.id}`}
                value={tolerance}
                min={AXIS_TOLERANCE_MIN}
                max={AXIS_TOLERANCE_MAX}
                onChange={(next) => {
                  setTolerance(next);
                  editor.actions.setTolerance(next);
                }}
              />
            </span>
          </SlideContentSection.Header>
          <SlideContentSection.Body>
            <AxisPlaneEditor
              question={question}
              selectedItemId={selectedItemId}
              onToggleSelect={(itemId) => {
                setSelectedItemId((held) => (held === itemId ? null : itemId));
              }}
              onScheduleAxisLabel={editor.actions.scheduleAxisLabel}
              onSetTargetPosition={setTargetPosition}
              onFlush={editor.actions.flush}
            />
          </SlideContentSection.Body>
        </SlideContentSection>

        <SlideContentSection>
          <SlideContentSection.Header>
            <div></div>
          </SlideContentSection.Header>
          <SlideContentSection.Body>
            <DragDropWrapper onReorder={editor.actions.handleItemDragEnd}>
              {items.map((item, index) => (
                <SortableItemBankRow
                  key={item.id}
                  {...ItemToEditableAxisItem(
                    item,
                    index,
                    editor.actions,
                    editor.state,
                    tolerance,
                    openPicker,
                    setOpenMenuId,
                    openMenuId,
                    selectedItemId,
                    setSelectedItemId,
                    correctPositions,
                  )}
                />
              ))}
              <AddItemCard
                label={
                  editor.state.canAddItem ? "Add item" : `Maximum ${MAX_AXIS_ITEMS.toString()} items`
                }
                disabled={!editor.state.canAddItem}
                onAdd={editor.actions.addItem}
              />
            </DragDropWrapper>
          </SlideContentSection.Body>
        </SlideContentSection>
      </SlideContent>
    </SlideWrapper>
  );
};

export { AxisSlideContent };
