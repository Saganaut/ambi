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
 *     palette default, mirrored by the item's chip in the matrix), a placed
 *     one carrying its cell name as trailing meta plus the row's "answer set"
 *     check — an unplaced item shows the question mark the same row offers on
 *     Axis. The list IS the bank: an item lives here whether or not it is
 *     placed, and `correctCells` maps item id → "rowIndex,colIndex" for the
 *     placed ones. The row's toggle (and its menu's Set/Clear target entry)
 *     clears a placed item; on an unplaced one it only ARMS the item, because
 *     a grid has no centre cell to seed — the author then names the cell.
 *
 * Placement has two inputs, both resolved here. Arm-then-click: selecting a
 * row arms that item, and a cell's "Place here" button places it — the
 * pointer-free path. Press-drag (the same gesture the Axis plane uses, resolved
 * to a cell instead of a point — see `useGridCellPlacement`): with an item
 * armed, a press anywhere on the matrix carries its ghost to the cell released
 * over, and a placed chip is pressed and dragged straight to another cell — or
 * off the matrix, which unplaces it. Releasing over no cell abandons a fresh
 * placement without writing.
 *
 * The two inputs can fire for one gesture (an empty cell IS its "Place here"
 * button, so a click on it is also a press on the matrix), hence the single
 * `assignCell` both go through: re-placing an item where it already sits is a
 * no-op, so the redundant half writes nothing.
 *
 * Grading is EXACT (every placement must match `correctCells`), so the footer
 * nudges until every item has a cell; `scoreMode` has no authoring knob.
 */
import { PlusIcon } from "@heroicons/react/24/solid";
import { Fragment, type CSSProperties } from "react";

import { resolveDatumColor } from "@/shared/components/Charts/optionPalette";
import { useGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { DragDropWrapper } from "@components/Wrappers/DragDropWrapper";
import { MAX_GRID_ITEMS, cellId, parseCell, useGridEditor } from "@deck/hooks/useGridEditor";
import type { GridItem } from "@deck/store/deckApi.gen";
import {
  AddItemCard,
  EmptySelect,
  ScoringFooter,
  SettingsCard,
  useSlideComposerState,
} from "../_shared";
import shared from "../_shared/_shared.module.css";
import { SortableItemBankRow } from "../_shared/ItemBankRow/ItemBankRow";
import placement from "../_shared/placement/placement.module.css";
import type { SlideContentProps } from "../slideContentProps";
import { SlideWrapper } from "../SlideWrapper";
import { GridAxisLabel } from "./GridAxisLabel";
import { GridCellChip } from "./GridCellChip";
import { GridCellEditable } from "./GridCellEditable";
import { GridPlacementGhost } from "./GridPlacementGhost";
import styles from "./GridSlideContent.module.css";
import { useGridCellPlacement } from "./useGridCellPlacement";

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

  /** Move an item to a cell — or out of the matrix (null) — writing only a change. */
  const assignCell = (itemId: string, cell: string | null) => {
    const current = editor.question?.correctCells[itemId] ?? null;
    if (current === cell) return;
    editor.setTargetCell(itemId, cell);
  };

  const gesture = useGridCellPlacement({
    armedItemId: composer.selectedItemId,
    onPlace: assignCell,
    onMoveChip: assignCell,
    onTapChip: (itemId) => {
      composer.setSelectedItemId((held) => (held === itemId ? null : itemId));
    },
  });

  if (!question) return <EmptySelect title="Grid" />;

  const { rowLabels, colLabels, items, correctCells } = question;

  const placedCount = items.filter((item) => correctCells[item.id]).length;
  const fullyPlaced = items.length > 0 && placedCount === items.length;

  /** Human name of a cell id, e.g. "Forest × Small". */
  const cellNameOf = (cell: string): string => {
    const { row, col } = parseCell(cell);
    return `${labelOr(rowLabels, row, "Row")} × ${labelOr(colLabels, col, "Column")}`;
  };

  // The armed item — the one a cell's "Place here" button would place.
  const armedIndex = items.findIndex((item) => item.id === composer.selectedItemId);
  const armedItem = armedIndex >= 0 ? items[armedIndex] : undefined;
  const armedItemName = armedItem ? itemNameOf(armedItem, armedIndex) : null;

  const removeItem = (itemId: string | undefined) => {
    editor.removeItem(itemId);
    if (itemId && composer.selectedItemId === itemId) composer.setSelectedItemId(null);
  };

  // The item whose ghost is in flight, if any — drawn under the pointer until
  // the gesture commits.
  const carriedIndex = gesture.drag ? items.findIndex((item) => item.id === gesture.drag?.key) : -1;
  const carried = carriedIndex >= 0 ? items[carriedIndex] : undefined;

  return (
    <SlideWrapper
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
            {/* The placement surface; the pointer-free path is each cell's
                "Place here" button. */}
            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
            <div
              className={[styles.matrix, armedItem ? placement.surfaceArmed : ""]
                .filter(Boolean)
                .join(" ")}
              style={{ "--grid-cols": colLabels.length } as CSSProperties}
              {...gesture.matrixProps}
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
                    onPointerDown={(e) => e.stopPropagation()}
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
                    const placed = items.filter((item) => correctCells[item.id] === cell);
                    return (
                      <GridCellEditable
                        key={cell}
                        cellName={cellNameOf(cell)}
                        hasItems={placed.length > 0}
                        armedItemName={armedItemName}
                        hovered={gesture.drag?.value.cell === cell}
                        cellRef={gesture.registerCell(cell)}
                        onPlaceArmed={() => {
                          if (composer.selectedItemId) assignCell(composer.selectedItemId, cell);
                        }}
                      >
                        {placed.map((item) => {
                          const index = items.indexOf(item);
                          const itemId = item.id;
                          return (
                            <GridCellChip
                              key={itemId}
                              item={item}
                              index={index}
                              color={resolveDatumColor(item.color, index)}
                              selected={itemId === composer.selectedItemId}
                              dragging={gesture.drag?.key === itemId}
                              onSelect={() => {
                                composer.setSelectedItemId((held) =>
                                  held === itemId ? null : itemId,
                                );
                              }}
                              {...gesture.chipProps(itemId)}
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
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    editor.addLabel("row");
                  }}
                >
                  <PlusIcon className={styles.axisAddIcon} aria-hidden="true" />
                  <span>Add row</span>
                </button>
              )}
            </div>
            {carried && gesture.drag && (
              <GridPlacementGhost
                displayIndex={carriedIndex + 1}
                color={resolveDatumColor(carried.color, carriedIndex)}
                label={carried.label}
                clientX={gesture.drag.value.clientX}
                clientY={gesture.drag.value.clientY}
              />
            )}
          </SettingsCard>
        </div>

        <div className={shared.editorColumnNarrow}>
          <SettingsCard
            title="Items"
            action={
              <span className={shared.cardHeaderHint}>
                Select a row, then drag on the matrix to drop it in a cell.
              </span>
            }
          >
            <div className={shared.itemList}>
              <DragDropWrapper onReorder={editor.handleItemDragEnd}>
                {items.map((item, index) => {
                  const cell = correctCells[item.id];
                  return (
                    <SortableItemBankRow
                      type="placement"
                      key={item.id}
                      item={item}
                      index={index}
                      color={resolveDatumColor(item.color, index)}
                      hasTarget={cell != null}
                      meta={
                        cell == null ? undefined : (
                          <span className={styles.rowMeta}>{cellNameOf(cell)}</span>
                        )
                      }
                      selected={composer.selectedItemId === item.id}
                      menuOpen={composer.openMenuId === item.id}
                      canRemove={editor.canRemoveItem}
                      onSelect={() => {
                        composer.setSelectedItemId(item.id);
                      }}
                      onMenuOpenChange={(open) => {
                        composer.setOpenMenuId(open ? item.id : null);
                        if (open) composer.setSelectedItemId(item.id);
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
                        composer.setSelectedItemId(item.id);
                      }}
                      onClearTarget={() => {
                        editor.setTargetCell(item.id, null);
                      }}
                      onRemove={() => {
                        removeItem(item.id);
                      }}
                      openPicker={openPicker}
                    />
                  );
                })}
                <AddItemCard
                  label={
                    editor.canAddItem ? "Add item" : `Maximum ${MAX_GRID_ITEMS.toString()} items`
                  }
                  disabled={!editor.canAddItem}
                  onAdd={() => {
                    editor.addItem();
                  }}
                />
              </DragDropWrapper>
            </div>
          </SettingsCard>
        </div>
      </div>
    </SlideWrapper>
  );
};

export { GridSlideContent };
