/**
 * Author surface for an Axis slide (AxisContent) — a free-form 2D placement
 * round: players drag items anywhere on an X × Y plane whose axes carry
 * low/high endpoint labels.
 *
 * Layout:
 *   - Prompt at the top (stored on the slide title, like TEXT/MCQ).
 *   - "Plane" card: the near-square plane framed by the four endpoint-label
 *     pills, an "N of M placed" counter, and the per-slide tolerance slider
 *     (2–50 %) — every placed target's circle resizes live.
 *   - "Items" card: the item rows, each in its palette color (mirrored by its
 *     marker on the plane) with the accessible numeric X/Y fallback —
 *     `correctPositions` maps item id → normalized point.
 *
 * Interaction: selecting a row (click, or focusing its label) arms the plane —
 * pressing/dragging on the plane places that item's target. Focusing a row's
 * label also opens its popover menu (clear target / delete), the same
 * focus-opened menu pattern as MCQ options; this composer owns which menu is
 * open (at most one) and which row is selected.
 *
 * Grading is INSIDE_RADIUS (every keyed item must land within tolerance), so
 * the footer nudges until every item has a target — but only nudges: an empty
 * answer key is a legitimate collect-only opinion plane, so nothing blocks.
 * `scoreMode` has no authoring knob. Per-item images are deferred with the
 * same presigned-image work as grid item images.
 */
import { useState } from "react";

import { DragDropWrapper } from "@components/Wrappers/DragDropWrapper";
import {
  AXIS_TOLERANCE_MAX,
  AXIS_TOLERANCE_MIN,
  MAX_AXIS_ITEMS,
  useAxisEditor,
} from "@deck/hooks/useAxisEditor";
import { SlideContentWrapper } from "../SlideContentWrapper";
import { EmptySelect, ItemList, ScoringFooter, SettingsCard } from "../_shared";
import { resolveOptionColor } from "../_shared/McqOptionEditable/optionColor";
import type { SlideContentProps } from "../slideContentProps";
import { AxisItemEditable } from "./AxisItemEditable";
import { AxisPlaneEditor } from "./AxisPlaneEditor";
import styles from "./AxisSlideContent.module.css";

const AxisSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const editor = useAxisEditor(deckId, slideId);
  const { question } = editor;

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

  if (!question) return <EmptySelect title='Axis' />;

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
            message='Set a target position for every item to make this slide scoreable.'
          />
        )
      }>
      <SettingsCard
        title='Plane'
        action={
          <span className={styles.placedCount}>
            {placedCount} of {items.length} placed
          </span>
        }>
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
        <div className={styles.toleranceRow}>
          <label htmlFor={`axis-tolerance-${question.id}`}>Tolerance</label>
          <input
            id={`axis-tolerance-${question.id}`}
            type='range'
            min={Math.round(AXIS_TOLERANCE_MIN * 100)}
            max={Math.round(AXIS_TOLERANCE_MAX * 100)}
            step={1}
            value={tolerancePercent}
            onChange={(event) => {
              editor.setTolerance(Number(event.target.value) / 100);
            }}
          />
          <span className={styles.toleranceValue}>±{tolerancePercent}%</span>
        </div>
      </SettingsCard>

      <SettingsCard
        title='Items'
        action={
          <span className={styles.itemsHint}>
            Select a row, then drag on the plane to place its target.
          </span>
        }>
        <ItemList
          addLabel={
            editor.canAddItem ? "Add item" : `Maximum ${MAX_AXIS_ITEMS.toString()} items`
          }
          canAdd={editor.canAddItem}
          onAdd={editor.addItem}>
          <DragDropWrapper onReorder={editor.handleItemDragEnd}>
            {items.map((item, index) => (
              <AxisItemEditable
                key={item.id ?? index}
                item={item}
                sortIndex={index}
                targetPosition={item.id ? (correctPositions[item.id] ?? null) : null}
                color={resolveOptionColor(undefined, index)}
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
                onRemove={() => {
                  removeItem(item.id);
                }}
              />
            ))}
          </DragDropWrapper>
        </ItemList>
      </SettingsCard>
    </SlideContentWrapper>
  );
};

export { AxisSlideContent };
