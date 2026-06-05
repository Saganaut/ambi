// Style panel for the deck-editor right sidebar.
// TODO: useThemePicker (theme dropdown + preset list) is not yet implemented.
// TODO: useGalleryPicker (image picker modal) is not yet implemented.
// TODO: DeckResponse.defaultSessionFormat and defaultShowResponses are gone from
// the new model. Wire session defaults once those fields return.
// Background image for the active slide uses useSlide.setSlideImage / clearSlideImage.
import { getRouteApi } from "@tanstack/react-router";
import { useSlide } from "@/features/decks/hooks/useSlide";
import { Btn } from "@ui/Buttons/Btn";
import { ImagePicker } from "./ImagePicker";
import styles from "./ThemePanel.module.css";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const useThemePanel = () => {
  const { deckId } = routeApi.useParams();
  const { slideId } = routeApi.useSearch();
  const { getSlide, clearSlideImage } = useSlide(deckId);
  const slide = slideId ? getSlide(slideId) : undefined;
  return { deckId, slide, slideId, clearSlideImage };
};

const PerSlideStyle = () => {
  const { slide, slideId, clearSlideImage } = useThemePanel();

  if (!slide) return <div className={styles.section}><p>No slide selected.</p></div>;

  const id = slideId ?? slide.id;

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>This slide</h4>
      <ImagePicker
        label='Background image'
        image={slide.backgroundImage}
        seed={`${id}-background`}
        onPick={() => {
          // TODO: open gallery picker when available
        }}
        onClear={() => {
          clearSlideImage(id, "background");
        }}
      />
    </section>
  );
};

const ThemePanel = () => {
  useThemePanel();

  return (
    <div className={styles.panel}>
      <section className={styles.section}>
        <h4 className={styles.heading}>Deck theme</h4>
        {/* TODO: Wire theme picker dropdown once useThemePicker is implemented.
            The theme picker needs: preset list, user's custom themes, and
            a "+ New theme" action that opens ThemeEditor. */}
        <p className={styles.empty}>Theme picker coming soon.</p>
        <Btn
          type='button'
          className={styles.newBtn}
          onClick={() => {
            // TODO: open ThemeEditor modal
          }}>
          + New theme
        </Btn>
      </section>

      <section className={styles.section}>
        <h4 className={styles.heading}>Session defaults</h4>
        {/* TODO: DeckResponse.defaultSessionFormat and defaultShowResponses
            are not present in the new DeckResponse model. Wire these controls
            once those fields are re-added to the deck API. */}
        <p className={styles.empty}>Session defaults coming soon.</p>
      </section>

      <PerSlideStyle />
    </div>
  );
};

export { ThemePanel };
