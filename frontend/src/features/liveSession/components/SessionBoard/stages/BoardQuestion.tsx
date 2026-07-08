// Question stage — the prompt and its answer/result body. One component covers
// all three question moments via `mode` (prompt / liveResults / results):
//   - prompt      → show the question; the body is interactive on a participant's
//                   own device, read-only when projected/host.
//   - liveResults → the tally is visible (responses revealed / live), but the
//                   correct answer is not yet disclosed.
//   - results     → revealed: distribution + correct-answer highlight.
//
// The header (title + instructions) is shared; the body switches on the slide's
// `contentType` and delegates to a per-kind component. MCQ, Q&A, Grid, Axis,
// Scales and Matching are built so far; everything else falls back to a placeholder.
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
