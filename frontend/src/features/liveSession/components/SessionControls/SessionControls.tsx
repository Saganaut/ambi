// Host-only admin control bar for a live session. Lives below the SessionBoard in
// the InnerDisplay and drives the round state machine: start the show, show the
// live response distribution, close submissions (locks + scores), reveal the
// results (correct answer + scores), advance to the next round, restart the
// current round, or end the show. Non-hosts render nothing — control is the
// host's surface only (the board itself is the shared display + answer surface).
//
// Close and reveal are separate controls, but the host may reveal results
// straight from an open round — the backend closes + scores it in the same step.
// Which actions are live for the current phase is decided by `resolveHostActions`;
// state it reads comes from the read model via `useLiveSessionQuery`; commands go
// through the session connection (an adapter over the REST command hook).
import {
  isDisplaySlide,
  isVotableSlide,
} from "@/features/liveSession/components/SessionBoard/resolveBoardStage";
import { useLiveSessionQuery } from "@/features/liveSession/hooks/useLiveSessionQuery";
import { useSessionConnection } from "@/features/liveSession/views/SessionPage/SessionConnectionContext";
import { useConfirm } from "@components/ConfirmDialog/useConfirm";
import { Btn } from "@ui/Buttons/Btn";
import { resolveHostActions } from "./resolveHostActions";
import styles from "./SessionControls.module.css";

interface SessionControlsProps {
  className?: string;
}

const SessionControls = ({ className }: SessionControlsProps) => {
  const {
    status,
    phase,
    currentSlide,
    currentSlideId,
    roster,
    viewerIsHost,
    roundDeadline,
    timerPausedAt,
  } = useLiveSessionQuery();
  const {
    sendStart,
    sendRevealResponses,
    sendCloseRound,
    sendOpenVoting,
    sendRevealResults,
    sendAdvance,
    sendRestartRound,
    sendPauseTimer,
    sendResumeTimer,
    sendEnd,
  } = useSessionConnection();
  const confirm = useConfirm();

  // Controls are the host's surface only.
  if (!viewerIsHost) return null;

  // Pre-game: the only host action is to start. Starting flips the session to
  // IN_PROGRESS (via the socket) but opens no round — the board stays on the
  // lobby stage until the host opens the first round via the "Start round"
  // action below (advance resolves the first slide server-side).
  if (status === "LOBBY") {
    return (
      <div className={`${styles.sessionControls} ${className ?? ""}`}>
        <div className={styles.actions}>
          <Btn
            shape="pill"
            size="md"
            variant="brand"
            disabled={roster.length < 1}
            onClick={sendStart}
          >
            Start session
          </Btn>
        </div>
      </div>
    );
  }

  // Terminal states have no round to control.
  if (status !== "IN_PROGRESS") return null;

  const slideId = currentSlideId ?? "";
  const hasSlide = slideId !== "";
  const actions = resolveHostActions(
    status,
    phase,
    currentSlide ? isDisplaySlide(currentSlide) : false,
    hasSlide,
    roundDeadline != null,
    timerPausedAt != null,
    currentSlide ? isVotableSlide(currentSlide) : false,
  );

  const handleEnd = async () => {
    const ok = await confirm({
      title: "End session",
      message: "End the session now? Scores so far will be final.",
      confirmLabel: "End session",
      variant: "danger",
    });
    if (ok) sendEnd();
  };

  const handleRestart = async () => {
    const ok = await confirm({
      title: "Restart round",
      message: "Restart the current round? Answers for it will be cleared.",
      confirmLabel: "Restart",
      variant: "danger",
    });
    if (ok) sendRestartRound(slideId);
  };

  return (
    <div className={`${styles.sessionControls} ${className ?? ""}`}>
      <div className={styles.actions}>
        {/* Surface the live response distribution without ending the round. */}
        <Btn
          shape="pill"
          size="md"
          disabled={!actions.canShowResponses}
          onClick={() => {
            sendRevealResponses(slideId);
          }}
        >
          Show live results
        </Btn>
        {/* Close submissions — locks and scores the round. */}
        <Btn
          shape="pill"
          size="md"
          disabled={!actions.canClose}
          onClick={() => {
            sendCloseRound(slideId);
          }}
        >
          Close submissions
        </Btn>
        {/* Free-form kinds only: close unscored and collect best-answer votes
            (D3); the round is scored — votes included — at the results reveal. */}
        {actions.canOpenVoting && (
          <Btn
            shape="pill"
            size="md"
            onClick={() => {
              sendOpenVoting(slideId);
            }}
          >
            Open voting
          </Btn>
        )}
        {/* Reveal the result + correct answer (closes an open round first). */}
        <Btn
          shape="pill"
          size="md"
          variant="brand"
          disabled={!actions.canRevealResults}
          onClick={() => {
            sendRevealResults(slideId);
          }}
        >
          Reveal answers
        </Btn>
        <Btn
          size="md"
          shape="pill"
          disabled={!actions.canAdvance}
          variant={hasSlide ? undefined : "brand"}
          onClick={sendAdvance}
        >
          {hasSlide ? "Next round" : "Start round"}
        </Btn>

        {/* Timed rounds only: freeze/unfreeze the auto-close countdown. */}
        {(actions.canPauseTimer || actions.canResumeTimer) && (
          <Btn
            shape="pill"
            size="md"
            onClick={() => {
              if (actions.canPauseTimer) sendPauseTimer(slideId);
              else sendResumeTimer(slideId);
            }}
          >
            {actions.canPauseTimer ? "Pause timer" : "Resume timer"}
          </Btn>
        )}

        <span className={styles.spacer} />

        <Btn
          shape="pill"
          size="md"
          variant="error"
          fill="ghost"
          onClick={() => {
            void handleEnd();
          }}
        >
          End session
        </Btn>
        <Btn
          shape="pill"
          size="md"
          variant="error"
          disabled={!actions.canRestart}
          onClick={() => {
            void handleRestart();
          }}
        >
          Restart
        </Btn>
      </div>
    </div>
  );
};

export { SessionControls };
