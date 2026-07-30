// Non-interactive "correct answer" status mark: a brand-colored check shown
// beside an option marked correct. Replaces the old always-visible toggle in
// the editor's option card and chart label slots — the interactive toggle now
// lives inside the option menu — so at-a-glance correctness survives without
// an extra control. Renders nothing when the option isn't correct.
import { CheckIcon, QuestionMarkCircleIcon } from "@heroicons/react/24/outline";

import styles from "./CorrectBadge.module.css";

interface CorrectBadgeProps {
  isCorrect?: boolean;
}

const CorrectBadge = ({ isCorrect = false }: CorrectBadgeProps) => {
  return (
    <span className={styles.badge} role="img" aria-label="Correct answer" title="Correct answer">
      {isCorrect ? (
        <CheckIcon className={styles.icon} aria-hidden="true" />
      ) : (
        <QuestionMarkCircleIcon className={styles.icon} aria-hidden="true" />
      )}
    </span>
  );
};

export { CorrectBadge };
