// Host-only admin control bar for a live session. Lives below the SessionBoard
// in the InnerDisplay and drives the round state machine over STOMP: end the
// submit window (flushing players' drafts), reveal results, advance, pause /
// resume the countdown, end the show, or restart from round 1. Non-hosts render
// nothing — moderation/control is the host's surface only (the board itself is
// the shared display + answer surface).
//
// Everything the bar reads — status / phase / current element / settings, the
// live overlays (paused, revealed), the round result, and whether the viewer is
// the host — comes from useSession(), the one merged session view (the slice is
// still the source the STOMP subscriptions feed; consumers just don't reach into
// it directly). Host actions are sent through the session connection (one shared
// STOMP client, provided by SessionConnectionProvider).
import { useSession } from "@/features/liveSession/views/SessionPage/useSession";
import { useSessionConnection } from "@/features/liveSession/views/SessionPage/SessionConnectionContext";
import { useConfirm } from "@components/ConfirmDialog/useConfirm";
import { resolveShowResponsesFor } from "@utils/showResponsesResolver";
import { Btn } from "@ui/Buttons/Btn";
import styles from "./SessionControls.module.css";

interface SessionControlsProps {
  className?: string;
}

const SessionControls = ({ className }: SessionControlsProps) => {
  // The merged view carries the live overlays (timerPaused / revealedElementIds)
  // too, so we read them from one place. roundResult is present once the round
  // has completed and its result has been broadcast — the backend never flips to
  // a REVEAL phase, so this is how we know we're in the between-rounds reveal
  // window (and must stop offering submit-phase actions). Cleared next round.
  const { interactiveSession, roundResult, viewerIsHost } = useSession();
  const {
    status,
    phase,
    currentRound,
    deckSnapshot,
    settings,
    players,
    timerPaused,
    revealedElementIds,
  } = interactiveSession;

  const {
    sendStart,
    sendEndSubmitPhase,
    sendRevealNow,
    sendNextRound,
    sendPauseTimer,
    sendResumeTimer,
    sendEndInteractiveSession,
    sendRestart,
  } = useSessionConnection();
  const confirm = useConfirm();

  // Controls are the host's surface only.
  if (!viewerIsHost) return null;

  // Pre-game: the only host action is to start. Starting flips the session to
  // IN_PROGRESS (via the /round broadcast), and the board re-derives its stage
  // to the first question — no navigation, the lobby is just a board stage.
  if (status === "LOBBY") {
    return (
      <div className={`${styles.sessionControls} ${className ?? ""}`}>
        <div className={styles.actions}>
          <Btn
            size='sm'
            variant='brand'
            disabled={players.length < 1}
            onClick={sendStart}>
            Start session
          </Btn>
        </div>
      </div>
    );
  }

  // currentRound can point past the end on terminal states; treat as optional.
  const element = deckSnapshot[currentRound] as
    | (typeof deckSnapshot)[number]
    | undefined;
  const elementId = element?.id ?? "";
  const isSlide = element?.kind === "Slide";
  const inProgress = status === "IN_PROGRESS";
  // The submit window is open only before the round result lands; once it does
  // we're in the reveal window and submit-phase actions no longer apply.
  const inSubmit = phase === "SUBMIT" && !roundResult;
  const inReveal = inProgress && !!roundResult;
  const isRevealed = revealedElementIds.includes(elementId);

  // Reveal-now only applies on a live ON_CLICK question that hasn't been
  // revealed yet (mirrors PlayPage's HostRoundControls.canReveal). The
  // per-element showResponses override is Slide-only and reveal never targets a
  // slide, so the element arg is left undefined and the cascade falls through to
  // deck / session / format.
  const resolved = resolveShowResponsesFor(
    interactiveSession,
    undefined,
    undefined,
  );
  const canReveal =
    inProgress &&
    inSubmit &&
    !isSlide &&
    resolved === "ON_CLICK" &&
    !isRevealed;
  const canEndSubmit = inProgress && inSubmit && !isSlide;
  // Pause only matters when the round has a countdown. We key off the session's
  // per-question time; per-element overrides are a rarer case and the button is
  // hidden, not broken, when they're the only timer.
  const hasTimer = (settings.timePerQuestion ?? 0) > 0;
  const canPauseTimer = inProgress && inSubmit && !isSlide && hasTimer;
  // Advance is offered once the round's result is showing, in any submission
  // mode. The server's nextRound now works for SIMULTANEOUS too (it cancels the
  // pending auto-advance), so the host can step forward immediately instead of
  // waiting out the between-rounds delay.
  const canNextRound = inReveal;
  const canEnd = inProgress;
  const canRestart = inProgress || status === "FINISHED";

  const handleEnd = async () => {
    const ok = await confirm({
      title: "End session",
      message: "End the session now? Scores so far will be final.",
      confirmLabel: "End session",
      variant: "danger",
    });
    if (ok) sendEndInteractiveSession();
  };

  const handleRestart = async () => {
    const ok = await confirm({
      title: "Restart session",
      message:
        "Restart from round 1? All scores and answers will be cleared — players stay in the room.",
      confirmLabel: "Restart",
      variant: "danger",
    });
    if (ok) sendRestart();
  };

  return (
    <div className={`${styles.sessionControls} ${className ?? ""}`}>
      <div className={styles.actions}>
        {/* The generic reveal: ends the submit window (flushing drafts) and
            reveals the round result + correct answer, in any showResponses
            mode. */}
        <Btn
          size='sm'
          disabled={!canEndSubmit}
          onClick={() => {
            sendEndSubmitPhase(elementId);
          }}>
          Reveal answers
        </Btn>
        {/* ON_CLICK only: surface the live response distribution without ending
            the round (the PRESENTATION "peek"). */}
        <Btn
          size='sm'
          disabled={!canReveal}
          onClick={() => {
            sendRevealNow(elementId);
          }}>
          {isRevealed ? "Live results shown" : "Show live results"}
        </Btn>
        {canNextRound && (
          <Btn size='sm' onClick={sendNextRound}>
            Next round
          </Btn>
        )}
        <Btn
          size='sm'
          variant={timerPaused ? "warning" : undefined}
          disabled={!canPauseTimer}
          onClick={() => {
            if (timerPaused) sendResumeTimer();
            else sendPauseTimer();
          }}>
          {timerPaused ? "Resume timer" : "Pause timer"}
        </Btn>

        <span className={styles.spacer} />

        <Btn
          size='sm'
          variant='error'
          fill='ghost'
          disabled={!canEnd}
          onClick={() => {
            void handleEnd();
          }}>
          End session
        </Btn>
        <Btn
          size='sm'
          variant='error'
          disabled={!canRestart}
          onClick={() => {
            void handleRestart();
          }}>
          Restart
        </Btn>
      </div>
    </div>
  );
};

export { SessionControls };
