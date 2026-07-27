/**
 * Author surface for an Axis slide (AxisContent) — a free-form 2D placement
 * round: players drag items anywhere on an X × Y plane whose axes carry
 * low/high endpoint labels.
 *
 * Layout:
 *   - Prompt at the top (stored on the slide title, like TEXT/MCQ).
 *   - "Plane" and "Items" cards sit side by side (wrapping on narrow
 *     containers) so the plane and the bank read as one workspace.
 *   - "Plane" card: the near-square plane with the four endpoint-label pills
 *     overlaid inside its edges; the header holds the "N of M placed" counter
 *     and the tolerance percent input (2–50 %) — every placed target's circle
 *     resizes live.
 *   - "Items" card: the item rows, each in its resolved color (override or
 *     palette default, mirrored by its marker on the plane) — `correctPositions`
 *     maps item id → normalized point.
 *
 * Interaction: selecting a row (click, or focusing its label) arms the plane —
 * pressing/dragging on the plane places that item's target. Focusing a row's
 * label also opens its popover menu (set/clear target, color, image, delete),
 * the same focus-opened menu pattern as MCQ options; "Set target" seeds the
 * plane's centre, which is the pointer-free placement path. This composer owns
 * which menu is open (at most one) and which row is selected.
 *
 * Grading is INSIDE_RADIUS (every keyed item must land within tolerance), so
 * the footer nudges until every item has a target — but only nudges: an empty
 * answer key is a legitimate collect-only opinion plane, so nothing blocks.
 * `scoreMode` has no authoring knob.
 */
import { ArrowUturnLeftIcon, ViewfinderCircleIcon } from "@heroicons/react/24/outline";

import { resolveDatumColor } from "@/shared/components/Charts/optionPalette";
import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { DragDropWrapper } from "@components/Wrappers/DragDropWrapper";
import {
  AXIS_LABEL_MAX,
  AXIS_TOLERANCE_MAX,
  AXIS_TOLERANCE_MIN,
  MAX_AXIS_ITEMS,
  useAxisEditor,
} from "@deck/hooks/useAxisEditor";
import {
  EmptySelect,
  ItemList,
  ScoringFooter,
  SettingsCard,
  SortablePlacementRow,
  ToleranceField,
  useSlideComposerState,
} from "../_shared";
import shared from "../_shared/_shared.module.css";
import type { SlideContentProps } from "../slideContentProps";
import { SlideContentWrapper } from "../SlideContentWrapper";
import { AxisPlaneEditor } from "./AxisPlaneEditor";

const AxisSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const editor = useAxisEditor(deckId, slideId);
  const { question } = editor;
  const openPicker = useGalleryPicker();
  const composer = useSlideComposerState(question);

  if (!question) return <EmptySelect title="Axis" />;

  const { items, correctPositions, tolerance } = question;
  const placedCount = items.filter((item) => item.id && correctPositions[item.id]).length;
  const fullyAssigned = items.length > 0 && placedCount === items.length;

  const selectItem = (itemId: string | undefined) => {
    if (itemId) composer.setSelectedItemId(itemId);
  };

  const removeItem = (itemId: string | undefined) => {
    editor.removeItem(itemId);
    if (itemId && composer.selectedItemId === itemId) composer.setSelectedItemId(null);
  };

  return (
    <SlideContentWrapper
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
      <div className={shared.editorRow}>
        <div className={shared.editorColumnWide}>
          <SettingsCard
            title="Plane"
            action={
              <span className={shared.cardHeaderMeta}>
                <span className={shared.placedCount}>
                  {placedCount} of {items.length} placed
                </span>
                <ToleranceField
                  id={`axis-tolerance-${question.id}`}
                  value={tolerance}
                  min={AXIS_TOLERANCE_MIN}
                  max={AXIS_TOLERANCE_MAX}
                  onChange={editor.setTolerance}
                />
              </span>
            }
          >
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
          </SettingsCard>
        </div>

        <div className={shared.editorColumnNarrow}>
          <SettingsCard
            title="Items"
            action={
              <span className={shared.cardHeaderHint}>
                Select a row, then drag on the plane to place its target.
              </span>
            }
          >
            <ItemList
              addLabel={
                editor.canAddItem ? "Add item" : `Maximum ${MAX_AXIS_ITEMS.toString()} items`
              }
              canAdd={editor.canAddItem}
              onAdd={editor.addItem}
            >
              <DragDropWrapper onReorder={editor.handleItemDragEnd}>
                {items.map((item, index) => {
                  const hasTarget = item.id != null && correctPositions[item.id] != null;
                  return (
                    <SortablePlacementRow
                      key={item.id ?? index}
                      item={item}
                      index={index}
                      color={resolveDatumColor(item.color, index)}
                      itemNoun="Item"
                      labelMaxLength={AXIS_LABEL_MAX}
                      gripLabel={`Reorder item ${(index + 1).toString()}`}
                      selected={item.id != null && composer.selectedItemId === item.id}
                      menuOpen={item.id != null && composer.openMenuId === item.id}
                      canRemove={editor.canRemoveItem}
                      primaryAction={{
                        label: hasTarget ? "Clear target" : "Set target",
                        icon: hasTarget ? ArrowUturnLeftIcon : ViewfinderCircleIcon,
                        pressed: hasTarget,
                        onSelect: () => {
                          composer.setOpenMenuId(null);
                          // Seed a fresh target at the plane's centre; the
                          // author drags the exact spot from there.
                          editor.setTargetPosition(item.id, hasTarget ? null : { x: 0.5, y: 0.5 });
                        },
                      }}
                      onSelect={() => {
                        selectItem(item.id);
                      }}
                      onMenuOpenChange={(open) => {
                        composer.setOpenMenuId(open ? (item.id ?? null) : null);
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
                      onRemove={() => {
                        removeItem(item.id);
                      }}
                      openPicker={openPicker}
                    />
                  );
                })}
              </DragDropWrapper>
            </ItemList>
          </SettingsCard>
        </div>
      </div>
    </SlideContentWrapper>
  );
};

export { AxisSlideContent };
