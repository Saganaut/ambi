// Style panel for the deck-editor right sidebar.
// TODO: DeckResponse.defaultSessionFormat and defaultShowResponses are gone from
// the new model. Wire session defaults once those fields return.
// Deck cover/background use useDeckImage; the active slide's background uses
// useSlide.setSlideImage / clearSlideImage. All picks go through useGalleryPicker.
import { getRouteApi } from "@tanstack/react-router";
import { useSlide } from "@deck/hooks/useSlide";
import { useDeck } from "@deck/hooks/useDeck";
import { useModal } from "@hooks/useModal";
import { useGalleryPicker } from "@hooks/useGalleryPicker";
import { useGetThemeQuery } from "@features/theme/store/themeApi.gen";
import { ThemeModal } from "@components/Theme/ThemeModal/ThemeModal";
import { Btn } from "@ui/Buttons/Btn";
import { ImagePicker } from "./ImagePicker";
import { useDeckImage } from "./useDeckImage";
import styles from "./ThemePanel.module.css";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const useThemePanel = () => {
  const { deckId } = routeApi.useParams();
  const { slideId } = routeApi.useSearch();
  const { getSlide, setSlideImage, clearSlideImage } = useSlide(deckId);
  const slide = slideId ? getSlide(slideId) : undefined;
  return { deckId, slide, slideId, setSlideImage, clearSlideImage };
};

const DeckTheme = ({ deckId }: { deckId: string }) => {
  const { deck, updateDeck } = useDeck(deckId);
  const { openModal, closeModal } = useModal();

  const themeId = deck?.themeId;
  // Resolve the applied theme's name for the summary line; skipped when unset.
  const { data: activeTheme } = useGetThemeQuery(
    { id: themeId ?? "" },
    { skip: !themeId },
  );

  const openThemeModal = () => {
    openModal({
      title: "Theme",
      content: (
        <ThemeModal
          activeThemeId={themeId}
          onApply={(theme) => {
            updateDeck({ themeId: theme.id });
          }}
          onClose={closeModal}
        />
      ),
    });
  };

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>Deck theme</h4>
      <p className={styles.empty}>
        {themeId ? (activeTheme?.name ?? "Custom theme") : "No theme applied."}
      </p>
      <Btn type='button' className={styles.newBtn} onClick={openThemeModal}>
        {themeId ? "Change theme" : "Choose theme"}
      </Btn>
    </section>
  );
};

// Deck-level cover + background tiles. Seeds reuse the canonical placeholder
// seeds from utils/deckImages.ts so the sidebar thumbnails match the deck-card
// and session-background placeholders.
const DeckImages = ({ deckId }: { deckId: string }) => {
  const {
    coverImage,
    backgroundImage,
    setCoverImage,
    clearCoverImage,
    setBackgroundImage,
    clearBackgroundImage,
  } = useDeckImage();
  const openPicker = useGalleryPicker();

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>Deck</h4>
      <ImagePicker
        label='Cover image'
        image={coverImage}
        seed={`ambi-deck-cover-${deckId}`}
        onPick={() => {
          openPicker(setCoverImage, {
            title: "Deck cover image",
            cropWidth: 16,
            cropHeight: 9,
          });
        }}
        onClear={clearCoverImage}
      />
      <ImagePicker
        label='Background image'
        image={backgroundImage}
        seed={`ambi-deck-bg-${deckId}`}
        onPick={() => {
          openPicker(setBackgroundImage, {
            title: "Deck background image",
            cropWidth: 16,
            cropHeight: 9,
          });
        }}
        onClear={clearBackgroundImage}
      />
    </section>
  );
};

const PerSlideStyle = () => {
  const { slide, slideId, setSlideImage, clearSlideImage } = useThemePanel();
  const openPicker = useGalleryPicker();

  if (!slide)
    return (
      <div className={styles.section}>
        <p>No slide selected.</p>
      </div>
    );

  const id = slideId ?? slide.id;

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>This slide</h4>
      <ImagePicker
        label='Background image'
        image={slide.backgroundImage}
        seed={`${id}-background`}
        onPick={() => {
          openPicker(
            (image) => {
              setSlideImage(id, "background", image);
            },
            {
              title: "Slide background image",
              cropWidth: 16,
              cropHeight: 9,
            },
          );
        }}
        onClear={() => {
          clearSlideImage(id, "background");
        }}
      />
    </section>
  );
};

const ThemePanel = () => {
  const { deckId } = useThemePanel();

  return (
    <div className={styles.panel}>
      <DeckTheme deckId={deckId} />

      <DeckImages deckId={deckId} />

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
