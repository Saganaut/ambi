/**
 * Author surface for a Grid slide (GridContent) — a drag-into-matrix round:
 * players drag items from a shuffled bank into cells of a labeled rows ×
 * columns grid.
 *
 * Layout:
 *   - Prompt at the top (stored on the slide title, like TEXT/MCQ).
 *   - "Matrix" card: the row and column label lists (1–6 each) plus a live
 *     preview matrix showing where the assigned items land.
 *   - "Items" card: the draggable items, each with a target-cell dropdown —
 *     `correctCells` maps item id → "rowIndex,colIndex".
 *
 * Grading is EXACT (every placement must match `correctCells`), so the footer
 * warns until every item has a target; `scoreMode` has no authoring knob.
 * Per-item images (`GridItem.image`) are not authored yet — deferred with the
 * presigned-image-over-STOMP work, since the live board couldn't show them.
 */
import { useState } from "react";

import { DragDropWrapper } from "@components/Wrappers/DragDropWrapper";
import { MAX_GRID_ITEMS, parseCell, useGridEditor } from "@deck/hooks/useGridEditor";
import { SlideContentWrapper } from "../SlideContentWrapper";
import { EmptySelect, ItemList, ScoringFooter, SettingsCard, SettingsRow } from "../_shared";
import type { SlideContentProps } from "../slideContentProps";
import { GridItemEditable } from "./GridItemEditable";
import { GridLabelsEditor } from "./GridLabelsEditor";
import styles from "./GridSlideContent.module.css";

/** Display name for an axis label, falling back to its 1-based position. */
const labelOr = (labels: string[], index: number, axisName: string): string =>
  labels[index]?.trim() || `${axisName} ${(index + 1).toString()}`;

const GridSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const editor = useGridEditor(deckId, slideId);
  const { question } = editor;

  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  const [syncedFromId, setSyncedFromId] = useState(question?.id);
  // Resync the local mirror when the active slide changes ("derive state
  // during render" — safe when the new value differs).
  if (question && syncedFromId !== question.id) {
    setSyncedFromId(question.id);
    setPrompt(question.prompt);
  }

  if (!question) return <EmptySelect title='Grid' />;

  const { rowLabels, colLabels, items, correctCells } = question;
  const assignedCount = items.filter((item) => item.id && correctCells[item.id]).length;
  const fullyAssigned = items.length > 0 && assignedCount === items.length;

  // Item labels grouped by their target cell, for the preview matrix.
  const itemsInCell = (row: number, col: number): string[] =>
    items.flatMap((item, index) => {
      const cell = item.id ? correctCells[item.id] : undefined;
      if (!cell) return [];
      const target = parseCell(cell);
      if (target.row !== row || target.col !== col) return [];
      return [item.label?.trim() || `Item ${(index + 1).toString()}`];
    });

  return (
    <SlideContentWrapper
      prompt={{
        idBase: `grid-${question.id}`,
        value: prompt,
        placeholder: "Ask players to sort the items into the grid…",
        onChange: (html) => {
          setPrompt(html);
          editor.schedulePrompt(html);
        },
        onBlur: editor.flush,
      }}
      footer={
        fullyAssigned ? (
          <p>Scored when a player places every item on its target cell.</p>
        ) : (
          <ScoringFooter
            visible
            message='Assign a target cell to every item to make this slide scoreable.'
          />
        )
      }>
      <SettingsCard title='Matrix'>
        <SettingsRow>
          <GridLabelsEditor axis='row' title='Rows' editor={editor} slideId={question.id} />
          <GridLabelsEditor axis='col' title='Columns' editor={editor} slideId={question.id} />
        </SettingsRow>
        <div
          className={styles.preview}
          style={{ "--preview-cols": colLabels.length } as React.CSSProperties}
          aria-hidden='true'>
          <span />
          {colLabels.map((_, col) => (
            <span key={`col-${col.toString()}`} className={styles.previewHeader}>
              {labelOr(colLabels, col, "Column")}
            </span>
          ))}
          {rowLabels.map((_, row) => [
            <span key={`row-${row.toString()}`} className={styles.previewHeader}>
              {labelOr(rowLabels, row, "Row")}
            </span>,
            ...colLabels.map((__, col) => (
              <span
                key={`cell-${row.toString()}-${col.toString()}`}
                className={styles.previewCell}>
                {itemsInCell(row, col).map((label) => (
                  <span key={label} className={styles.previewChip}>
                    {label}
                  </span>
                ))}
              </span>
            )),
          ])}
        </div>
      </SettingsCard>

      <SettingsCard title='Items'>
        <ItemList
          addLabel={
            editor.canAddItem ? "Add item" : `Maximum ${MAX_GRID_ITEMS.toString()} items`
          }
          canAdd={editor.canAddItem}
          onAdd={editor.addItem}>
          <DragDropWrapper onReorder={editor.handleItemDragEnd}>
            {items.map((item, index) => (
              <GridItemEditable
                key={item.id ?? index}
                item={item}
                sortIndex={index}
                rowLabels={rowLabels}
                colLabels={colLabels}
                targetCell={item.id ? (correctCells[item.id] ?? null) : null}
                canRemove={editor.canRemoveItem}
                onScheduleLabel={(label) => {
                  editor.scheduleItemLabel(item.id, label);
                }}
                onFlush={editor.flush}
                onSetTarget={(cell) => {
                  editor.setTargetCell(item.id, cell);
                }}
                onRemove={() => {
                  editor.removeItem(item.id);
                }}
              />
            ))}
          </DragDropWrapper>
        </ItemList>
      </SettingsCard>
    </SlideContentWrapper>
  );
};

export { GridSlideContent };
