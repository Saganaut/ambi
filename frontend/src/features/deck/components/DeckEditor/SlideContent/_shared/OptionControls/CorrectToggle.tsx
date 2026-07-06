// The correct/incorrect toggle for an option, sourced from the per-option
// context. Reads as a status mark per the option-menu design: a brand-colored
// check when the option is correct, a muted dash otherwise; [aria-pressed]
// carries the state for both styling and assistive tech. `stopPropagation` so
// a click here never bubbles to a surrounding card-click handler (which
// toggles the option menu); harmless where there's no such handler (the chart
// label).
import { CheckIcon, MinusSmallIcon } from "@heroicons/react/24/outline";
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
      icon={isCorrect ? <CheckIcon /> : <MinusSmallIcon />}
    />
  );
};

export { CorrectToggle };
