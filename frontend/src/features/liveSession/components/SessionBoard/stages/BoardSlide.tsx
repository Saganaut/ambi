// Display-only slide stage. Slides (title / section / callout / content / end)
// carry no answers and no results, so this is identical for everyone — host,
// projected screen, or a participant's device. Renders the slide's background
// media plus its title and body, centred. The `slideKind` drives a layout
// variant class so a TITLE card and a SECTION divider can diverge in CSS
// without branching here.
import type { Slide } from "@/types/elements";
import { RichTextDisplay } from "@components/Forms/Input/RichTextDisplay/RichTextDisplay";
import { largestUrl } from "@utils/image";
import styles from "./BoardSlide.module.css";

interface BoardSlideProps {
  slide: Slide;
}

const BoardSlide = ({ slide }: BoardSlideProps) => {
  const backgroundUrl = largestUrl(
    slide.chrome?.background,
    `${slide.id ?? ""}-background`,
  );
  const title = slide.chrome?.title ?? slide.heading;
  // Only SECTION diverges in layout today; everything else uses the base card.
  const variantClass = slide.slideKind === "SECTION" ? styles.kindSECTION : "";

  return (
    <div
      className={`${styles.boardSlide} ${variantClass}`}
      style={
        {
          "--slide-bg": backgroundUrl ? `url("${backgroundUrl}")` : "none",
        } as React.CSSProperties
      }>
      <div className={styles.content}>
        {title && <h1 className={styles.title}>{title}</h1>}
        {slide.body && (
          <RichTextDisplay value={slide.body} className={styles.body} />
        )}
      </div>
    </div>
  );
};

export { BoardSlide };
