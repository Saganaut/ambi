// Grid (drag-into-matrix) presentation + answer surface for the board. One
// component covers every moment, switched by `mode`:
//   - prompt      → tap-to-place: pick an item chip from the bank, tap a cell;
//                   Submit posts the whole placement map (GridAnswer) and locks.
//   - liveResults → cells shade by live placement counts (the optionCounts
//                   pipeline carries one `itemId@row,col` key per placement);
//                   still answerable for a participant who hasn't submitted.
//   - results     → counts stay visible and the viewer's own outcome (correct /
//                   not) is banner'd from the round result. The correct
//                   placements themselves are not revealed yet — no event
//                   carries a map-shaped answer key (same seam as D5).
//
// Tap-to-place (rather than drag) keeps the surface small-screen and
// keyboard/AT friendly: chips and cells are plain buttons.
import { useEffect, useMemo, useState } from "react";
import type { SlideView } from "../../../store/liveSessionApi.gen";
import { useLiveSessionQuery } from "@/features/liveSession/hooks/useLiveSessionQuery";
import { useSessionConnection } from "@/features/liveSession/views/SessionPage/SessionConnectionContext";
import type { BoardQuestionMode } from "../resolveBoardStage";
import { Btn } from "@ui/Buttons/Btn";
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

  return (
    <div className={styles.gridBoardContent}>
      {myOutcome && (
        <p className={myOutcome.correct ? styles.outcomeCorrect : styles.outcomeWrong}>
          {myOutcome.correct
            ? "You sorted everything correctly ✓"
            : "Not quite — some placements were off."}
        </p>
      )}

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
              <div
                key={`cell-${cell}`}
                className={styles.cell}
                style={
                  {
                    "--cell-heat": showCounts ? total / highestTotal : 0,
                  } as React.CSSProperties
                }>
                {placedHere.map((item) => (
                  <button
                    key={item.id}
                    type='button'
                    className={styles.placedChip}
                    disabled={!canPlace}
                    aria-label={`Pick ${item.label?.trim() || "item"} back up from ${cellName}`}
                    onClick={() => {
                      if (!item.id) return;
                      setPlacements((prev) => {
                        const { [item.id ?? ""]: _lifted, ...rest } = prev;
                        return rest;
                      });
                      setHeldItemId(item.id);
                    }}>
                    {item.label?.trim() || "Item"}
                  </button>
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
              </div>
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
              <div className={styles.bank}>
                {bank.length === 0 ? (
                  <span className={styles.hint}>All items placed.</span>
                ) : (
                  bank.map((item) => (
                    <button
                      key={item.id}
                      type='button'
                      className={[
                        styles.bankChip,
                        heldItemId === item.id ? styles.held : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-pressed={heldItemId === item.id}
                      disabled={!canPlace}
                      onClick={() => {
                        setHeldItemId((prev) => (prev === item.id ? null : (item.id ?? null)));
                      }}>
                      {item.label?.trim() || "Item"}
                    </button>
                  ))
                )}
                {heldItemId != null && (
                  <span className={styles.hint}>Now tap a cell to place it.</span>
                )}
              </div>
              <Btn size='sm' variant='brand' disabled={!allPlaced} onClick={submit}>
                Lock in answer
              </Btn>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export { GridBoardContent };
