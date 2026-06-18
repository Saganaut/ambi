/**
 * Presentational frame for the deck editor's centre canvas — the bordered,
 * themed box with a brand / slide-kind header, a scrollable body slot, and a
 * footer. Extracted from {@link SlideDisplay} so the exact same chrome can wrap
 * a slide-content component in isolation (e.g. a Storybook story) without
 * pulling in the editor's data wiring. Purely presentational: it renders the
 * surface it's handed and owns no hooks / store. Shares `SlideDisplay.module.css`
 * with its container (one CSS module per directory).
 */
import { CephadexLogo } from "@/shared/components/Graphic/CephadexLogo";
import { SlideCanvasProvider } from "@deck/contexts/SlideCanvasContext";
import { type SlideType } from "@deck/store/deckEnums.gen";
import type { CSSProperties, ReactNode } from "react";
import { ImageSlot } from "../../ImageSlot";
import { SlideTypeGraphicSvg } from "../../Slides/SlideTypeGraphics/SlideTypeGraphic";
import styles from "./SlideDisplay.module.css";

interface SlideCanvasProps {
  /** Slide kind — drives the header graphic. */
  slideType: SlideType;
  /** Per-deck theme `--role-*` overrides; falls through to the global theme. */
  themeStyle?: CSSProperties;
  /** `light` / `dark` scope for the canvas, independent of the global theme. */
  appearance?: "light" | "dark";
  /** Background image URL painted across the canvas. */
  backgroundUrl?: string;
  /**
   * Background color (hex) painted on the canvas base layer, behind the image.
   * Empty / undefined falls back to the canvas default (`--bg-surface`).
   */
  backgroundColor?: string;
  /** The kind-specific authoring surface, rendered in the scrollable body. */
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
  return (
    <div
      className={styles.slideDisplay}
      data-appearance={appearance}
      style={
        {
          ...themeStyle,
          "--background-image": backgroundUrl ? `url("${backgroundUrl}")` : "none",
          // Only override the canvas default when a color actually resolves, so a
          // colorless slide keeps `--bg-surface`. The image draws on top of this.
          ...(backgroundColor ? { "--bg-color": backgroundColor } : {}),
        } as CSSProperties
      }
    >
      <div className={styles.slideHeader}>
        <CephadexLogo size={"md"} /> <SlideTypeGraphicSvg slideType={slideType} />
      </div>
      <ImageSlot
        slotId={{
          start: 1,
          end: 4,
          top: 1,
          bottom: 4,
        }}
      />{" "}
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
      </div>{" "}
      <ImageSlot
        slotId={{
          start: 5,
          end: 8,
          top: 1,
          bottom: 4,
        }}
      />{" "}
      <ImageSlot
        slotId={{
          start: 6,
          end: 7,
          top: 1,
          bottom: 4,
        }}
      />
      <div className={styles.slideFooter}>Footer goes here</div>
    </div>
  );
};

export { SlideCanvas };
export type { SlideCanvasProps };
