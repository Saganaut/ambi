// Grid (drag-into-matrix) presentation + answer surface for the board. One
// component covers every moment, switched by `mode`:
//   - prompt      → place items into cells; Submit posts the whole placement
//                   map (GridAnswer) and locks.
//   - liveResults → cells shade by live placement counts (the optionCounts
//                   pipeline carries one `itemId@row,col` key per placement);
//                   still answerable for a participant who hasn't submitted.
//   - results     → counts stay visible and the viewer's own outcome (correct /
//                   not) is banner'd from the round result. The correct
//                   placements themselves are not revealed yet — no event
//                   carries a map-shaped answer key (same seam as D5).
//
// Placement has two layered inputs. Pointer/touch DRAG is the primary path
// (drag a bank chip into a cell, drag a placed chip to another cell or back to
// the bank), resolved through the shared `resolveDragEnd` seam. Tap-to-place is
// kept as the small-screen / keyboard / AT fallback: tap a bank chip to hold
// it, then tap a cell; both chips and cells stay plain buttons so the tap path
// is fully operable without a pointer. The two never conflict — dnd-kit's
// pointer sensor only starts a drag past a movement/hold threshold, so a plain
// click still toggles the held state.
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  DragDropProvider,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/react";
import { resolveDatumColor } from "@/shared/components/Charts/optionPalette";
import type { GridItemView, SlideView } from "../../../store/liveSessionApi.gen";
import { useLiveSessionQuery } from "@/features/liveSession/hooks/useLiveSessionQuery";
import { useSessionConnection } from "@/features/liveSession/views/SessionPage/SessionConnectionContext";
import type { BoardQuestionMode } from "../resolveBoardStage";
import { Btn } from "@ui/Buttons/Btn";
import { BANK_DROPPABLE_ID, resolveDragEnd } from "./boardDnd";
import { seededShuffle } from "./seededShuffle";
import styles from "./GridBoardContent.module.css";

interface GridBoardContentProps {
  slide: SlideView;
  mode: BoardQuestionMode;
  interactive: boolean;
}

/** The backend cell-id shape ({@code "rowIndex,colIndex"}). */
const cellIdOf = (row: number, col: number): string =>
  `${row.toString()},${col.toString()}`;

/** Sum the live per-`itemId@cell` tally into per-cell totals. */
const cellTotals = (optionCounts: Record<string, number>): Record<string, number> => {
  const totals: Record<string, number> = {};
  for (const [key, count] of Object.entries(optionCounts)) {
    const cell = key.split("@")[1];
    if (!cell || count <= 0) continue;
    totals[cell] = (totals[cell] ?? 0) + count;
  }
  return totals;
};

/**
 * A matrix cell that is also a drop target. Owns only the droppable frame and
 * its live drop-highlight; the cell's chips, count and tap overlay come in as
 * children. Dropping is disabled outside the answerable moments.
 */
interface BoardCellProps {
  cellId: string;
  /** 0..1 live share of placements, shading the cell like a heatmap. */
  heat: number;
  dropDisabled: boolean;
  children: ReactNode;
}
const BoardCell = ({ cellId, heat, dropDisabled, children }: BoardCellProps) => {
  const { ref, isDropTarget } = useDroppable({ id: cellId, disabled: dropDisabled });
  return (
    <div
      ref={ref}
      className={[styles.cell, isDropTarget ? styles.cellDropTarget : ""]
        .filter(Boolean)
        .join(" ")}
      style={{ "--cell-heat": heat } as CSSProperties}>
      {children}
    </div>
  );
};

/**
 * The item bank as a drop target: a placed chip dragged here is un-placed.
 * Uses the reserved {@link BANK_DROPPABLE_ID} sentinel, which cannot collide
 * with a cell id (always comma-bearing) or an item id (a UUID).
 */
interface BoardBankProps {
  dropDisabled: boolean;
  children: ReactNode;
}
const BoardBank = ({ dropDisabled, children }: BoardBankProps) => {
  const { ref, isDropTarget } = useDroppable({
    id: BANK_DROPPABLE_ID,
    disabled: dropDisabled,
  });
  return (
    <div
      ref={ref}
      className={[styles.bank, isDropTarget ? styles.bankDropTarget : ""]
        .filter(Boolean)
        .join(" ")}>
      {children}
    </div>
  );
};

/**
 * An item chip that is both a plain button (tap flow) and a whole-body drag
 * source (drag flow). A quick click never crosses the pointer sensor's
 * activation threshold, so `onClick` keeps toggling the held / pick-up state.
 */
interface ChipProps {
  itemId: string;
  className: string;
  accent: string;
  disabled: boolean;
  dragDisabled: boolean;
  ariaLabel?: string;
  ariaPressed?: boolean;
  onClick: () => void;
  children: ReactNode;
}
const DraggableChip = ({
  itemId,
  className,
  accent,
  disabled,
  dragDisabled,
  ariaLabel,
  ariaPressed,
  onClick,
  children,
}: ChipProps) => {
  const { ref, isDragging } = useDraggable({ id: itemId, disabled: dragDisabled });
  return (
    <button
      ref={ref}
      type='button'
      className={[className, isDragging ? styles.dragging : ""].filter(Boolean).join(" ")}
      style={{ "--chip-accent": accent } as CSSProperties}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      onClick={onClick}>
      {children}
    </button>
  );
};

const GridBoardContent = ({ slide, mode, interactive }: GridBoardContentProps) => {
  const slideId = slide.id ?? "";
  const grid = slide.grid;
  const rowLabels = grid?.rowLabels ?? [];
  const colLabels = grid?.colLabels ?? [];

  const { sendAnswer } = useSessionConnection();
  const { optionCounts, results, viewerParticipantId } = useLiveSessionQuery();

  // The bank is shuffled per round (the content doc's "shuffled bank"):
  // seeded by the slide id so the order is stable on this device all round.
  const gridItems = grid?.items;
  const items = useMemo(
    () => seededShuffle(gridItems ?? [], slideId),
    [gridItems, slideId],
  );

  // Round-local placement draft: itemId → cellId. Cleared when the round changes.
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [heldItemId, setHeldItemId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    setPlacements({});
    setHeldItemId(null);
    setSubmitted(false);
  }, [slideId]);

  const canPlace = interactive && !submitted && mode !== "results";
  const allPlaced =
    items.length > 0 && items.every((item) => item.id && placements[item.id]);

  const submit = () => {
    if (!canPlace || !allPlaced) return;
    sendAnswer(slideId, { answerType: "GridAnswer", placements });
    setSubmitted(true);
  };

  // Resolve a drag onto a cell (place / move) or onto the bank (un-place),
  // no-op'ing an unchanged drop. Same result as the tap flow; the drag gesture
  // concludes any tap selection of the same item.
  const handleDragEnd = (event: DragEndEvent) => {
    const drop = resolveDragEnd(event);
    if (!drop || !canPlace) return;
    const { itemId, targetId } = drop;
    if (targetId === BANK_DROPPABLE_ID) {
      if (!placements[itemId]) return;
      setPlacements((prev) => {
        const { [itemId]: _lifted, ...rest } = prev;
        return rest;
      });
    } else {
      if (placements[itemId] === targetId) return;
      setPlacements((prev) => ({ ...prev, [itemId]: targetId }));
    }
    if (heldItemId === itemId) setHeldItemId(null);
  };

  const showCounts = mode === "results" || mode === "liveResults";
  const totals = showCounts ? cellTotals(optionCounts) : {};
  const highestTotal = Math.max(1, ...Object.values(totals));

  // The viewer's own scored outcome, once results are revealed.
  const myOutcome =
    mode === "results" && results?.slideId === slideId
      ? results.outcomes.find((o) => o.participantId === viewerParticipantId)
      : undefined;

  const bank = items.filter((item) => !(item.id && placements[item.id]));

  const labelOf = (labels: string[], index: number, fallback: string): string =>
    labels[index]?.trim() || `${fallback} ${(index + 1).toString()}`;

  // Chip accent: the authored color override, else the shared palette by the
  // item's AUTHORED position (pre-shuffle), so chips match the editor's colors.
  const accentOf = (item: GridItemView): string =>
    resolveDatumColor(
      item.color,
      (gridItems ?? []).findIndex((authored) => authored.id === item.id),
    );

  // A chip face is the item's image (when authored) beside its label. The img
  // alt carries the accessible name only when no visible label would — a
  // labeled chip's name must not read doubled ("Bat Bat").
  const chipFace = (item: GridItemView) => {
    const label = item.label?.trim();
    return item.imageUrl ? (
      <>
        <img className={styles.chipImage} src={item.imageUrl} alt={label ? "" : "Item"} />
        {label && <span>{label}</span>}
      </>
    ) : (
      label || "Item"
    );
  };

  return (
    <div className={styles.gridBoardContent}>
      {myOutcome && (
        <p className={myOutcome.correct ? styles.outcomeCorrect : styles.outcomeWrong}>
          {myOutcome.correct
            ? "You sorted everything correctly ✓"
            : "Not quite — some placements were off."}
        </p>
      )}

      {/* DragDropProvider directly (not DragDropWrapper): the matrix and the
          bank share one drag context so chips move freely between them. */}
      <DragDropProvider onDragEnd={handleDragEnd}>
        <div
          className={styles.matrix}
          style={{ "--grid-cols": colLabels.length } as React.CSSProperties}>
          <span />
          {colLabels.map((_, col) => (
            <span key={`col-${col.toString()}`} className={styles.header}>
              {labelOf(colLabels, col, "Column")}
            </span>
          ))}
          {rowLabels.map((_, row) => [
            <span key={`row-${row.toString()}`} className={styles.header}>
              {labelOf(rowLabels, row, "Row")}
            </span>,
            ...colLabels.map((__, col) => {
              const cell = cellIdOf(row, col);
              const placedHere = items.filter(
                (item) => item.id && placements[item.id] === cell,
              );
              const total = totals[cell] ?? 0;
              const cellName = `${labelOf(rowLabels, row, "Row")} × ${labelOf(colLabels, col, "Column")}`;
              return (
                <BoardCell
                  key={`cell-${cell}`}
                  cellId={cell}
                  heat={showCounts ? total / highestTotal : 0}
                  dropDisabled={!canPlace}>
                  {placedHere.map((item) => (
                    <DraggableChip
                      key={item.id}
                      itemId={item.id ?? ""}
                      className={styles.placedChip}
                      accent={accentOf(item)}
                      disabled={!canPlace}
                      dragDisabled={!canPlace}
                      ariaLabel={`Pick ${item.label?.trim() || "item"} back up from ${cellName}`}
                      onClick={() => {
                        if (!item.id) return;
                        setPlacements((prev) => {
                          const { [item.id ?? ""]: _lifted, ...rest } = prev;
                          return rest;
                        });
                        setHeldItemId(item.id);
                      }}>
                      {chipFace(item)}
                    </DraggableChip>
                  ))}
                  {showCounts && total > 0 && (
                    <span className={styles.count} aria-label={`${total.toString()} placements`}>
                      {total}
                    </span>
                  )}
                  {canPlace && heldItemId != null && (
                    <button
                      type='button'
                      className={styles.placeTarget}
                      aria-label={`Place in ${cellName}`}
                      onClick={() => {
                        setPlacements((prev) => ({ ...prev, [heldItemId]: cell }));
                        setHeldItemId(null);
                      }}
                    />
                  )}
                </BoardCell>
              );
            }),
          ])}
        </div>

        {interactive && mode !== "results" && (
          <div className={styles.actions}>
            {submitted ? (
              <p className={styles.submittedNote}>Answer locked in ✓</p>
            ) : (
              <>
                <BoardBank dropDisabled={!canPlace}>
                  {bank.length === 0 ? (
                    <span className={styles.hint}>All items placed.</span>
                  ) : (
                    bank.map((item) => (
                      <DraggableChip
                        key={item.id}
                        itemId={item.id ?? ""}
                        className={[
                          styles.bankChip,
                          heldItemId === item.id ? styles.held : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        accent={accentOf(item)}
                        disabled={!canPlace}
                        dragDisabled={!canPlace}
                        ariaPressed={heldItemId === item.id}
                        onClick={() => {
                          setHeldItemId((prev) =>
                            prev === item.id ? null : (item.id ?? null),
                          );
                        }}>
                        {chipFace(item)}
                      </DraggableChip>
                    ))
                  )}
                  {heldItemId != null && (
                    <span className={styles.hint}>Now tap a cell to place it.</span>
                  )}
                </BoardBank>
                <Btn size='sm' variant='brand' disabled={!allPlaced} onClick={submit}>
                  Lock in answer
                </Btn>
              </>
            )}
          </div>
        )}
      </DragDropProvider>
    </div>
  );
};

export { GridBoardContent };
