/**
 * Presentational frame for the deck editor's centre canvas — the bordered,
 * themed box with a brand / slide-kind header, a scrollable body slot, and a
 * footer. Extracted from {@link SlideDisplay} so the exact same chrome can wrap
 * a slide-content component in isolation (e.g. a Storybook story) without
 * pulling in the editor's data wiring. Purely presentational: it renders the
 * surface it's handed and owns no hooks / store. Shares `SlideDisplay.module.css`
 * with its container (one CSS module per directory).
 */
import type { CSSProperties, ReactNode } from "react";
import { CephadexLogo } from "@/shared/components/Graphic/CephadexLogo";
import { SlideTypeGraphicSvg } from "../../Slides/SlideTypeGraphics/SlideTypeGraphic";
import { type SlideType } from "@deck/store/deckEnums.gen";
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
  /** The kind-specific authoring surface, rendered in the scrollable body. */
  children: ReactNode;
}

const SlideCanvas = ({
  slideType,
  themeStyle,
  appearance,
  backgroundUrl,
  children,
}: SlideCanvasProps) => {
  return (
    <div
      className={styles.slideDisplay}
      data-appearance={appearance}
      style={
        {
          ...themeStyle,
          "--background-image": backgroundUrl
            ? `url("${backgroundUrl}")`
            : "none",
        } as CSSProperties
      }>
      <div className={styles.slideHeader}>
        <CephadexLogo size={"md"} />{" "}
        <SlideTypeGraphicSvg slideType={slideType} />
      </div>
      <div className={styles.slideBody}>{children}</div>
      <div className={styles.slideFooter}>Footer goes here</div>
    </div>
  );
};

export { SlideCanvas };
export type { SlideCanvasProps };
