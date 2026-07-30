// Top-level dispatcher for the deck-editor's "edit" drawer. Reads the active
// slide from the slide cache (via useSlide), mounts the per-kind options
// section, then the image section, session pacing, and provenance footer.
// Per-kind sections each own their own useSlideEditor instance.
import { slotMappingOptions } from "@/features/deck/contexts/ImageSlot.types";
import { deckAndSlideIdProps } from "@/features/deck/Deck.types";
import { useDeckQuery } from "@/features/deck/hooks/useDeckQuery";
import { useSlide } from "@deck/hooks/useSlide";
import {
  usePromoteBackgroundColorToDeckMutation,
  usePromoteBackgroundImageToDeckMutation,
  usePromoteClearedBackgroundColorToDeckMutation,
  usePromoteClearedBackgroundImageToDeckMutation,
} from "@deck/store/deckApi.gen";
import { useBackgroundSwatches } from "@features/theme/hooks/useBackgroundSwatches";
import { useDeckTheme } from "@features/theme/hooks/useDeckTheme";
import { ColorPicker } from "@shared/components/Forms/Input/ColorPicker/ColorPicker";
import { Toggle } from "@shared/components/Forms/Input/Toggle/Toggle";
import { useGalleryPicker } from "@shared/hooks/useGalleryPicker";
import { addRecentColor, useRecentColors } from "@shared/hooks/useRecentColors";
import { Btn } from "@ui/Buttons/Btn";
import { Tooltip } from "@ui/Tooltip/Tooltip";
import type { CSSProperties, HTMLProps } from "react";
import { FollowUpAttachSection } from "../EditSlideSections/FollowUpAttachSection";
import { ImagePicker } from "../shared/ImagePicker";
import settingsPanel from "../shared/SettingsPanel.module.css";
import styles from "./EditSlidePanel.module.css";

const PerSlideStyle = ({ deckId, slideId }: deckAndSlideIdProps) => {
  const { slides, getSlide, setSlideImage, clearSlideImage, hideSlideBackground } =
    useSlide(deckId);
  const slide = slideId ? getSlide(slideId) : undefined;

  const { deck } = useDeckQuery(deckId);
  const openPicker = useGalleryPicker();
  const [promoteBackgroundImage] = usePromoteBackgroundImageToDeckMutation();
  const [promoteClearedBackgroundImage] = usePromoteClearedBackgroundImageToDeckMutation();

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
  // Whether promoting this slide's *cleared* state would change anything: a
  // deck default or a per-slide override still exists somewhere in the deck.
  const anyImageToClear = deckHasBackground || slides.some((s) => s.backgroundImage != null);

  // Effective image mirrors what the canvas actually shows: own image wins,
  // then inherited deck image, then nothing (hidden or no deck background).
  const effectiveImage = hasOwnImage
    ? slide.backgroundImage
    : !isHidden && deckHasBackground
      ? deck?.backgroundImage
      : undefined;

  const handleClear = () => {
    if (hasOwnImage) {
      clearSlideImage(id, "background"); // own → inherit deck
    } else {
      hideSlideBackground(id); // inherited deck → hidden
    }
  };

  return (
    <section className={styles.section}>
      <ImagePicker
        label=""
        image={effectiveImage}
        seed={`${id}-background`}
        placeholderText="No background"
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
        onClear={handleClear}
      />
      {/* With no own image, choose between suppressing the deck background and
          inheriting it. Only meaningful when the deck actually has a background. */}
      {!hasOwnImage && deckHasBackground && (
        <Toggle
          labelPosition={"labelBefore"}
          label="Hide background"
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
      {/* "Make all slides look like this one": with an own image, promote it to
          the deck; without one, promote the cleared state — wipe the deck default
          and every per-slide override (the way to undo an earlier apply-to-all).
          The cleared variant only shows while there is still something to wipe. */}
      {hasOwnImage ? (
        <div className={settingsPanel.footer}>
          <Tooltip
            className={settingsPanel.applyTooltip}
            label="Sets this as the deck background and removes all per-slide background overrides, so every slide inherits it."
          >
            <Btn
              variant="secondary"
              fill="bordered"
              onClick={() => {
                if (slide.backgroundImage != null)
                  void promoteBackgroundImage({
                    id: deckId,
                    setImageRequest: { image: slide.backgroundImage },
                  });
              }}
            >
              Apply to all slides
            </Btn>
          </Tooltip>
        </div>
      ) : (
        anyImageToClear && (
          <div className={settingsPanel.footer}>
            <Tooltip
              className={settingsPanel.applyTooltip}
              label="Removes the deck background and all per-slide background overrides, so no slide shows a background image."
            >
              <Btn
                variant="secondary"
                fill="bordered"
                onClick={() => {
                  void promoteClearedBackgroundImage({ id: deckId });
                }}
              >
                Apply to all slides
              </Btn>
            </Tooltip>
          </div>
        )
      )}
    </section>
  );
};

// The color counterpart to PerSlideStyle's background image. A color composes
// behind the image, follows its own inherit-from-deck cascade, and (like the
// image) can be promoted to the deck via "Apply to all slides". There is no
// hide toggle here — the shared `hideBackground` flag lives with the image
// section above and suppresses the inherited color too.
const PerSlideColor = ({ deckId, slideId }: deckAndSlideIdProps) => {
  const { slides, getSlide, setSlideColor, clearSlideColor } = useSlide(deckId);
  const slide = slideId ? getSlide(slideId) : undefined;

  const { deck } = useDeckQuery(deckId);
  const [promoteBackgroundColor] = usePromoteBackgroundColorToDeckMutation();
  const [promoteClearedBackgroundColor] = usePromoteClearedBackgroundColorToDeckMutation();
  const recentColors = useRecentColors();
  // The theme painting this deck's canvas (deck theme supersedes the global
  // one); its surface roles become the quick-pick swatches, so a presenter's
  // quick picks are the deck's own colors. Recent colors and the custom picker
  // (ColorPicker's rainbow tile) cover everything outside that set.
  const { spec: deckThemeSpec } = useDeckTheme(deck?.themeId);
  const backgroundSwatches = useBackgroundSwatches(deckThemeSpec);

  if (!slide) return null;

  const id = slideId ?? slide.id;
  const ownColor = slide.backgroundColor ?? undefined;
  // The color in effect: an own color wins; otherwise inherit the deck color —
  // unless the slide suppresses the inherited background entirely.
  const inheritedColor = slide.hideBackground ? undefined : deck?.backgroundColor;
  const effectiveColor = ownColor ?? inheritedColor ?? undefined;
  // Whether promoting this slide's *cleared* state would change anything: a
  // deck default or a per-slide override still exists somewhere in the deck.
  const anyColorToClear =
    deck?.backgroundColor != null || slides.some((s) => s.backgroundColor != null);

  return (
    <section className={styles.section}>
      <ColorPicker
        value={effectiveColor}
        colorSwatch={backgroundSwatches}
        recentlyUsedColorSwatch={recentColors}
        label="Background color"
        onChange={(color) => {
          setSlideColor(id, color);
          addRecentColor(color);
        }}
        // Clearing is "reset to deck" — only offered once the slide has its own
        // color to drop.
        onClear={ownColor != null ? () => clearSlideColor(id) : undefined}
        renderTrigger={(triggerProps) => (
          // triggerProps carries floating-ui's callback ref (typed for a
          // generic HTMLElement); it attaches fine to a button at runtime.
          <button
            {...(triggerProps as HTMLProps<HTMLButtonElement>)}
            type="button"
            className={styles.colorTrigger}
          >
            <span>Background color</span>
            <span
              className={styles.colorTriggerSwatch}
              style={{ "--trigger-swatch": effectiveColor ?? "transparent" } as CSSProperties}
              aria-hidden="true"
            />
          </button>
        )}
      />
      {/* Same promote pattern as the image section: an own color promotes to the
          deck; no own color promotes the cleared state — wipe the deck color and
          every per-slide override (the way to undo an earlier apply-to-all) —
          shown only while there is still something to wipe. */}
      {ownColor != null ? (
        <div className={settingsPanel.footer}>
          <Tooltip
            className={settingsPanel.applyTooltip}
            label="Sets this as the deck background color and removes all per-slide color overrides, so every slide inherits it."
          >
            <Btn
              variant="secondary"
              fill="bordered"
              onClick={() => {
                if (slide.backgroundColor != null)
                  void promoteBackgroundColor({
                    id: deckId,
                    setColorRequest: { color: slide.backgroundColor },
                  });
              }}
            >
              Apply to all slides
            </Btn>
          </Tooltip>
        </div>
      ) : (
        anyColorToClear && (
          <div className={settingsPanel.footer}>
            <Tooltip
              className={settingsPanel.applyTooltip}
              label="Removes the deck background color and all per-slide color overrides, so no slide has a background color."
            >
              <Btn
                variant="secondary"
                fill="bordered"
                onClick={() => {
                  void promoteClearedBackgroundColor({ id: deckId });
                }}
              >
                Apply to all slides
              </Btn>
            </Tooltip>
          </div>
        )
      )}
    </section>
  );
};

// On hover we change the placement but don't save changes in backend. On click we fully save changes
// So we have the current position saved so we can go back to it.
// Need a mapping

const FeatureImageSelector = ({ deckId, slideId }: deckAndSlideIdProps) => {
  const { getSlide, setSlideImage, clearSlideImage } = useSlide(deckId);

  const slide = getSlide(slideId);
  const openPicker = useGalleryPicker();
  const defaultPlacement = slotMappingOptions[0];

  // const updateSlidePlacement = (slidePlacement: SlotMapping) => {
  //   if (slide?.coverImage == null) return;
  //   setSlideImage(slideId, "cover", slide?.coverImage, slidePlacement);
  // };

  return (
    <>
      <ImagePicker
        label={""}
        image={slide?.coverImage}
        onClear={() => {
          clearSlideImage(slideId, "cover");
        }}
        onPick={() => {
          openPicker(
            (image) => {
              setSlideImage(slideId, "cover", image, defaultPlacement);
            },
            {
              title: "Slide background image",
              cropWidth: 16,
              cropHeight: 9,
            },
          );
        }}
      />

      {/* <ImagePlacementPicker updateSlidePlacement={updateSlidePlacement} /> */}
    </>
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
      <PerSlideColor deckId={deckId} slideId={slideId} />
      {/* <FeatureImageSelector deckId={deckId} slideId={slideId} /> */}
      <FollowUpAttachSection slide={slide} />
    </div>
  );
};

export { EditSlidePanel };
