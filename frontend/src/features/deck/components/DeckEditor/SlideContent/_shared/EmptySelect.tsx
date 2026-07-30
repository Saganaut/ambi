// Placeholder shown in any slide editor when no slide is currently selected.
// Each editor passes the kind label as its title so the user still sees the
// editor's identity in the centre of the canvas.
import { SlideWrapper } from "../SlideWrapper";
import styles from "./_shared.module.css";

interface EmptySelectProps {
  title: string;
}

const EmptySelect = ({ title }: EmptySelectProps) => {
  return (
    <SlideWrapper title={title}>
      <p className={styles.emptySelect}>Select a slide to start editing.</p>
    </SlideWrapper>
  );
};

export { EmptySelect };
