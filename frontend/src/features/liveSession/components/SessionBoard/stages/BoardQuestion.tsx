/**
 * Question stage component covering 4 moments via `mode`:
 * - prompt: Shows question. Interactive for participant; read-only for host/projector.
 * - liveResults: Shows response tally/live updates; correct answer hidden.
 * - vote: Best-answer voting (D3) — the anonymised submissions replace the
 *   per-kind content for every question kind.
 * - results: Shows final distribution + highlights correct answer.
 * * Shared header (title + instructions). Body switches on `contentType`
 * (MCQ, Q&A, Grid, Axis, Scales, Matching, Drawing, Text, Number built; others
 * fallback to placeholder).
 */
import { RichTextDisplay } from "@/shared/components/Forms/Input/RichTextDisplay/RichTextDisplay";
import type { SlideView } from "../../../store/liveSessionApi.gen";
import { AxisBoardContent } from "../content/AxisBoardContent";
import { BoardContentPlaceholder } from "../content/BoardContentPlaceholder";
import { DrawingBoardContent } from "../content/DrawingBoardContent";
import { GridBoardContent } from "../content/GridBoardContent";
import { MatchingBoardContent } from "../content/MatchingBoardContent";
import { McqBoardContent } from "../content/McqBoardContent";
import { NumberBoardContent } from "../content/NumberBoardContent";
import { QAndABoardContent } from "../content/QAndABoardContent";
import { ScalesBoardContent } from "../content/ScalesBoardContent";
import { TextBoardContent } from "../content/TextBoardContent";
import { VoteBoardContent } from "../content/VoteBoardContent";
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
      {slide.title && (
        <RichTextDisplay as="h2" value={slide.title} className={styles.prompt} />
      )}
      {slide.participantInstructions && (
        <p className={styles.instructions}>{slide.participantInstructions}</p>
      )}
    </header>
    <div className={styles.body}>{renderContent(slide, mode, interactive)}</div>
  </div>
);

const renderContent = (slide: SlideView, mode: BoardQuestionMode, interactive: boolean) => {
  // Voting replaces the per-kind surface: whatever kind was answered, the vote
  // moment shows the same anonymised option cards.
  if (mode === "vote") {
    return <VoteBoardContent slide={slide} interactive={interactive} />;
  }
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
    case "DRAWING":
      return <DrawingBoardContent slide={slide} mode={mode} interactive={interactive} />;
    case "TEXT":
      return <TextBoardContent slide={slide} mode={mode} interactive={interactive} />;
    case "NUMBER":
      return <NumberBoardContent slide={slide} mode={mode} interactive={interactive} />;
    default:
      // Per-kind presentation surfaces land incrementally; until then the round
      // still renders something coherent rather than a blank board.
      return <BoardContentPlaceholder slide={slide} mode={mode} />;
  }
};

export { BoardQuestion };
