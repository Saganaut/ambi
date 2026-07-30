/**
 * Presentational frame for the deck editor's centre canvas — the bordered,
 * themed box with a brand / slide-kind header, a scrollable body slot, and a
 * footer. Extracted from {@link SlideDisplay} so the exact same chrome can wrap
 * a slide-content component in isolation (e.g. a Storybook story) without
 * pulling in the editor's data wiring. Purely presentational: it renders the
 * surface it's handed and owns no hooks / store. Shares `SlideDisplay.module.css`
 * with its container (one CSS module per directory).
 */
import { contrastToneFor } from "@/shared/utils/color";
import { SlideCanvasProvider } from "@deck/contexts/SlideCanvasContext";
import { type SlideType } from "@deck/store/deckEnums.gen";
import type { CSSProperties, ReactNode } from "react";
import { ImageSlot } from "../../ImageSlot";
import { SlideCanvasFooter } from "./SlideCanvasFooter";
import { SlideCanvasHeader } from "./SlideCanvasHeader";
import styles from "./SlideDisplay.module.css";

interface SlideCanvasProps {
  slideType: SlideType;
  themeStyle?: CSSProperties;
  appearance?: "light" | "dark";
  backgroundUrl?: string;
  backgroundColor?: string;
  children: ReactNode;
  slideContentImgUrl?: string;
}

const SlideCanvas = ({
  slideType,
  themeStyle,
  appearance,
  backgroundUrl,
  backgroundColor,
  children,
}: SlideCanvasProps) => {
  // Resolve the color for text painted directly over the canvas background.
  // We can't know an arbitrary background up front, so we turn it into a known
  // one: an image is always backed by a dark frosted plate (see the
  // `contrastPlate` styles), so text goes light; a solid color is judged by its
  // luminance; a plain themed surface keeps the theme's own text color.
  const onBackground = backgroundUrl
    ? "var(--canvas-text-light)"
    : backgroundColor
      ? `var(--canvas-text-${contrastToneFor(backgroundColor)})`
      : undefined;

  return (
    <div
      className={styles.slideDisplay}
      data-appearance={appearance}
      style={
        {
          ...themeStyle,
          "--background-image": backgroundUrl ? `url("${backgroundUrl}")` : "none",
          //TODO: These overrides cause theming issues, need to be resolved
          // Only override the canvas default when a color actually resolves, so a
          // colorless slide keeps `--bg-surface`. The image draws on top of this.
          ...(backgroundColor ? { "--bg-color": backgroundColor } : {}),
          // Only override when a background dictates a contrast color; otherwise
          // the module default (`--text-primary`) keeps a themed slide untouched.
          ...(onBackground ? { "--canvas-on-bg": onBackground } : {}),
        } as CSSProperties
      }
    >
      <SlideCanvasHeader slideType={slideType} />
      <ImageSlot
        slotId={{
          start: 1,
          end: 4,
          top: 1,
          bottom: 4,
        }}
      />
      <ImageSlot
        slotId={{
          start: 2,
          end: 3,
          top: 1,
          bottom: 4,
        }}
      />
      <div className={styles.slideBody}>
        <div className={styles.slideChild}>
          <SlideCanvasProvider hasBackgroundImage={Boolean(backgroundUrl)}>
            {children}
          </SlideCanvasProvider>
        </div>
      </div>
      <ImageSlot
        slotId={{
          start: 5,
          end: 8,
          top: 1,
          bottom: 4,
        }}
      />
      <ImageSlot
        slotId={{
          start: 6,
          end: 7,
          top: 1,
          bottom: 4,
        }}
      />
      <SlideCanvasFooter />
    </div>
  );
};

export { SlideCanvas };
export type { SlideCanvasProps };
