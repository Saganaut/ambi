// Per-slide cover image picker. Uses useSlide to access the slide's coverImage
// and the setSlideImage / clearSlideImage handlers; picks go through the
// shared useGalleryPicker modal.
import { getRouteApi } from "@tanstack/react-router";
import { useSlide } from "@deck/hooks/useSlide";
import { useGalleryPicker } from "@hooks/useGalleryPicker";
import { ImagePicker } from "../ImagePicker";
import styles from "@deck/components/DeckEditor/RightSidebar/EditSlidePanel/EditSlidePanel.module.css";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const useSlideImageSection = () => {
  const { deckId } = routeApi.useParams();
  const { slideId } = routeApi.useSearch();
  const { getSlide, setSlideImage, clearSlideImage } = useSlide(deckId);
  const slide = slideId ? getSlide(slideId) : undefined;
  return { slide, slideId: slideId ?? "", setSlideImage, clearSlideImage };
};

const SlideImageSection = () => {
  const { slide, slideId, setSlideImage, clearSlideImage } =
    useSlideImageSection();
  const openPicker = useGalleryPicker();

  if (!slide) return null;

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>Content image</h4>
      <ImagePicker
        label='Content image'
        image={slide.coverImage}
        seed={`${slideId}-content`}
        onPick={() => {
          openPicker(
            (image) => {
              setSlideImage(slideId, "cover", image);
            },
            { title: "Content image", cropWidth: 16, cropHeight: 9 },
          );
        }}
        onClear={() => {
          clearSlideImage(slideId, "cover");
        }}
      />
    </section>
  );
};

export { SlideImageSection };
