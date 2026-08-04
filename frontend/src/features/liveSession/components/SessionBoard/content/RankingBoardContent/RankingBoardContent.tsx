// Ranking (order-the-items) presentation + answer surface for the board. One
// component covers every moment, switched by `mode`:
//   - prompt      → tap-to-reorder: each row has up/down move buttons; Submit
//                   posts the whole ordered id list (RankingAnswer) and locks.
//                   The initial order is a per-round seeded shuffle so the
//                   authored (correct) order is never leaked.
//   - liveResults → the crowd's aggregate ranking: rows ordered by each item's
//                   mean submitted position (the optionCounts pipeline carries
//                   one `itemId@position` key per ranked slot), with a per-item
//                   heat strip showing how the votes spread across positions.
//   - results     → the aggregate stays visible; when the round result carries a
//                   correct order (`correctOption`, comma-joined ids) each row is
//                   annotated with its correct position and the rows the crowd
//                   got right read as success. The viewer's own outcome (correct
//                   / not) is banner'd from the round result.
//
// Tap-to-reorder (rather than drag) keeps the surface small-screen and
// keyboard/AT friendly: the move controls are plain buttons, mirroring the
// grid/matching boards.
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { resolveDatumColor } from "@/shared/components/Charts/optionPalette";
import { AppImg } from "@components/Images/AppImg";
import type { RankItemView, SlideView } from "../../../../store/liveSessionApi.gen";
import { useLiveSessionQuery } from "@/features/liveSession/hooks/useLiveSessionQuery";
import { useSessionConnection } from "@/features/liveSession/views/SessionPage/SessionConnectionContext";
import type { BoardQuestionMode } from "../../resolveBoardStage";
import { tallyTotalsBySlot } from "../answerTally";
import { BoardSubmitBar } from "../BoardSubmitBar/BoardSubmitBar";
import { indexedLabel, labelOrFallback } from "../itemLabels";
import { OutcomeBanner } from "../OutcomeBanner/OutcomeBanner";
import { seededShuffle } from "../seededShuffle";
import { findViewerOutcome } from "../viewerOutcome";
import styles from "./RankingBoardContent.module.css";

interface RankingBoardContentProps {
  slide: SlideView;
  mode: BoardQuestionMode;
  interactive: boolean;
}

const RankingBoardContent = ({ slide, mode, interactive }: RankingBoardContentProps) => {
  const slideId = slide.id ?? "";
  const rankItems = slide.ranking?.items;
  const items = useMemo(() => rankItems ?? [], [rankItems]);

  const { sendAnswer } = useSessionConnection();
  const { optionCounts, results, viewerParticipantId } = useLiveSessionQuery();

  // Round-local draft order (item ids). Seeded by the slide id so the starting
  // order is stable on this device all round but never the authored order.
  const shuffledIds = useMemo(
    () => seededShuffle(items, slideId).map((item) => item.id ?? ""),
    [items, slideId],
  );
  const [order, setOrder] = useState<string[]>(shuffledIds);
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    setOrder(shuffledIds);
    setSubmitted(false);
  }, [shuffledIds]);

  const showAggregate = mode === "results" || mode === "liveResults";
  const revealCorrect = mode === "results";
  const canRank = interactive && !submitted && mode !== "results";

  // Item lookups by authored index (for the palette accent) and by id.
  const authoredIndexOf = (id: string): number =>
    items.findIndex((item) => item.id === id);
  const itemById = (id: string): RankItemView | undefined =>
    items.find((item) => item.id === id);

  const accentOf = (id: string): string =>
    resolveDatumColor(itemById(id)?.color, authoredIndexOf(id));

  const move = (index: number, delta: number) => {
    setOrder((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const submit = () => {
    if (!canRank || order.length === 0) return;
    sendAnswer(slideId, { answerType: "RankingAnswer", orderedItemIds: order });
    setSubmitted(true);
  };

  // The revealed correct order (comma-joined ids) — disclosed only at results,
  // and may be null when the round carries no answer key.
  const correctIds =
    revealCorrect && results?.slideId === slideId && results.correctOption
      ? results.correctOption.split(",")
      : null;

  // The viewer's own scored outcome, once results are revealed.
  const myOutcome =
    mode === "results" ? findViewerOutcome(results, slideId, viewerParticipantId) : undefined;

  // Aggregate ranking: order rows by each item's mean submitted position, read
  // off per-item arrays indexed by the 0-based rank slot the tally keyed on
  // (positions outside the item range are dropped). Items with no votes sink to
  // the bottom in authored order.
  const positionTotals = showAggregate ? tallyTotalsBySlot(optionCounts, items.length) : {};
  const rankedRows = items
    .map((item, authoredIndex) => {
      const id = item.id ?? "";
      const counts = positionTotals[id];
      const total = counts ? counts.reduce((sum, n) => sum + n, 0) : 0;
      const mean =
        total > 0 && counts
          ? counts.reduce((sum, n, position) => sum + n * position, 0) / total
          : null;
      return { item, id, authoredIndex, counts, mean };
    })
    .sort((a, b) => {
      // Items with votes first, ascending by mean; then authored order.
      if (a.mean == null && b.mean == null) return a.authoredIndex - b.authoredIndex;
      if (a.mean == null) return 1;
      if (b.mean == null) return -1;
      return a.mean - b.mean || a.authoredIndex - b.authoredIndex;
    });

  // The item image beside its label; the img alt carries the accessible name
  // only when no visible label would (a labeled row must not read doubled).
  const itemFace = (item: RankItemView, fallback: string) => {
    const label = item.label?.trim();
    return item.imageUrl ? (
      <span className={styles.face}>
        <AppImg
          className={styles.thumbnail}
          src={item.imageUrl}
          alt={label ? "" : fallback}
          fallbackSeed={item.id}
        />
        {label && <span className={styles.label}>{label}</span>}
      </span>
    ) : (
      <span className={styles.face}>
        <span className={styles.label}>{labelOrFallback(label, fallback)}</span>
      </span>
    );
  };

  return (
    <div className={styles.rankingBoardContent}>
      <OutcomeBanner
        outcome={myOutcome}
        correctText="You ranked everything correctly ✓"
        wrongText="Not quite — your order was off."
      />

      {showAggregate ? (
        <ol className={styles.ranked}>
          {rankedRows.map((row, rankIndex) => {
            const correctPosition = correctIds ? correctIds.indexOf(row.id) : -1;
            const isCorrect = correctPosition >= 0 && correctPosition === rankIndex;
            const highest = row.counts ? Math.max(1, ...row.counts) : 1;
            return (
              <li
                key={row.id || rankIndex}
                className={[styles.rankedRow, isCorrect ? styles.rowCorrect : ""]
                  .filter(Boolean)
                  .join(" ")}
                style={{ "--row-accent": accentOf(row.id) } as CSSProperties}>
                <span className={styles.rankNum}>{rankIndex + 1}</span>
                {itemFace(row.item, `Item ${(row.authoredIndex + 1).toString()}`)}
                {row.mean != null && (
                  <span className={styles.avg}>avg {(row.mean + 1).toFixed(1)}</span>
                )}
                {correctPosition >= 0 && (
                  <span
                    className={styles.correctBadge}
                    aria-label={`Correct position ${(correctPosition + 1).toString()}`}>
                    #{correctPosition + 1}
                  </span>
                )}
                <span className={styles.heatStrip} aria-hidden='true'>
                  {Array.from({ length: items.length }, (_, position) => {
                    const total = row.counts?.[position] ?? 0;
                    return (
                      <span
                        key={position}
                        className={styles.heatCell}
                        style={{ "--heat": total / highest } as CSSProperties}
                      />
                    );
                  })}
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <ol className={styles.orderList}>
          {order.map((id, index) => {
            const item = itemById(id);
            if (!item) return null;
            const label = indexedLabel(item.label, "Item", index);
            return (
              <li
                key={id || index}
                className={styles.orderRow}
                style={{ "--row-accent": accentOf(id) } as CSSProperties}>
                <span className={styles.rankNum}>{index + 1}</span>
                {itemFace(item, `Item ${(index + 1).toString()}`)}
                {canRank && (
                  <span className={styles.moveControls}>
                    <button
                      type='button'
                      className={styles.moveBtn}
                      disabled={index === 0}
                      aria-label={`Move ${label} up`}
                      onClick={() => {
                        move(index, -1);
                      }}>
                      ↑
                    </button>
                    <button
                      type='button'
                      className={styles.moveBtn}
                      disabled={index === order.length - 1}
                      aria-label={`Move ${label} down`}
                      onClick={() => {
                        move(index, 1);
                      }}>
                      ↓
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {interactive && mode === "prompt" && (
        <div className={styles.actions}>
          <BoardSubmitBar
            submitted={submitted}
            disabled={!canRank}
            onSubmit={submit}
            idleLabel='Lock in answer'
            submittedNote='Answer locked in ✓'
          />
        </div>
      )}
    </div>
  );
};

export { RankingBoardContent };
