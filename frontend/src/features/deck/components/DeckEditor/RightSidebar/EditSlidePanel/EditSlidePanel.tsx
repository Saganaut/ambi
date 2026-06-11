// Top-level dispatcher for the deck-editor's "edit" drawer. Reads the active
// slide from the slide cache (via useSlide), mounts the per-kind options
// section, then the image section, session pacing, and provenance footer.
// Per-kind sections each own their own useSlideEditor instance.
import { getRouteApi } from "@tanstack/react-router";
import { useSlide } from "@deck/hooks/useSlide";
import type { SlideType } from "@deck/store/deckEnums.gen";
import { SlideOptionsSection } from "../EditSlideSections/SlideOptionsSection";
import { FollowUpAttachSection } from "../EditSlideSections/FollowUpAttachSection";
import { FollowUpOptionsSection } from "../EditSlideSections/FollowUpOptionsSection";
import { McqOptionsSection } from "../EditSlideSections/McqOptionsSection";
import { TextOptionsSection } from "../EditSlideSections/TextOptionsSection";
import { NumberOptionsSection } from "../EditSlideSections/NumberOptionsSection";
import { RankingOptionsSection } from "../EditSlideSections/RankingOptionsSection";
import { QAndAOptionsSection } from "../EditSlideSections/QAndAOptionsSection";
import { SlideImageSection } from "../EditSlideSections/SlideImageSection";
import { SessionPacingSection } from "../EditSlideSections/SessionPacingSection";
import { ProvenanceFooter } from "../EditSlideSections/ProvenanceFooter";
import styles from "./EditSlidePanel.module.css";
import { ImagePicker } from "../ImagePicker";
import { useGalleryPicker } from "@shared/hooks/useGalleryPicker";
import { Btn } from "@ui/Buttons/Btn";
import { Tooltip } from "@ui/Tooltip/Tooltip";
import { usePromoteBackgroundImageToDeckMutation } from "@deck/store/deckApiPromote";
import settingsPanel from "../SettingsForms/SettingsPanel.module.css";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const PerKindSection = ({ contentType }: { contentType: SlideType }) => {
  switch (contentType) {
    case "MCQ":
      return <McqOptionsSection />;
    case "TEXT":
      return <TextOptionsSection />;
    case "NUMBER":
      return <NumberOptionsSection />;
    case "RANKING":
      return <RankingOptionsSection />;
    case "Q_AND_A":
      return <QAndAOptionsSection />;
    case "FOLLOW_UP":
      return <FollowUpOptionsSection />;
    case "TITLE":
    case "MEDIA":
      return <SlideOptionsSection />;
    default:
      return null;
  }
};


const useThemePanel = () => {
  const { deckId } = routeApi.useParams();
  const { slideId } = routeApi.useSearch();
  const { getSlide, setSlideImage, clearSlideImage } = useSlide(deckId);
  const slide = slideId ? getSlide(slideId) : undefined;
  return { deckId, slide, slideId, setSlideImage, clearSlideImage };
};


const PerSlideStyle = () => {
  const { deckId, slide, slideId, setSlideImage, clearSlideImage } = useThemePanel();
  const openPicker = useGalleryPicker();
  const [promoteBackgroundImage] = usePromoteBackgroundImageToDeckMutation();

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


const EditSlidePanel = () => {
  const { deckId } = routeApi.useParams();
  const { slideId } = routeApi.useSearch();
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
      <PerKindSection contentType={slide.content.contentType} />
      <FollowUpAttachSection slide={slide} />
      <SlideImageSection />
      <SessionPacingSection />
      <ProvenanceFooter
        createdByUserId={slide.createdByUserId}
        lastEditedByUserId={slide.lastEditedByUserId}
        createdAt={undefined}
        updatedAt={undefined}
        version={slide.version}
      />

      <PerSlideStyle />
    </div>
  );
};

export { EditSlidePanel };
