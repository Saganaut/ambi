// The correct/incorrect toggle for an option, sourced from the per-option
// context. `stopPropagation` so a click here never bubbles to a surrounding
// card-click handler (which toggles the option menu); harmless where there's no
// such handler (the chart label).
import QuizPoints from "@assets/icons/content/quiz-points.svg?react";
import Sad from "@assets/icons/content/sad.svg?react";
import { IconBtn } from "@ui/Buttons/IconBtn";

import styles from "./OptionControls.module.css";

interface CorrectToggleProps {
  isCorrect: boolean;
  onToggleCorrect: () => void;
}

const CorrectToggle = ({ isCorrect, onToggleCorrect }: CorrectToggleProps) => {
  return (
    <IconBtn
      fill="ghost"
      size="xs"
      className={styles.correctBtn}
      aria-label={isCorrect ? "Mark as wrong" : "Mark as correct"}
      aria-pressed={isCorrect}
      onClick={(e) => {
        e.stopPropagation();
        onToggleCorrect();
      }}
      icon={isCorrect ? <QuizPoints /> : <Sad />}
    />
  );
};

export { CorrectToggle };
