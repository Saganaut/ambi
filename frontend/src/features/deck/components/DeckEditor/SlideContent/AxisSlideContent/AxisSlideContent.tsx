/**
 * Author surface for an Axis slide (AxisContent) — a free-form 2D placement
 * round: players drag items anywhere on an X × Y plane whose axes carry
 * low/high endpoint labels.
 *
 * Grading is INSIDE_RADIUS (every keyed item must land within tolerance), so
 * the footer nudges until every item has a target — but only nudges: an empty
 * answer key is a legitimate collect-only opinion plane, so nothing blocks.
 * `scoreMode` has no authoring knob.
 *
 * Each item is one `SortableItemBankRow`, whose "Set target" entry seeds the
 * plane's centre — the pointer-free placement path — and "Clear target" drops
 * the point again.
 */
import { resolveDatumColor } from "@/shared/components/Charts/optionPalette";
import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { DragDropWrapper } from "@components/Wrappers/DragDropWrapper";
import {
  AXIS_TOLERANCE_MAX,
  AXIS_TOLERANCE_MIN,
  MAX_AXIS_ITEMS,
  useAxisEditor,
} from "@deck/hooks/useAxisEditor";
import { EmptySelect, ScoringFooter, ToleranceField, useSlideComposerState } from "../_shared";
import shared from "../_shared/_shared.module.css";
import { AddItemCard } from "../_shared/AddItemCard/AddItemCard";
import { SortableItemBankRow } from "../_shared/ItemBankRow/ItemBankRow";
import type { SlideContentProps } from "../slideContentProps";
import { SlideContent, SlideContentSection } from "../SlideContentSection";
import { SlideWrapper } from "../SlideWrapper";
import { AxisPlaneEditor } from "./AxisPlaneEditor";

const AxisSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const editor = useAxisEditor(deckId, slideId);
  const { question } = editor;
  const openPicker = useGalleryPicker();
  const composer = useSlideComposerState(question);

  if (!question) return <EmptySelect title="Axis" />;

  const { items, correctPositions, tolerance } = question;
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
        value: composer.prompt,
        placeholder: "Ask players to place the items on the plane…",
        onChange: (html) => {
          composer.setPrompt(html);
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
              selectedItemId={composer.selectedItemId}
              onToggleSelect={(itemId) => {
                composer.setSelectedItemId((held) => (held === itemId ? null : itemId));
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
                  type="placement"
                  key={item.id}
                  item={item}
                  index={index}
                  color={resolveDatumColor(item.color, index)}
                  hasTarget={correctPositions[item.id] != null}
                  selected={composer.selectedItemId === item.id}
                  menuOpen={composer.openMenuId === item.id}
                  canRemove={editor.canRemoveItem}
                  onSelect={() => {
                    selectItem(item.id);
                  }}
                  onMenuOpenChange={(open) => {
                    composer.setOpenMenuId(open ? item.id : null);
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
                  onSetTargetPosition={(point) => {
                    editor.setTargetPosition(item.id, point);
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
