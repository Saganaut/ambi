import { resolveDatumColor } from "@/shared/components/Charts/optionPalette";
import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { DragDropWrapper } from "@components/Wrappers/DragDropWrapper";
import {
  AXIS_TOLERANCE_MAX,
  AXIS_TOLERANCE_MIN,
  MAX_AXIS_ITEMS,
  useAxisEditor,
} from "@deck/hooks/useAxisEditor";
import { EmptySelect, ScoringFooter, ToleranceField } from "../_shared";
import shared from "../_shared/_shared.module.css";
import { AddItemCard } from "../_shared/AddItemCard/AddItemCard";
import { SlideContentProps } from "../_shared/Item.types";
import { SortableItemBankRow } from "../_shared/ItemBankRow/ItemBankRow";
import { SlideContent, SlideContentSection } from "../SlideContentSection";
import { SlideWrapper } from "../SlideWrapper";
import { AxisPlaneEditor } from "./AxisPlaneEditor";
import { useAxisDraft } from "./useAxisDraft";

const AxisSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const editor = useAxisEditor(deckId, slideId);
  const { question } = editor;
  const openPicker = useGalleryPicker(deckId);
  const { prompt, tolerance, setPrompt, setTolerance, openMenuId, setOpenMenuId } = useAxisDraft({
    question,
  });

  if (!question) return <EmptySelect title="Axis" />;

  const { items, correctPositions } = question;
  const placedCount = items.filter((item) => correctPositions[item.id]).length;
  const fullyAssigned = items.length > 0 && placedCount === items.length;

  const selectItem = (itemId: string | undefined) => {
    if (itemId) composer.setSelectedItemId(itemId);
  };

  const removeItem = (itemId: string | undefined) => {
    editor.removeItem(itemId);
    if (itemId && composer.selectedItemId === itemId) composer.setSelectedItemId(null);
  };

  return (
    <SlideWrapper
      prompt={{
        idBase: `axis-${question.id}`,
        value: prompt,
        placeholder: "Ask players to place the items on the plane…",
        onChange: (html) => {
          setPrompt(html);
          editor.schedulePrompt(html);
        },
        onBlur: editor.flush,
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
                onChange={editor.setTolerance}
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
              onScheduleAxisLabel={editor.scheduleAxisLabel}
              onSetTargetPosition={editor.setTargetPosition}
              onFlush={editor.flush}
            />
          </SlideContentSection.Body>{" "}
        </SlideContentSection>

        <SlideContentSection>
          <SlideContentSection.Header>
            <div></div>
          </SlideContentSection.Header>
          <SlideContentSection.Body>
            <DragDropWrapper onReorder={editor.handleItemDragEnd}>
              {items.map((item, index) => (
                <SortableItemBankRow
                  type="PLACEMENT"
                  key={item.id}
                  item={item}
                  index={index}
                  color={resolveDatumColor(item.color, index)}
                  hasTarget={correctPositions[item.id] != null}
                  selected={selectedItemId === item.id}
                  menuOpen={openMenuId === item.id}
                  canRemove={editor.canRemoveItem}
                  onSelect={() => {
                    selectItem(item.id);
                  }}
                  onMenuOpenChange={(open) => {
                    setOpenMenuId(open ? item.id : null);
                    if (open) selectItem(item.id);
                  }}
                  onScheduleLabel={(label) => {
                    editor.scheduleItemLabel(item.id, label);
                  }}
                  onFlush={editor.flush}
                  onSetColor={(color) => {
                    editor.setItemColor(item.id, color);
                  }}
                  onSetImage={(image) => {
                    editor.setItemImage(item.id, image);
                  }}
                  onSetTarget={() => {
                    editor.setTargetPosition(item.id, { x: 0.5, y: 0.5 });
                  }}
                  onClearTarget={() => {
                    editor.setTargetPosition(item.id, null);
                  }}
                  onRemove={() => {
                    removeItem(item.id);
                  }}
                  openPicker={openPicker}
                />
              ))}
              <AddItemCard
                label={
                  editor.canAddItem ? "Add item" : `Maximum ${MAX_AXIS_ITEMS.toString()} items`
                }
                disabled={!editor.canAddItem}
                onAdd={editor.addItem}
              />
            </DragDropWrapper>
          </SlideContentSection.Body>
        </SlideContentSection>
      </SlideContent>
    </SlideWrapper>
  );
};

export { AxisSlideContent };
