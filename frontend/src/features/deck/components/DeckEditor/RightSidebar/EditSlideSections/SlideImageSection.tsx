// Per-slide cover image picker. Uses useSlide to access the slide's coverImage
// and the setSlideImage / clearSlideImage handlers.
// TODO: Wire a gallery picker when one is available — currently onPick is a no-op.
import { getRouteApi } from "@tanstack/react-router";
import { useSlide } from "@deck/hooks/useSlide";
import { ImagePicker } from "../ImagePicker";
import styles from "../EditSlidePanel.module.css";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const useSlideImageSection = () => {
  const { deckId } = routeApi.useParams();
  const { slideId } = routeApi.useSearch();
  const { getSlide, clearSlideImage } = useSlide(deckId);
  const slide = slideId ? getSlide(slideId) : undefined;
  return { slide, slideId: slideId ?? "", clearSlideImage };
};

const SlideImageSection = () => {
  const { slide, slideId, clearSlideImage } = useSlideImageSection();

  if (!slide) return null;

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>Content image</h4>
      <ImagePicker
        label='Content image'
        image={slide.coverImage}
        seed={`${slideId}-content`}
        onPick={() => {
          // TODO: open gallery picker when available
        }}
        onClear={() => {
          clearSlideImage(slideId, "cover");
        }}
      />
    </section>
  );
};

export { SlideImageSection };
