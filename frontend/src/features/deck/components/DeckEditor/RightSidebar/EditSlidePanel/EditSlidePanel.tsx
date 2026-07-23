// Top-level dispatcher for the deck-editor's "edit" drawer. Reads the active
// slide from the slide cache (via useSlide), mounts the per-kind options
// section, then the image section, session pacing, and provenance footer.
// Per-kind sections each own their own useSlideEditor instance.
import { SlotMapping, slotMappingOptions } from "@/features/deck/contexts/ImageSlot.types";
import { deckAndSlideIdProps } from "@/features/deck/Deck.types";
import { useDeckQuery } from "@/features/deck/hooks/useDeckQuery";
import { useSlide } from "@deck/hooks/useSlide";
import {
  usePromoteBackgroundColorToDeckMutation,
  usePromoteBackgroundImageToDeckMutation,
} from "@deck/store/deckApi.gen";
import { ColorPicker } from "@shared/components/Forms/Input/ColorPicker/ColorPicker";
import type { ColorValue } from "@shared/components/Forms/Input/ColorPicker/ColorPicker";
import { Toggle } from "@shared/components/Forms/Input/Toggle/Toggle";
import { DEFAULT_PALETTE } from "@features/theme/palette";
import type { Palette } from "@features/theme/store/themeApi.gen";
import { useDeckTheme } from "@features/theme/hooks/useDeckTheme";
import { useGalleryPicker } from "@shared/hooks/useGalleryPicker";
import { addRecentColor, useRecentColors } from "@shared/hooks/useRecentColors";
import { Btn } from "@ui/Buttons/Btn";
import { Tooltip } from "@ui/Tooltip/Tooltip";
import type { CSSProperties, HTMLProps } from "react";
import { FollowUpAttachSection } from "../EditSlideSections/FollowUpAttachSection";
import { ImagePicker } from "../shared/ImagePicker";
import settingsPanel from "../shared/SettingsPanel.module.css";
import styles from "./EditSlidePanel.module.css";

// The palette roles offered as background quick-pick swatches — the theme's
// surface tones (canvas → subtle), the ones that read as backgrounds. Ordered
// lightest-surface-first.
const BACKGROUND_SURFACE_ROLES: (keyof Palette)[] = [
  "canvas",
  "surface",
  "surfaceRaised",
  "subtle",
];

// The background field is backend-validated to a 6-digit hex (#RRGGBB); a theme
// *may* author a role in another CSS format, so only offer hex-safe swatches.
const HEX6_RX = /^#[0-9a-fA-F]{6}$/;

// Background quick-pick swatches sourced from the active theme's surface roles,
// so a presenter's quick picks are the deck's own theme colors. Palette roles
// are stored as hex and commit straight through to the (hex-only) color field.
// Deduped (a theme may map two surface roles to the same hex — the swatch grid
// keys by color, so duplicates would collide). Recent colors and the custom
// picker (ColorPicker's rainbow tile) cover everything outside this set.
const backgroundSwatchesFor = (palette: Palette): ColorValue[] => {
  const seen = new Set<string>();
  const swatches: ColorValue[] = [];
  for (const role of BACKGROUND_SURFACE_ROLES) {
    const color = palette[role];
    if (typeof color !== "string" || !HEX6_RX.test(color)) continue;
    const key = color.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    swatches.push(color as ColorValue);
  }
  return swatches;
};

import { ImagePlacementPicker } from "./ImagePlacementPicker/ImagePlacementPicker";

const PerSlideStyle = ({ deckId, slideId }: deckAndSlideIdProps) => {
  const { getSlide, setSlideImage, clearSlideImage, hideSlideBackground } = useSlide(deckId);
  const slide = slideId ? getSlide(slideId) : undefined;

  const { deck } = useDeckQuery(deckId);
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

  // Effective image mirrors what the canvas actually shows: own image wins,
  // then inherited deck image, then nothing (hidden or no deck background).
  const effectiveImage =
    hasOwnImage ? slide.backgroundImage
    : !isHidden && deckHasBackground ? deck?.backgroundImage
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
      {slide.backgroundImage != null && (
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
  const { getSlide, setSlideColor, clearSlideColor } = useSlide(deckId);
  const slide = slideId ? getSlide(slideId) : undefined;

  const { deck } = useDeckQuery(deckId);
  const [promoteBackgroundColor] = usePromoteBackgroundColorToDeckMutation();
  const recentColors = useRecentColors();
  // The theme painting this deck's canvas (deck theme supersedes the global one);
  // its surface roles become the quick-pick swatches. No deck theme → the neutral
  // default palette, so there are always hex-safe surface picks to offer.
  const { spec: deckThemeSpec } = useDeckTheme(deck?.themeId);
  const themeSwatches = backgroundSwatchesFor(deckThemeSpec?.palette ?? DEFAULT_PALETTE);
  // A theme *may* author its surfaces in a non-hex CSS format (Palette allows
  // any CSS color); that would filter out to nothing, so fall back to the
  // default palette's (always-hex) surfaces to keep quick picks on offer.
  const backgroundSwatches =
    themeSwatches.length > 0 ? themeSwatches : backgroundSwatchesFor(DEFAULT_PALETTE);

  if (!slide) return null;

  const id = slideId ?? slide.id;
  const ownColor = slide.backgroundColor ?? undefined;
  // The color in effect: an own color wins; otherwise inherit the deck color —
  // unless the slide suppresses the inherited background entirely.
  const inheritedColor = slide.hideBackground ? undefined : deck?.backgroundColor;
  const effectiveColor = ownColor ?? inheritedColor ?? undefined;

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
      {ownColor != null && (
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

  const updateSlidePlacement = (slidePlacement: SlotMapping) => {
    if (slide?.coverImage == null) return;
    setSlideImage(slideId, "cover", slide?.coverImage, slidePlacement);
  };

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

      <ImagePlacementPicker updateSlidePlacement={updateSlidePlacement} />
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
      <FeatureImageSelector deckId={deckId} slideId={slideId} />
      <FollowUpAttachSection slide={slide} />
    </div>
  );
};

export { EditSlidePanel };
