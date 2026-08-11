/**
 * The Axis slide's target-editing surface — the plane an author places targets
 * on, its tolerance control, and the item bank beneath it. It is what the
 * canvas shows whenever no results visualisation is previewed, so it is the
 * placement pair's counterpart of MCQ's `DefaultResultsDisplay`.
 */
import { DragDropWrapper } from "@components/Wrappers/DragDropWrapper";
import { AXIS_TOLERANCE_MAX, AXIS_TOLERANCE_MIN, MAX_AXIS_ITEMS } from "@deck/hooks/useAxisEditor";
import type { AxisPoint } from "@deck/store/deckApi.gen";
import { AddItemCard, SortableItemBankRow, ToleranceField } from "../_shared";
import shared from "../_shared/_shared.module.css";
import type { AxisResultsDisplayOptions } from "../_shared/placement/placementResults.types";
import { ItemToEditableAxisItem } from "../AllocationSlideContent/ItemFormatters";
import { SlideContent, SlideContentSection } from "../SlideContentSection";
import { AxisPlaneEditor } from "./AxisPlaneEditor";

const AxisTargetsDisplay = ({
  question,
  editor,
  openPicker,
  openMenuId,
  setOpenMenuId,
  selectedItemId,
  setSelectedItemId,
  tolerance,
  setTolerance,
}: AxisResultsDisplayOptions) => {
  const { items, correctPositions } = question;
  const placedCount = items.filter((item) => correctPositions[item.id]).length;

  const setTargetPosition = (itemId: string, point: AxisPoint | null) => {
    if (point == null) {
      editor.actions.clearCorrectAnswer(itemId);
      return;
    }
    editor.actions.commitCorrectAnswer(itemId, point);
  };

  return (
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
  );
};

export { AxisTargetsDisplay };
