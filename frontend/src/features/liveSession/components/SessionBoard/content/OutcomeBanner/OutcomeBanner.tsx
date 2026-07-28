// The viewer's own verdict for a revealed round, drawn above whatever result
// surface the board renders. Every scored board says the same thing in the same
// place and differs only in wording, so the wording is the caller's and
// everything else — the element, the success/error coloring, whether the line
// appears at all — belongs here. Pure view: no state, no store, no handlers.
//
// An absent outcome renders nothing, which is the normal case for a round that
// isn't revealed yet, a collect-only round with no answer key, and a viewer who
// never answered — so callers can hand over the lookup result unguarded.
import type { ParticipantOutcome } from "../../../../store/liveSessionEvents";
import styles from "./OutcomeBanner.module.css";

interface OutcomeBannerProps {
  /** The viewer's scored outcome for the round; `undefined` renders nothing. */
  outcome: ParticipantOutcome | undefined;
  /** Line shown when the viewer's answer was graded correct. */
  correctText: string;
  /** Line shown when it wasn't. */
  wrongText: string;
}

const OutcomeBanner = ({ outcome, correctText, wrongText }: OutcomeBannerProps) => {
  if (!outcome) return null;
  return (
    <p className={outcome.correct ? styles.outcomeCorrect : styles.outcomeWrong}>
      {outcome.correct ? correctText : wrongText}
    </p>
  );
};

export { OutcomeBanner };
