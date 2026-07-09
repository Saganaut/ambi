/**
 * Author surface for a Grid slide (GridContent) — a drag-into-matrix round:
 * players drag items from a shuffled bank into cells of a labeled rows ×
 * columns grid. Authored directly on that matrix:
 *
 *   - Prompt at the top (stored on the slide title, like TEXT/MCQ).
 *   - The matrix itself: column headers and row labels edited in place
 *     (hover one for its delete ×), "+" affordances to append a column or a
 *     row, and each cell holding the item cards targeted at it — an empty
 *     cell is one big "Add item" button, a filled cell reveals a compact "+"
 *     on hover. Items are shared phrase-or-image cards (focus-opened option
 *     menu: flip face, color, image, delete) and drag between cells by their
 *     grip — `correctCells` maps item id → "rowIndex,colIndex".
 *   - An "Unplaced items" tray appears only when content carries items with
 *     no target (authored before this surface, or orphaned by a deleted
 *     row/column); drag them onto a cell to place them.
 *
 * Grading is EXACT (every placement must match `correctCells`), so the footer
 * warns until every item has a cell; `scoreMode` has no authoring knob.
 */
import { PlusIcon } from "@heroicons/react/24/solid";
import { DragDropProvider, type DragEndEvent } from "@dnd-kit/react";
import { Fragment, useState } from "react";

import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { MAX_GRID_ITEMS, cellId, useGridEditor } from "@deck/hooks/useGridEditor";
import type { GridItem } from "@deck/store/deckApi.gen";
import { SlideContentWrapper } from "../SlideContentWrapper";
import { EmptySelect, ScoringFooter, SectionHeader } from "../_shared";
import type { SlideContentProps } from "../slideContentProps";
import { GridAxisLabel } from "./GridAxisLabel";
import { GridCellEditable } from "./GridCellEditable";
import { GridItemCard } from "./GridItemCard";
import styles from "./GridSlideContent.module.css";

/** Display name for an axis label, falling back to its 1-based position. */
const labelOr = (labels: string[], index: number, axisName: string): string =>
  labels[index]?.trim() || `${axisName} ${(index + 1).toString()}`;

const GridSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const editor = useGridEditor(deckId, slideId);
  const { question } = editor;
  const openPicker = useGalleryPicker();

  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  // Which item's menu is open — at most one per slide. Focusing an item
  // card's field opens its menu (and thereby closes any other); the menu
  // owns dismissal.
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [syncedFromId, setSyncedFromId] = useState(question?.id);
  // Resync the local mirror when the active slide changes ("derive state
  // during render" — safe when the new value differs).
  if (question && syncedFromId !== question.id) {
    setSyncedFromId(question.id);
    setPrompt(question.prompt);
    setOpenMenuId(null);
  }

  if (!question) return <EmptySelect title='Grid' />;

  const { rowLabels, colLabels, items, correctCells } = question;

  const unplaced = items.filter((item) => !(item.id && correctCells[item.id]));
  const fullyPlaced = items.length > 0 && unplaced.length === 0;
  const itemsInCell = (cell: string): GridItem[] =>
    items.filter((item) => item.id && correctCells[item.id] === cell);

  // Move the dragged item to the cell it was dropped on (droppable ids are
  // cell ids); a drop outside any cell, or back on its own, is a no-op.
  const handleDragEnd = (event: DragEndEvent) => {
    if (event.canceled) return;
    const itemId = event.operation.source?.id;
    const targetCell = event.operation.target?.id;
    if (typeof itemId !== "string" || typeof targetCell !== "string") return;
    if (correctCells[itemId] === targetCell) return;
    editor.setTargetCell(itemId, targetCell);
  };

  const renderItem = (item: GridItem) => {
    const itemIndex = items.findIndex((candidate) => candidate.id === item.id);
    return (
      <GridItemCard
        key={item.id}
        item={item}
        itemIndex={itemIndex}
        menuOpen={item.id != null && openMenuId === item.id}
        canRemove={editor.canRemoveItem}
        onMenuOpenChange={(open) => {
          setOpenMenuId(open ? (item.id ?? null) : null);
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
          editor.removeItem(item.id);
        }}
        openPicker={openPicker}
      />
    );
  };

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
        fullyPlaced ? (
          <p>Scored when a player places every item on its target cell.</p>
        ) : (
          <ScoringFooter
            visible
            message='Place every item in a cell to make this slide scoreable.'
          />
        )
      }>
      <SectionHeader
        label='Grid'
        hint={`${items.length.toString()} / ${MAX_GRID_ITEMS.toString()} items · click a cell to add an item, drag its grip to move it`}
      />
      {/* DragDropProvider directly (not DragDropWrapper): this is a free
          drag onto droppable cells, not the wrapper's single-list reorder. */}
      <DragDropProvider onDragEnd={handleDragEnd}>
        <div
          className={styles.matrix}
          style={{ "--grid-cols": colLabels.length } as React.CSSProperties}>
          <span />
          {colLabels.map((label, col) => (
            <GridAxisLabel
              key={`${question.id}-col-${col.toString()}-${colLabels.length.toString()}`}
              axis='col'
              index={col}
              value={label}
              canRemove={editor.canRemoveLabel("col")}
              onScheduleLabel={(next) => {
                editor.scheduleLabel("col", col, next);
              }}
              onFlush={editor.flush}
              onRemove={() => {
                editor.removeLabel("col", col);
              }}
            />
          ))}
          <span className={styles.headerTrailer}>
            {editor.canAddLabel("col") && (
              <button
                type='button'
                className={styles.axisAdd}
                aria-label='Add column'
                onClick={() => {
                  editor.addLabel("col");
                }}>
                <PlusIcon className={styles.axisAddIcon} aria-hidden='true' />
              </button>
            )}
          </span>
          {rowLabels.map((rowLabel, row) => (
            <Fragment key={`${question.id}-row-${row.toString()}-${rowLabels.length.toString()}`}>
              <GridAxisLabel
                axis='row'
                index={row}
                value={rowLabel}
                canRemove={editor.canRemoveLabel("row")}
                onScheduleLabel={(next) => {
                  editor.scheduleLabel("row", row, next);
                }}
                onFlush={editor.flush}
                onRemove={() => {
                  editor.removeLabel("row", row);
                }}
              />
              {colLabels.map((_, col) => {
                const cell = cellId(row, col);
                const placed = itemsInCell(cell);
                return (
                  <GridCellEditable
                    key={cell}
                    cell={cell}
                    cellName={`${labelOr(rowLabels, row, "Row")} × ${labelOr(colLabels, col, "Column")}`}
                    hasItems={placed.length > 0}
                    canAddItem={editor.canAddItem}
                    onAddItem={() => {
                      editor.addItemToCell(cell);
                    }}>
                    {placed.map(renderItem)}
                  </GridCellEditable>
                );
              })}
              <span />
            </Fragment>
          ))}
          {editor.canAddLabel("row") && (
            <button
              type='button'
              className={styles.rowAdd}
              aria-label='Add row'
              onClick={() => {
                editor.addLabel("row");
              }}>
              <PlusIcon className={styles.axisAddIcon} aria-hidden='true' />
              <span>Add row</span>
            </button>
          )}
        </div>
        {unplaced.length > 0 && (
          <div className={styles.unplaced}>
            <SectionHeader
              label='Unplaced items'
              hint='drag each onto a cell to make the slide scoreable'
            />
            <div className={styles.unplacedItems}>{unplaced.map(renderItem)}</div>
          </div>
        )}
      </DragDropProvider>
    </SlideContentWrapper>
  );
};

export { GridSlideContent };
