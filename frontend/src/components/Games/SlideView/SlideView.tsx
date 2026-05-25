/**
 * Renders a non-interactive slide during a interactiveSession round (title / section /
 * callout / content / end card). The server auto-advances slides on their
 * display timer, so there's nothing for the player to do here — we just show a
 * countdown so the audience knows how long the slide will stay up.
 */
import styles from "./SlideView.module.css";
import type { Slide } from "../../../types/elements";
import { largestUrl } from "@/utils/image";

export interface SlideViewProps {
  slide: Slide;
  round: number;
  totalRounds: number;
  timeRemaining?: number;
}

const SlideView = ({
  slide,
  round,
  totalRounds,
  timeRemaining,
}: SlideViewProps) => {
  const title = slide.chrome?.title;
  const imageUrl = largestUrl(slide.chrome?.image, slide.id ?? "");
  return (
    <article className={styles.card} aria-label='Slide'>
      <div className={styles.meta}>
        <span className={styles.position}>
          Slide {round + 1} / {totalRounds}
        </span>
        {typeof timeRemaining === "number" && timeRemaining >= 0 && (
          <span className={styles.timer}>advancing in {timeRemaining}s</span>
        )}
      </div>

      {imageUrl && <img src={imageUrl} alt='' className={styles.image} />}

      {title && <h2 className={styles.title}>{title}</h2>}
      {slide.body && <p className={styles.body}>{slide.body}</p>}
    </article>
  );
};

export { SlideView };
