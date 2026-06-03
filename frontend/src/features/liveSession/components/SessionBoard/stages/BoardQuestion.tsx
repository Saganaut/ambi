// Question stage — the prompt and its answer/result body. One component covers
// all three question moments via `mode` (prompt / liveResults / results) and
// both formats, rather than separate trees:
//   - prompt      → show the question; the body is interactive on a participant's
//                   own device, read-only when projected/host.
//   - liveResults → PRESENTATION opt-in; the tally builds while answering.
//   - results     → revealed/ended; distribution + correct-answer highlight.
//
// The header (prompt text + media) is shared; the body switches on
// `element.kind` and delegates to a per-kind component (mirrors
// DeckEditor/SlideDisplay). Only MCQ is built so far; everything else falls back
// to a placeholder, the same way the Gen-1 ElementRenderer staged its kinds.
import type { DeckElement } from "@/types/elements";
import { RichTextDisplay } from "@components/Forms/Input/RichTextDisplay/RichTextDisplay";
import { largestUrl } from "@utils/image";
import type { BoardQuestionMode } from "../resolveBoardStage";
import { McqBoardContent } from "../content/McqBoardContent";
import { BoardContentPlaceholder } from "../content/BoardContentPlaceholder";
import styles from "./BoardQuestion.module.css";

interface BoardQuestionProps {
  element: DeckElement;
  mode: BoardQuestionMode;
  interactive: boolean;
}

const BoardQuestion = ({ element, mode, interactive }: BoardQuestionProps) => {
  const prompt = "prompt" in element ? (element.prompt ?? "") : "";
  const mediaUrl = largestUrl(
    element.chrome?.image,
    `${element.id ?? ""}-media`,
  );

  return (
    <div className={styles.boardQuestion}>
      <header className={styles.header}>
        {prompt && <RichTextDisplay value={prompt} className={styles.prompt} />}
        {mediaUrl && (
          <img
            className={styles.media}
            src={mediaUrl}
            alt={element.chrome?.altText ?? ""}
          />
        )}
      </header>
      <div className={styles.body}>
        {renderContent(element, mode, interactive)}
      </div>
    </div>
  );
};

const renderContent = (
  element: DeckElement,
  mode: BoardQuestionMode,
  interactive: boolean,
) => {
  switch (element.kind) {
    case "McqQuestion":
      return (
        <McqBoardContent
          question={element}
          mode={mode}
          interactive={interactive}
        />
      );
    default:
      // Per-kind presentation surfaces land incrementally; until then the
      // round still renders something coherent rather than a blank board.
      return <BoardContentPlaceholder element={element} mode={mode} />;
  }
};

export { BoardQuestion };
