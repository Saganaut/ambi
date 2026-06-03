// Standard "not scoreable" warning shown below the body of a scoreable slide
// editor. Always renders the slot so toggling the warning doesn't shift
// surrounding layout — visibility flips via `visible`.
import styles from "./_shared.module.css";

interface ScoringFooterProps {
  visible: boolean;
  message?: string;
}

const ScoringFooter = ({
  visible,
  message = "Not setting a correct answer means this slide is not scoreable.",
}: ScoringFooterProps) => {
  return (
    <p
      className={[styles.scoringFooter, visible ? "" : styles.scoringFooterHidden]
        .filter(Boolean)
        .join(" ")}>
      {message}
    </p>
  );
};

export { ScoringFooter };
