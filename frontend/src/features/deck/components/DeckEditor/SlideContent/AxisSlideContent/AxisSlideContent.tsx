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
 *     palette default, mirrored by its marker on the plane) with the
 *     accessible numeric X/Y fallback — `correctPositions` maps item id →
 *     normalized point.
 *
 * Interaction: selecting a row (click, or focusing its label) arms the plane —
 * pressing/dragging on the plane places that item's target. Focusing a row's
 * label also opens its popover menu (set/clear target, color, image, delete),
 * the same focus-opened menu pattern as MCQ options; this composer owns which
 * menu is open (at most one) and which row is selected.
 *
 * Grading is INSIDE_RADIUS (every keyed item must land within tolerance), so
 * the footer nudges until every item has a target — but only nudges: an empty
 * answer key is a legitimate collect-only opinion plane, so nothing blocks.
 * `scoreMode` has no authoring knob.
 */
import { useState } from "react";

import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { DragDropWrapper } from "@components/Wrappers/DragDropWrapper";
import {
  AXIS_TOLERANCE_MAX,
  AXIS_TOLERANCE_MIN,
  MAX_AXIS_ITEMS,
  useAxisEditor,
} from "@deck/hooks/useAxisEditor";
import { EmptySelect, ItemList, ScoringFooter, SettingsCard } from "../_shared";
import type { SlideContentProps } from "../slideContentProps";
import { SlideContentWrapper } from "../SlideContentWrapper";
import { resolveAxisItemColor } from "./axisItemColor";
import { AxisItemEditable } from "./AxisItemEditable";
import { AxisPlaneEditor } from "./AxisPlaneEditor";
import styles from "./AxisSlideContent.module.css";

const AxisSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const editor = useAxisEditor(deckId, slideId);
  const { question } = editor;
  const openPicker = useGalleryPicker();

  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  // The row armed for placement on the plane, if any.
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  // Which row's menu is open — at most one per slide. Focusing a row's label
  // opens its menu (and thereby closes any other); the menu owns dismissal.
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [syncedFromId, setSyncedFromId] = useState(question?.id);
  // Resync the local mirror when the active slide changes ("derive state
  // during render" — safe when the new value differs).
  if (question && syncedFromId !== question.id) {
    setSyncedFromId(question.id);
    setPrompt(question.prompt);
    setSelectedItemId(null);
    setOpenMenuId(null);
  }

  if (!question) return <EmptySelect title="Axis" />;

  const { items, correctPositions, tolerance } = question;
  const placedCount = items.filter((item) => item.id && correctPositions[item.id]).length;
  const fullyAssigned = items.length > 0 && placedCount === items.length;
  const tolerancePercent = Math.round(tolerance * 100);

  const selectItem = (itemId: string | undefined) => {
    if (itemId) setSelectedItemId(itemId);
  };

  const removeItem = (itemId: string | undefined) => {
    editor.removeItem(itemId);
    if (itemId && selectedItemId === itemId) setSelectedItemId(null);
  };

  return (
    <SlideContentWrapper
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
      <div className={styles.editorRow}>
        <div className={styles.planeColumn}>
          <SettingsCard
            title="Plane"
            action={
              <span className={styles.planeMeta}>
                <span className={styles.placedCount}>
                  {placedCount} of {items.length} placed
                </span>
                <NumberInput
                  compact
                  id={`axis-tolerance-${question.id}`}
                  label="Tolerance %"
                  labelPosition="labelInFront"
                  min={Math.round(AXIS_TOLERANCE_MIN * 100)}
                  max={Math.round(AXIS_TOLERANCE_MAX * 100)}
                  value={tolerancePercent}
                  onChange={(next) => {
                    editor.setTolerance(next / 100);
                  }}
                />
              </span>
            }
          >
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
          </SettingsCard>
        </div>

        <div className={styles.itemsColumn}>
          <SettingsCard
            title="Items"
            action={
              <span className={styles.itemsHint}>
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
                {items.map((item, index) => (
                  <AxisItemEditable
                    key={item.id ?? index}
                    item={item}
                    sortIndex={index}
                    targetPosition={item.id ? (correctPositions[item.id] ?? null) : null}
                    color={resolveAxisItemColor(item.color, index)}
                    selected={item.id != null && selectedItemId === item.id}
                    menuOpen={item.id != null && openMenuId === item.id}
                    canRemove={editor.canRemoveItem}
                    onSelect={() => {
                      selectItem(item.id);
                    }}
                    onMenuOpenChange={(open) => {
                      setOpenMenuId(open ? (item.id ?? null) : null);
                      if (open) selectItem(item.id);
                    }}
                    onScheduleLabel={(label) => {
                      editor.scheduleItemLabel(item.id, label);
                    }}
                    onFlush={editor.flush}
                    onSetTarget={(point) => {
                      editor.setTargetPosition(item.id, point);
                    }}
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
                ))}
              </DragDropWrapper>
            </ItemList>
          </SettingsCard>
        </div>
      </div>
    </SlideContentWrapper>
  );
};

export { AxisSlideContent };
