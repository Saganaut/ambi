/**
 * Author surface for a Grid slide (GridContent) — a drag-into-matrix round:
 * players drag items from a shuffled bank into cells of a labeled rows ×
 * columns grid.
 *
 * Layout (mirrors Axis and Place-on-Image):
 *   - Prompt at the top (stored on the slide title, like TEXT/MCQ).
 *   - "Grid" and "Items" cards sit side by side (wrapping on narrow
 *     containers) so the matrix and its bank read as one workspace.
 *   - "Grid" card: the matrix itself — column headers and row labels edited in
 *     place (hover one for its delete ×), "+" affordances to append a column
 *     or a row, and each cell holding the chips of the items targeted at it;
 *     the header holds the "N of M placed" counter.
 *   - "Items" card: one row per item in its resolved color (override or
 *     palette default, mirrored by the item's chip in the matrix), each with
 *     its cell name — or "Unplaced" — as trailing meta. The list IS the bank:
 *     an item lives here whether or not it is placed, and `correctCells` maps
 *     item id → "rowIndex,colIndex" for the placed ones.
 *
 * Placement has two inputs, both resolved here. Arm-then-click: selecting a
 * row arms that item, and a cell's "Place here" button places it — the
 * pointer-free path. Drag: a row's grip drops the item onto any cell, and a
 * placed chip moves between cells or lands on the "Items" column to unplace.
 * One `DragDropProvider` spans both columns; because an item is draggable from
 * its row AND its chip, the chip's dnd id is prefixed (see `gridDragIds.ts`).
 *
 * Grading is EXACT (every placement must match `correctCells`), so the footer
 * nudges until every item has a cell; `scoreMode` has no authoring knob.
 */
import { ArrowUturnLeftIcon } from "@heroicons/react/24/outline";
import { PlusIcon } from "@heroicons/react/24/solid";
import { DragDropProvider, type DragEndEvent } from "@dnd-kit/react";
import { Fragment, type CSSProperties } from "react";

import { resolveDatumColor } from "@/shared/components/Charts/optionPalette";
import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import {
  GRID_ITEM_LABEL_MAX,
  MAX_GRID_ITEMS,
  cellId,
  parseCell,
  useGridEditor,
} from "@deck/hooks/useGridEditor";
import type { GridItem } from "@deck/store/deckApi.gen";
import { BANK_DROPPABLE_ID, resolveDragEnd } from "@utils/dragDrop";
import {
  DraggablePlacementRow,
  EmptySelect,
  ItemList,
  ScoringFooter,
  SettingsCard,
  useSlideComposerState,
} from "../_shared";
import shared from "../_shared/_shared.module.css";
import type { SlideContentProps } from "../slideContentProps";
import { SlideContentWrapper } from "../SlideContentWrapper";
import { GridAxisLabel } from "./GridAxisLabel";
import { GridCellChip } from "./GridCellChip";
import { GridCellEditable } from "./GridCellEditable";
import { GridItemBank } from "./GridItemBank";
import { itemIdFromDragId } from "./gridDragIds";
import styles from "./GridSlideContent.module.css";

/** Display name for an axis label, falling back to its 1-based position. */
const labelOr = (labels: string[], index: number, axisName: string): string =>
  labels[index]?.trim() || `${axisName} ${(index + 1).toString()}`;

/** Display name for an item, falling back to its 1-based position. */
const itemNameOf = (item: GridItem, index: number): string =>
  item.label?.trim() || `Item ${(index + 1).toString()}`;

const GridSlideContent = ({ deckId, slideId }: SlideContentProps) => {
  const editor = useGridEditor(deckId, slideId);
  const { question } = editor;
  const openPicker = useGalleryPicker();
  const composer = useSlideComposerState(question);

  if (!question) return <EmptySelect title="Grid" />;

  const { rowLabels, colLabels, items, correctCells } = question;

  const placedCount = items.filter((item) => item.id && correctCells[item.id]).length;
  const fullyPlaced = items.length > 0 && placedCount === items.length;

  /** Human name of a cell id, e.g. "Forest × Small". */
  const cellNameOf = (cell: string): string => {
    const { row, col } = parseCell(cell);
    return `${labelOr(rowLabels, row, "Row")} × ${labelOr(colLabels, col, "Column")}`;
  };

  // The armed item — the one a cell's "Place here" button would place.
  const armedIndex = items.findIndex(
    (item) => item.id != null && item.id === composer.selectedItemId,
  );
  const armedItem = armedIndex >= 0 ? items[armedIndex] : undefined;
  const armedItemName = armedItem ? itemNameOf(armedItem, armedIndex) : null;

  const removeItem = (itemId: string | undefined) => {
    editor.removeItem(itemId);
    if (itemId && composer.selectedItemId === itemId) composer.setSelectedItemId(null);
  };

  // Drops land either on a cell (place/move) or on the "Items" column (unplace);
  // the dragged item may have come from its row or from its placed chip.
  const handleDragEnd = (event: DragEndEvent) => {
    const drop = resolveDragEnd(event);
    if (!drop) return;
    const itemId = itemIdFromDragId(drop.itemId);
    const current = correctCells[itemId];
    if (drop.targetId === BANK_DROPPABLE_ID) {
      if (current == null) return;
      editor.setTargetCell(itemId, null);
      return;
    }
    if (current === drop.targetId) return;
    editor.setTargetCell(itemId, drop.targetId);
  };

  return (
    <SlideContentWrapper
      prompt={{
        idBase: `grid-${question.id}`,
        value: composer.prompt,
        placeholder: "Ask players to sort the items into the grid…",
        onChange: (html) => {
          composer.setPrompt(html);
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
            message="Place every item in a cell to make this slide scoreable."
          />
        )
      }
    >
      {/* DragDropProvider directly (not DragDropWrapper): this is a free drag
          onto droppable cells and the item bank, not a single-list reorder.
          It spans both columns so a chip can be dragged out of the matrix and
          onto the "Items" column to unplace it. */}
      <DragDropProvider onDragEnd={handleDragEnd}>
        <div className={shared.editorRow}>
          <div className={shared.editorColumnWide}>
            <SettingsCard
              title="Grid"
              action={
                <span className={shared.placedCount}>
                  {placedCount} of {items.length} placed
                </span>
              }
            >
              <div
                className={styles.matrix}
                style={{ "--grid-cols": colLabels.length } as CSSProperties}
              >
                <span />
                {colLabels.map((label, col) => (
                  <GridAxisLabel
                    key={`${question.id}-col-${col.toString()}-${colLabels.length.toString()}`}
                    axis="col"
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
                      type="button"
                      className={styles.axisAdd}
                      aria-label="Add column"
                      onClick={() => {
                        editor.addLabel("col");
                      }}
                    >
                      <PlusIcon className={styles.axisAddIcon} aria-hidden="true" />
                    </button>
                  )}
                </span>
                {rowLabels.map((rowLabel, row) => (
                  <Fragment
                    key={`${question.id}-row-${row.toString()}-${rowLabels.length.toString()}`}
                  >
                    <GridAxisLabel
                      axis="row"
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
                      const placed = items.filter(
                        (item) => item.id && correctCells[item.id] === cell,
                      );
                      return (
                        <GridCellEditable
                          key={cell}
                          cell={cell}
                          cellName={cellNameOf(cell)}
                          hasItems={placed.length > 0}
                          armedItemName={armedItemName}
                          onPlaceArmed={() => {
                            editor.setTargetCell(composer.selectedItemId ?? undefined, cell);
                          }}
                        >
                          {placed.map((item) => {
                            const index = items.indexOf(item);
                            return (
                              <GridCellChip
                                key={item.id}
                                item={item}
                                index={index}
                                color={resolveDatumColor(item.color, index)}
                                selected={item.id === composer.selectedItemId}
                                onSelect={() => {
                                  composer.setSelectedItemId((held) =>
                                    held === item.id ? null : (item.id ?? null),
                                  );
                                }}
                              />
                            );
                          })}
                        </GridCellEditable>
                      );
                    })}
                    <span />
                  </Fragment>
                ))}
                {editor.canAddLabel("row") && (
                  <button
                    type="button"
                    className={styles.rowAdd}
                    aria-label="Add row"
                    onClick={() => {
                      editor.addLabel("row");
                    }}
                  >
                    <PlusIcon className={styles.axisAddIcon} aria-hidden="true" />
                    <span>Add row</span>
                  </button>
                )}
              </div>
            </SettingsCard>
          </div>

          <div className={shared.editorColumnNarrow}>
            <SettingsCard
              title="Items"
              action={
                <span className={shared.cardHeaderHint}>
                  Select a row, then click a cell — or drag its grip.
                </span>
              }
            >
              <ItemList
                addLabel={
                  editor.canAddItem ? "Add item" : `Maximum ${MAX_GRID_ITEMS.toString()} items`
                }
                canAdd={editor.canAddItem}
                onAdd={() => {
                  editor.addItem();
                }}
              >
                <GridItemBank>
                  {items.map((item, index) => {
                    const cell = item.id != null ? correctCells[item.id] : undefined;
                    return (
                      <DraggablePlacementRow
                        key={item.id ?? index}
                        item={item}
                        index={index}
                        color={resolveDatumColor(item.color, index)}
                        itemNoun="Item"
                        labelMaxLength={GRID_ITEM_LABEL_MAX}
                        gripLabel={`Drag item ${(index + 1).toString()} onto a cell`}
                        selected={item.id != null && composer.selectedItemId === item.id}
                        menuOpen={item.id != null && composer.openMenuId === item.id}
                        canRemove={editor.canRemoveItem}
                        meta={
                          <span className={styles.rowMeta}>
                            {cell == null ? "Unplaced" : cellNameOf(cell)}
                          </span>
                        }
                        primaryAction={
                          cell == null
                            ? undefined
                            : {
                                label: "Clear cell",
                                icon: ArrowUturnLeftIcon,
                                pressed: true,
                                onSelect: () => {
                                  composer.setOpenMenuId(null);
                                  editor.setTargetCell(item.id, null);
                                },
                              }
                        }
                        onSelect={() => {
                          if (item.id) composer.setSelectedItemId(item.id);
                        }}
                        onMenuOpenChange={(open) => {
                          composer.setOpenMenuId(open ? (item.id ?? null) : null);
                          if (open && item.id) composer.setSelectedItemId(item.id);
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
                </GridItemBank>
              </ItemList>
            </SettingsCard>
          </div>
        </div>
      </DragDropProvider>
    </SlideContentWrapper>
  );
};

export { GridSlideContent };
