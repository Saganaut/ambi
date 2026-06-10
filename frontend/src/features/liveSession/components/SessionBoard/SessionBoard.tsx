// Central stage of the session presentation. Whatever the session is currently
// doing — showing a slide, asking a question, streaming live results, or wrapping
// up with the final standings — this is where it's rendered. It is the SAME
// surface whether projected on a shared screen or sitting on a participant's own
// device; the only difference is interactivity (a participant answers here, a
// host/projected view is read-only). Host moderation (ban/invite/mute) lives in
// the surrounding chrome, never on the board.
//
// SessionBoard itself stays a thin switch: `resolveBoardStage` decides the stage
// from session state and each stage component owns its own rendering.
import { Container } from "@components/Containers/Container";
import { useSession } from "@/features/liveSession/hooks/useSession";
import { resolveBoardStage } from "./resolveBoardStage";
import { BoardSlide } from "./stages/BoardSlide";
import { BoardQuestion } from "./stages/BoardQuestion";
import { BoardOverallResults } from "./stages/BoardOverallResults";
import { BoardLobby } from "./stages/BoardLobby";
import styles from "./SessionBoard.module.css";

interface SessionBoardProps {
  className?: string;
}

const SessionBoard = ({ className }: SessionBoardProps) => {
  // The merged session view plus the live fields the stage resolver needs:
  // roundResult is the reveal trigger (the reveal rides on /roundResult, not a
  // phase flip), and viewerIsHost decides interactive-vs-projected.
  const { interactiveSession, roundResult, viewerIsHost } = useSession();
  const stage = resolveBoardStage(
    interactiveSession,
    viewerIsHost,
    roundResult,
  );

  return (
    <Container
      name={"SessionBoard"}
      className={`${styles.sessionBoard} ${className ?? ""}`}>
      {stage.type === "lobby" && <BoardLobby session={interactiveSession} />}
      {stage.type === "slide" && <BoardSlide slide={stage.slide} />}
      {stage.type === "question" && (
        <BoardQuestion
          element={stage.element}
          mode={stage.mode}
          interactive={stage.interactive}
        />
      )}
      {stage.type === "overall" && (
        <BoardOverallResults session={interactiveSession} />
      )}
    </Container>
  );
};

export { SessionBoard };
