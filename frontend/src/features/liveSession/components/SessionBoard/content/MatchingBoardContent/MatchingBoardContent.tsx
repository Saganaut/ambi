// Matching (connect-the-pairs) presentation + answer surface for the board. One
// component covers every moment, switched by `mode`:
//   - prompt      → tap-to-pair: tap a left card to hold it, tap a right card to
//                   connect them; Submit posts the whole matches map
//                   (MatchingAnswer) and may be re-sent until the round locks
//                   (the backend forces maxSelections=0, last write wins).
//   - liveResults → each right card grows count chips (one per left card that
//                   players connected to it), aggregated from the live
//                   `leftId@rightId` tally keys; still answerable pre-lock.
//   - results     → the chips stay visible and, on a scored round, the viewer's
//                   own outcome (correct / not) is banner'd from the round
//                   result. A collect-only round (no authored key) shows no
//                   verdict — there is nothing to be right about. The correct
//                   pairs themselves are not revealed yet — no event carries a
//                   map-shaped answer key (same seam as the grid/axis boards).
//
// Tap-to-pair (rather than drag or drawn lines) keeps the surface small-screen
// and keyboard/AT friendly: every card is a plain button. The right column
// renders exactly as served — the backend already de-correlates its order from
// the authored pairing (see MatchingConfigView), so no client shuffle is
// needed. A card shows its image face when the view carries a resolved
// imageUrl, else its phrase; accents come from the card's authored color with
// the shared option palette as the per-row fallback.
import { useEffect, useState } from "react";
import type { SlideView } from "../../../../store/liveSessionApi.gen";
import { useLiveSessionQuery } from "@/features/liveSession/hooks/useLiveSessionQuery";
import { useSessionConnection } from "@/features/liveSession/views/SessionPage/SessionConnectionContext";
import type { BoardQuestionMode } from "../../resolveBoardStage";
import { resolveDatumColor } from "@/shared/components/Charts/optionPalette";
import { BoardSubmitBar } from "../BoardSubmitBar/BoardSubmitBar";
import { indexedLabel } from "../itemLabels";
import { OutcomeBanner } from "../OutcomeBanner/OutcomeBanner";
import { findViewerOutcome } from "../viewerOutcome";
import styles from "./MatchingBoardContent.module.css";

interface MatchingBoardContentProps {
  slide: SlideView;
  mode: BoardQuestionMode;
  interactive: boolean;
}

/** Keep only the positive live `leftId@rightId` connection tallies. */
const connectionCounts = (optionCounts: Record<string, number>): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const [key, count] of Object.entries(optionCounts)) {
    if (count > 0 && key.includes("@")) counts[key] = count;
  }
  return counts;
};

const MatchingBoardContent = ({ slide, mode, interactive }: MatchingBoardContentProps) => {
  const slideId = slide.id ?? "";
  const matching = slide.matching;
  const left = matching?.left ?? [];
  const right = matching?.right ?? [];
  const scored = matching?.scored ?? false;

  const { sendAnswer } = useSessionConnection();
  const { optionCounts, results, viewerParticipantId } = useLiveSessionQuery();

  // Round-local draft: leftId → rightId, plus which left card is "held" (picked
  // up, waiting for a right card). Reset on round change.
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [heldLeftId, setHeldLeftId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    setMatches({});
    setHeldLeftId(null);
    setSubmitted(false);
  }, [slideId]);

  // A matches map may be re-sent until the round locks (the backend forces
  // maxSelections=0), so submitting never freezes the surface — only the round
  // moving to results does.
  const canMatch = interactive && mode !== "results";
  const allMatched = left.length > 0 && left.every((card) => card.id && matches[card.id]);

  const connect = (rightId: string) => {
    if (heldLeftId == null) return;
    setMatches((prev) => {
      if (prev[heldLeftId] === rightId) {
        // Tapping the held card's own connection picks it apart.
        const { [heldLeftId]: _unlinked, ...rest } = prev;
        return rest;
      }
      // A right card holds one connection: connecting it to a new left card
      // steals it from whichever left card had it.
      const next: Record<string, string> = {};
      for (const [l, r] of Object.entries(prev)) {
        if (r !== rightId) next[l] = r;
      }
      next[heldLeftId] = rightId;
      return next;
    });
    setHeldLeftId(null);
  };

  const submit = () => {
    if (!canMatch || !allMatched) return;
    sendAnswer(slideId, { answerType: "MatchingAnswer", matches });
    setSubmitted(true);
  };

  const showCounts = mode === "results" || mode === "liveResults";
  const counts = showCounts ? connectionCounts(optionCounts) : {};

  // The viewer's own scored outcome, once results are revealed — only a scored
  // round has a verdict; a collect-only round reveals nothing to be wrong about.
  const myOutcome =
    scored && mode === "results"
      ? findViewerOutcome(results, slideId, viewerParticipantId)
      : undefined;

  const cardLabel = (card: { label?: string }, index: number): string =>
    indexedLabel(card.label, "Card", index);

  // Left-card lookups for the connection badges and count chips.
  const leftDisplay = new Map(
    left.map((card, index) => [
      card.id ?? "",
      { label: cardLabel(card, index), accent: resolveDatumColor(card.color, index) },
    ]),
  );
  const leftIdByRightId = new Map(Object.entries(matches).map(([l, r]) => [r, l]));

  const face = (card: { label?: string; imageUrl?: string }, index: number) =>
    card.imageUrl ? (
      <img className={styles.cardImage} src={card.imageUrl} alt={card.label?.trim() || ""} />
    ) : (
      <span className={styles.cardPhrase}>{cardLabel(card, index)}</span>
    );

  return (
    <div className={styles.matchingBoardContent}>
      <OutcomeBanner
        outcome={myOutcome}
        correctText="You matched every pair ✓"
        wrongText="Not quite — some pairs were off."
      />

      <div className={styles.columns}>
        <ul className={styles.column}>
          {left.map((card, index) => {
            const leftId = card.id ?? "";
            const held = heldLeftId === leftId;
            const matchedRight = matches[leftId];
            return (
              <li key={leftId || index}>
                <button
                  type='button'
                  className={[
                    styles.card,
                    held ? styles.held : "",
                    matchedRight ? styles.matched : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={
                    {
                      "--card-accent": resolveDatumColor(card.color, index),
                    } as React.CSSProperties
                  }
                  disabled={!canMatch}
                  aria-pressed={held}
                  aria-label={
                    matchedRight
                      ? `${cardLabel(card, index)}, matched — pick back up`
                      : `Pick up ${cardLabel(card, index)}`
                  }
                  onClick={() => {
                    setHeldLeftId((prev) => (prev === leftId ? null : leftId));
                  }}>
                  {face(card, index)}
                </button>
              </li>
            );
          })}
        </ul>

        <ul className={styles.column}>
          {right.map((card, index) => {
            const rightId = card.id ?? "";
            const linkedLeftId = leftIdByRightId.get(rightId);
            const linked = linkedLeftId ? leftDisplay.get(linkedLeftId) : undefined;
            return (
              <li key={rightId || index}>
                <button
                  type='button'
                  className={[styles.card, linked ? styles.matched : ""]
                    .filter(Boolean)
                    .join(" ")}
                  style={
                    {
                      "--card-accent": resolveDatumColor(card.color, index),
                    } as React.CSSProperties
                  }
                  disabled={!canMatch || heldLeftId == null}
                  aria-label={
                    heldLeftId != null
                      ? `Match ${leftDisplay.get(heldLeftId)?.label ?? "the held card"} with ${cardLabel(card, index)}`
                      : cardLabel(card, index)
                  }
                  onClick={() => {
                    connect(rightId);
                  }}>
                  {face(card, index)}
                  {linked && (
                    <span
                      className={styles.linkBadge}
                      style={{ "--link-accent": linked.accent } as React.CSSProperties}
                      aria-label={`Matched with ${linked.label}`}>
                      {linked.label}
                    </span>
                  )}
                  {showCounts && (
                    <span className={styles.countChips}>
                      {left.map((leftCard, leftIndex) => {
                        const count = counts[`${leftCard.id ?? ""}@${rightId}`] ?? 0;
                        if (count <= 0) return null;
                        const display = leftDisplay.get(leftCard.id ?? "");
                        return (
                          <span
                            key={leftCard.id ?? leftIndex}
                            className={styles.countChip}
                            style={
                              { "--link-accent": display?.accent ?? "" } as React.CSSProperties
                            }
                            aria-label={`${display?.label ?? "?"} → ${cardLabel(card, index)}: ${count.toString()}`}>
                            {count}
                          </span>
                        );
                      })}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {canMatch && (
        <div className={styles.actions}>
          <BoardSubmitBar
            submitted={submitted}
            disabled={!allMatched}
            onSubmit={submit}
            idleLabel='Submit answer'
            resubmitLabel='Update answer'
            submittedNote='Answer submitted ✓'>
            {heldLeftId != null && (
              <span className={styles.hint}>Now tap a card on the right to match it.</span>
            )}
            {!allMatched && heldLeftId == null && (
              <span className={styles.hint}>Match every pair to submit.</span>
            )}
          </BoardSubmitBar>
        </div>
      )}
    </div>
  );
};

export { MatchingBoardContent };
