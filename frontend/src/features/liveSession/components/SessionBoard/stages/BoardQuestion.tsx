/**
 * Question stage component covering 3 moments via `mode`:
 * - prompt: Shows question. Interactive for participant; read-only for host/projector.
 * - liveResults: Shows response tally/live updates; correct answer hidden.
 * - results: Shows final distribution + highlights correct answer.
 * * Shared header (title + instructions). Body switches on `contentType`
 * (MCQ, Q&A, Grid, Axis, Scales, Matching built; others fallback to placeholder).
 */
import type { SlideView } from "../../../store/liveSessionApi.gen";
import { AxisBoardContent } from "../content/AxisBoardContent";
import { BoardContentPlaceholder } from "../content/BoardContentPlaceholder";
import { GridBoardContent } from "../content/GridBoardContent";
import { MatchingBoardContent } from "../content/MatchingBoardContent";
import { McqBoardContent } from "../content/McqBoardContent";
import { QAndABoardContent } from "../content/QAndABoardContent";
import { ScalesBoardContent } from "../content/ScalesBoardContent";
import type { BoardQuestionMode } from "../resolveBoardStage";
import styles from "./BoardQuestion.module.css";

interface BoardQuestionProps {
  slide: SlideView;
  mode: BoardQuestionMode;
  interactive: boolean;
}

const BoardQuestion = ({ slide, mode, interactive }: BoardQuestionProps) => (
  <div className={styles.boardQuestion}>
    <header className={styles.header}>
      {slide.title && <h2 className={styles.prompt}>{slide.title}</h2>}
      {slide.participantInstructions && (
        <p className={styles.instructions}>{slide.participantInstructions}</p>
      )}
    </header>
    <div className={styles.body}>{renderContent(slide, mode, interactive)}</div>
  </div>
);

const renderContent = (slide: SlideView, mode: BoardQuestionMode, interactive: boolean) => {
  switch (slide.contentType) {
    case "MCQ":
      return <McqBoardContent slide={slide} mode={mode} interactive={interactive} />;
    case "Q_AND_A":
      return <QAndABoardContent slide={slide} mode={mode} interactive={interactive} />;
    case "GRID":
      return <GridBoardContent slide={slide} mode={mode} interactive={interactive} />;
    case "AXIS":
      return <AxisBoardContent slide={slide} mode={mode} interactive={interactive} />;
    case "SCALES":
      return <ScalesBoardContent slide={slide} mode={mode} interactive={interactive} />;
    case "MATCHING":
      return <MatchingBoardContent slide={slide} mode={mode} interactive={interactive} />;
    default:
      // Per-kind presentation surfaces land incrementally; until then the round
      // still renders something coherent rather than a blank board.
      return <BoardContentPlaceholder slide={slide} mode={mode} />;
  }
};

export { BoardQuestion };
