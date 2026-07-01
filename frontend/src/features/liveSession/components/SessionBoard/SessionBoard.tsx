// Central stage of the session presentation. Whatever the session is currently
// doing — showing a slide, asking a question, streaming live results, or wrapping
// up with the final standings — this is where it's rendered. It is the SAME
// surface whether projected on a shared screen or sitting on a participant's own
// device; the only difference is interactivity (a participant answers here, a
// host/projected view is read-only). Host moderation lives in the surrounding
// chrome, never on the board.
//
// SessionBoard itself stays a thin switch: `resolveBoardStage` decides the stage
// from the live read model and each stage component owns its own rendering.
import { Container } from "@components/Containers/Container";
import { useLiveSessionQuery } from "@/features/liveSession/hooks/useLiveSessionQuery";
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
  const state = useLiveSessionQuery();
  const stage = resolveBoardStage(state);

  return (
    <Container
      name={"SessionBoard"}
      className={`${styles.sessionBoard} ${className ?? ""}`}>
      {stage.type === "lobby" && (
        <BoardLobby joinCode={state.publicId} playerCount={state.roster.length} />
      )}
      {stage.type === "slide" && <BoardSlide slide={stage.slide} />}
      {stage.type === "question" && (
        <BoardQuestion
          slide={stage.slide}
          mode={stage.mode}
          interactive={stage.interactive}
        />
      )}
      {stage.type === "overall" && (
        <BoardOverallResults
          standings={state.finalScoreboard ?? state.scoreboard}
        />
      )}
    </Container>
  );
};

export { SessionBoard };
