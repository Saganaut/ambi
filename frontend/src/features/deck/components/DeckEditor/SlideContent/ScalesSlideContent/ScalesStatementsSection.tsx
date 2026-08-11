/**
 * The Scales editor's statement bank: one editable row per statement, each
 * repeating the scale as a drag track for that statement's target.
 *
 * Shared by the editing plane and the diverging bar's legend, so a statement
 * carries the same row, the same ordering and the same add affordance whichever
 * results view is on the canvas.
 */
import { DragDropWrapper } from "@components/Wrappers/DragDropWrapper";
import { MAX_SCALE_STATEMENTS } from "@deck/hooks/useScalesEditor";
import { AddItemCard, SortableItemBankRow } from "../_shared";
import { ItemToEditableScalesItem } from "../AllocationSlideContent/ItemFormatters";
import { SlideContentSection } from "../SlideContentSection";
import type { RenderScalesResultsDisplayOptions } from "./scalesResults.types";

const ScalesStatementsSection = ({
  editor,
  question,
  openPicker,
  openMenuId,
  setOpenMenuId,
  min,
  max,
  leftLabel,
  rightLabel,
}: RenderScalesResultsDisplayOptions) => (
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
);

export { ScalesStatementsSection };
