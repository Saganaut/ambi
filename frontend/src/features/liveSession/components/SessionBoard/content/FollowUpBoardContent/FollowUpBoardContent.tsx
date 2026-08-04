// Follow-up presentation + answer surface for the board. A follow-up round is an
// ordinary REGULAR round whose candidate cards were minted from its *parent*
// round's submissions — the mapping is parent-content-type-specific (MCQ mints
// its own options; every other scorable parent type mints distinct submissions)
// and lives entirely on the backend (`FollowUpOptions.mint`) — and snapshotted
// server-side when the round opened. They arrive on the slide as
// `followUp.options`, and are rendered in that snapshot order: the client never
// reorders them, so every device shows the one board. What that order *is* is
// the server's business — derived (authored/submission order) for most modes,
// but a per-mint shuffle on SPOT_THE_ANSWER, where any reconstructible
// arrangement would point at the seeded answer.
//
// One component covers every moment, switched by `mode`:
//   - prompt      → candidate cards; pickable when `interactive` (participant on
//                   their own device), read-only when projected/host.
//   - liveResults → the same cards with the running tally filling in; still
//                   pickable, because a pick is re-castable until the round
//                   closes (the answer service zeroes `maxSelections` for a
//                   follow-up).
//   - results     → the final distribution from the round result, with the
//                   most-picked card(s) marked. There is no answer key — a
//                   follow-up grades permanently incorrect — so nothing here
//                   ever shows a correct-answer affordance.
//   - vote        → unreachable: a follow-up never enters the VOTE phase (see
//                   `resolveBoardStage`'s VOTABLE_CONTENT_TYPES note). It falls
//                   through to the read-only grid rather than a special case.
//
// Answering: the pick IS the answer, so it travels the regular answer path as a
// `FollowUpAnswer { optionId }` — never `sendVote`/the VOTE machinery. The
// backend rejects a pick of the viewer's own candidate
// (`409 CANNOT_VOTE_FOR_OWN_ANSWER`); the client pre-empts that with
// `myFollowUpOptionId` from the read model (per-viewer, so it can only ride the
// REST snapshot), which disables that one card. That is the only signal
// available: `sendAnswer` is fire-and-forget (the provider drops the mutation
// promise), so a rejection never surfaces to this component.
import { useEffect, useState } from "react";

import { useLiveSessionQuery } from "@/features/liveSession/hooks/useLiveSessionQuery";
import { useSessionConnection } from "@/features/liveSession/views/SessionPage/SessionConnectionContext";
import { RichTextDisplay } from "@/shared/components/Forms/Input/RichTextDisplay/RichTextDisplay";
import { AppImg } from "@components/Images/AppImg";

import type {
  FollowUpConfigView,
  SlideView,
} from "../../../../store/liveSessionApi.gen";
import type { BoardQuestionMode } from "../../resolveBoardStage";
import { BoardSubmitBar } from "../BoardSubmitBar/BoardSubmitBar";
import { useCappedSelection } from "../useCappedSelection";
import styles from "./FollowUpBoardContent.module.css";

/** The follow-up modes, off the generated view (the backend enum's mirror). */
type FollowUpMode = NonNullable<FollowUpConfigView["mode"]>;

/**
 * What each mode asks of the room. Typed `satisfies Record<FollowUpMode, string>`
 * against the GENERATED union, so a new backend mode regenerated into
 * `liveSessionApi.gen.ts` breaks compilation here until its copy is written —
 * the map can't silently drift. (Local by design: the deck feature keeps its own
 * authoring-side mirror, and cross-feature imports are banned.)
 */
const FOLLOW_UP_MODE_PROMPTS = {
  BEST_ANSWER_VOTE: "Vote for the best answer",
  PREDICT_POPULAR: "Which answer do you think was most popular?",
  SPOT_THE_ANSWER: "Which one is the real answer?",
} satisfies Record<FollowUpMode, string>;

/**
 * A follow-up pick is always single-select in v1, whatever the deck's answer
 * settings say: the round asks for one card, and the backend records exactly one
 * `optionId` per participant. Hard-coded rather than read from
 * `answerSettings.maxSelections` — that setting belongs to the parent question's
 * shape and would be meaningless here.
 */
const FOLLOW_UP_MAX_SELECTIONS = 1;

interface FollowUpBoardContentProps {
  slide: SlideView;
  mode: BoardQuestionMode;
  interactive: boolean;
}

const FollowUpBoardContent = ({
  slide,
  mode,
  interactive,
}: FollowUpBoardContentProps) => {
  const slideId = slide.id ?? "";
  const followUp = slide.followUp;
  const options = followUp?.options ?? [];
  const followUpMode = followUp?.mode;
  const parentTitle = followUp?.parentTitle;

  const { sendAnswer } = useSessionConnection();
  // Live tally while the round runs; the final distribution rides the revealed
  // round result, which is slide-scoped (a stale result from the previous round
  // must never colour this board).
  const { optionCounts, results, myFollowUpOptionId } = useLiveSessionQuery();
  const revealed = results?.slideId === slideId ? results : null;

  const { selected, toggle } = useCappedSelection(
    FOLLOW_UP_MAX_SELECTIONS,
    slideId,
  );
  // The pick this device last posted — also the "already sent" marker, so a
  // participant who changes their mind re-enables the submit bar. Round-local:
  // there is no server-tracked "my pick", so it clears when the round changes.
  const [sentOptionId, setSentOptionId] = useState<string | null>(null);
  useEffect(() => {
    setSentOptionId(null);
  }, [slideId]);

  const pick = selected[0] ?? null;
  // Only the two answering moments accept a pick; "results" is settled and
  // "vote" can't happen for a follow-up (read-only if it somehow does).
  const canPick = interactive && (mode === "prompt" || mode === "liveResults");
  const showCounts = mode === "results" || mode === "liveResults";

  const submit = () => {
    if (!canPick || pick === null || pick === sentOptionId) return;
    sendAnswer(slideId, { answerType: "FollowUpAnswer", optionId: pick });
    setSentOptionId(pick);
  };

  // Zero-filled over the candidate list: the tally only carries picked ids, and
  // a card nobody picked must still read 0% rather than disappear from the math.
  // The revealed distribution replaces the live one outright — a result for a
  // different slide is not this round's, so it contributes nothing.
  const counts =
    mode === "results" ? (revealed?.optionCounts ?? {}) : optionCounts;
  const countFor = (optionId: string): number => counts[optionId] ?? 0;
  const totalPicks = options.reduce(
    (sum, option) => sum + countFor(option.optionId ?? ""),
    0,
  );
  // The most-picked card(s) once results are revealed — derived purely from the
  // counts (no answer key exists), so a tie marks every tied card.
  const topCount = options.reduce(
    (best, option) => Math.max(best, countFor(option.optionId ?? "")),
    0,
  );

  if (options.length === 0) {
    // The server skips a follow-up whose parent minted no candidates, so this
    // should be unreachable — a quiet line still beats an empty grid.
    return (
      <div className={styles.followUpBoardContent}>
        <p className={styles.note}>
          No answers from the previous question are available to pick from.
        </p>
      </div>
    );
  }

  // Even two-column grid, matching the MCQ / vote option layouts.
  const columns = Math.max(Math.ceil(options.length / 2), 2);

  return (
    <div className={styles.followUpBoardContent}>
      {followUpMode && (
        <p className={styles.callToAction}>
          {FOLLOW_UP_MODE_PROMPTS[followUpMode]}
        </p>
      )}
      {parentTitle && (
        <div className={styles.parent}>
          <span className={styles.parentLabel}>Previous question</span>
          <RichTextDisplay value={parentTitle} className={styles.parentTitle} />
        </div>
      )}

      <div
        className={styles.options}
        style={{ "--cols": columns } as React.CSSProperties}>
        {options.map((option) => {
          const id = option.optionId ?? "";
          const mine = myFollowUpOptionId != null && id === myFollowUpOptionId;
          const isPicked = pick === id;
          const selectable = canPick && !mine;
          const count = countFor(id);
          const pct =
            totalPicks > 0 ? Math.round((count / totalPicks) * 100) : 0;
          const isTop = mode === "results" && topCount > 0 && count === topCount;

          const classes = [
            styles.option,
            isPicked ? styles.picked : "",
            mine ? styles.own : "",
            isTop ? styles.top : "",
            selectable ? styles.selectable : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={id}
              type='button'
              className={classes}
              disabled={!selectable}
              aria-disabled={mine ? true : undefined}
              aria-pressed={canPick ? isPicked : undefined}
              onClick={() => {
                toggle(id);
              }}>
              {showCounts && (
                <span
                  className={styles.bar}
                  style={{ width: `${pct.toString()}%` }}
                  aria-hidden='true'
                />
              )}
              {option.imageUrl ? (
                // Uniform alt, deliberately: on a SPOT_THE_ANSWER board one of
                // these cards is the author's own picture rather than a
                // submission, and an alt text that said so would hand the
                // answer to anyone reading the accessibility tree.
                <AppImg className={styles.drawing} src={option.imageUrl} alt='A drawing' fallbackSeed={id} />
              ) : (
                <span className={styles.label}>{option.text}</span>
              )}
              {mine && <span className={styles.mine}>Your answer</span>}
              {isTop && <span className={styles.topBadge}>Most votes</span>}
              {showCounts && (
                <span className={styles.pct}>{pct.toString()}%</span>
              )}
            </button>
          );
        })}
      </div>

      {canPick && (
        <div className={styles.actions}>
          <BoardSubmitBar
            submitted={sentOptionId !== null}
            disabled={pick === null || pick === sentOptionId}
            onSubmit={submit}
            idleLabel='Lock in your pick'
            resubmitLabel='Change pick'
            submittedNote='Pick locked in ✓'
          />
        </div>
      )}
    </div>
  );
};

export { FollowUpBoardContent };
