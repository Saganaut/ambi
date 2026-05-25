// Fallback body for question kinds whose presentation surface isn't built yet.
// Mirrors the Gen-1 ElementRenderer's PlaceholderAnswer approach: the round
// still renders something coherent (which kind, which moment) instead of a blank
// board, so the rest of the session flow is demonstrable while per-kind surfaces
// land one at a time.
import type { DeckElement } from "@/types/elements";
import type { BoardQuestionMode } from "../resolveBoardStage";
import styles from "./BoardContentPlaceholder.module.css";

interface BoardContentPlaceholderProps {
  element: DeckElement;
  mode: BoardQuestionMode;
}

const MODE_LABEL: Record<BoardQuestionMode, string> = {
  prompt: "answering",
  liveResults: "live results",
  results: "results",
};

const BoardContentPlaceholder = ({
  element,
  mode,
}: BoardContentPlaceholderProps) => (
  <div className={styles.boardContentPlaceholder}>
    <p className={styles.kind}>{element.kind}</p>
    <p className={styles.note}>
      Presentation view for this question type is coming soon ({MODE_LABEL[mode]}
      ).
    </p>
  </div>
);

export { BoardContentPlaceholder };
