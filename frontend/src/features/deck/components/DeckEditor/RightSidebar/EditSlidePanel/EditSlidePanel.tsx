// Top-level dispatcher for the deck-editor's "edit" drawer. Reads the active
// slide from the slide cache (via useSlide), mounts the per-kind options
// section, then the image section, session pacing, and provenance footer.
// Per-kind sections each own their own useSlideEditor instance.
import { useSlide } from "@deck/hooks/useSlide";
import { FollowUpAttachSection } from "../EditSlideSections/FollowUpAttachSection";
import styles from "./EditSlidePanel.module.css";
import { ImagePicker } from "../shared/ImagePicker";
import { useGalleryPicker } from "@shared/hooks/useGalleryPicker";
import { Btn } from "@ui/Buttons/Btn";
import { Tooltip } from "@ui/Tooltip/Tooltip";
import { Toggle } from "@shared/components/Forms/Input/Toggle/Toggle";
import { usePromoteBackgroundImageToDeckMutation } from "@deck/store/deckApi.gen";
import settingsPanel from "../shared/SettingsPanel.module.css";
import { useDeck } from "@/features/deck/hooks/useDeck";
import { deckAndSlideIdProps } from "@/features/deck/deck.types";





const useThemePanel = ({ deckId, slideId }: deckAndSlideIdProps) => {


  const { getSlide, setSlideImage, clearSlideImage, hideSlideBackground } =
    useSlide(deckId);
  const slide = slideId ? getSlide(slideId) : undefined;
  return { deckId, slide, slideId, setSlideImage, clearSlideImage, hideSlideBackground };
};


const PerSlideStyle = ({ deckId, slideId }: deckAndSlideIdProps) => {
  const { slide, setSlideImage, clearSlideImage, hideSlideBackground } =
    useThemePanel({ deckId, slideId });
  const { deck } = useDeck(deckId);
  const openPicker = useGalleryPicker();
  const [promoteBackgroundImage] = usePromoteBackgroundImageToDeckMutation();

  if (!slide)
    return (
      <div className={styles.section}>
        <p>No slide selected.</p>
      </div>
    );

  const id = slideId ?? slide.id;
  // Three-state background: an own image wins; else `hideBackground` toggles
  // between "no background at all" and inheriting the deck default.
  const hasOwnImage = slide.backgroundImage != null;
  const isHidden = slide.hideBackground === true;
  const deckHasBackground = deck?.backgroundImage != null;

  return (
    <section className={styles.section}>
      <ImagePicker
        label=''
        image={slide.backgroundImage}
        seed={`${id}-background`}
        placeholderText={isHidden ? "No background" : "Choose background"}
        // Preview the inherited deck background in the empty tile — but not when
        // the slide explicitly suppresses it, since then nothing is inherited.
        placeholderBackgroundImageUrl={
          isHidden ? undefined : deck?.backgroundImage?.variants?.SM
        }
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
      {/* With no own image, choose between suppressing the deck background and
          inheriting it. Only meaningful when the deck actually has a background. */}
      {!hasOwnImage && deckHasBackground && (
        <Toggle
          labelPosition={"labelBefore"}
          label='Hide background'
          checked={isHidden}

          onChange={() => {
            if (isHidden) {
              clearSlideImage(id, "background");
            } else {
              hideSlideBackground(id);
            }
          }}
        />
      )}
      {slide.backgroundImage != null && (
        <div className={settingsPanel.footer}>
          <Tooltip
            className={settingsPanel.applyTooltip}
            label='Sets this as the deck background and removes all per-slide background overrides, so every slide inherits it.'>
            <Btn
              variant='secondary'
              fill='bordered'
              onClick={() => {
                if (slide.backgroundImage != null)
                  void promoteBackgroundImage({
                    id: deckId,
                    setImageRequest: { image: slide.backgroundImage },
                  });
              }}>
              Apply to deck
            </Btn>
          </Tooltip>
        </div>
      )}
    </section>
  );
};


const EditSlidePanel = ({ deckId, slideId }: deckAndSlideIdProps) => {

  const { getSlide } = useSlide(deckId);
  const slide = slideId ? getSlide(slideId) : undefined;

  if (!slide) {
    return (
      <div className={styles.empty}>
        <p>Select a slide on the left to edit its display options.</p>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <PerSlideStyle deckId={deckId} slideId={slideId} />
      <FollowUpAttachSection slide={slide} />
      {/* <ProvenanceFooter
        createdByUserId={slide.createdByUserId}
        lastEditedByUserId={slide.lastEditedByUserId}
        createdAt={undefined}
        updatedAt={undefined}
        version={slide.version}
      /> */}

    </div>
  );
};

export { EditSlidePanel };
