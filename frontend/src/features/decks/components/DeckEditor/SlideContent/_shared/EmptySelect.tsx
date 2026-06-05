// Placeholder shown in any slide editor when no slide is currently selected.
// Each editor passes the kind label as its title so the user still sees the
// editor's identity in the centre of the canvas.
import { SlideContentWrapper } from "../SlideContentWrapper";
import styles from "./_shared.module.css";

interface EmptySelectProps {
  title: string;
}

const EmptySelect = ({ title }: EmptySelectProps) => {
  return (
    <SlideContentWrapper title={title}>
      <p className={styles.emptySelect}>Select a slide to start editing.</p>
    </SlideContentWrapper>
  );
};

export { EmptySelect };
