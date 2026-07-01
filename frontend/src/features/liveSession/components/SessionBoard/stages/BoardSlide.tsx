// Display-only slide stage. Slides (title / section / media) carry no answers and
// no results, so this is identical for everyone — host, projected screen, or a
// participant's device. Renders the slide's background colour plus its section
// eyebrow and title, centred.
import type { SlideView } from "../../../store/liveSessionApi.gen";
import styles from "./BoardSlide.module.css";

interface BoardSlideProps {
  slide: SlideView;
}

const BoardSlide = ({ slide }: BoardSlideProps) => (
  <div
    className={styles.boardSlide}
    style={
      {
        "--slide-bg": slide.hideBackground
          ? "none"
          : (slide.backgroundColor ?? "none"),
      } as React.CSSProperties
    }>
    <div className={styles.content}>
      {slide.section && <p className={styles.eyebrow}>{slide.section}</p>}
      {slide.title && <h1 className={styles.title}>{slide.title}</h1>}
      {slide.participantInstructions && (
        <p className={styles.body}>{slide.participantInstructions}</p>
      )}
    </div>
  </div>
);

export { BoardSlide };
