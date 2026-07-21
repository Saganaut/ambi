// Fallback body for question kinds whose presentation surface isn't built yet.
// The round still renders something coherent (which kind, which moment) instead
// of a blank board, so the rest of the session flow is demonstrable while
// per-kind surfaces land one at a time.
import type { SlideView } from "../../../store/liveSessionApi.gen";
import type { BoardQuestionMode } from "../resolveBoardStage";
import styles from "./BoardContentPlaceholder.module.css";

interface BoardContentPlaceholderProps {
  slide: SlideView;
  mode: BoardQuestionMode;
}

const MODE_LABEL: Record<BoardQuestionMode, string> = {
  prompt: "answering",
  liveResults: "live results",
  vote: "voting",
  results: "results",
};

const BoardContentPlaceholder = ({
  slide,
  mode,
}: BoardContentPlaceholderProps) => (
  <div className={styles.boardContentPlaceholder}>
    <p className={styles.kind}>{slide.contentType ?? "UNKNOWN"}</p>
    <p className={styles.note}>
      Presentation view for this question type is coming soon ({MODE_LABEL[mode]}
      ).
    </p>
  </div>
);

export { BoardContentPlaceholder };
