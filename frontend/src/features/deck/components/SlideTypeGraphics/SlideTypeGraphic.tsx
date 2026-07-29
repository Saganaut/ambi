// Wrappers that render the right decorative icon for a given
// `DeckElement["kind"]`. Use these rather than reaching into `slideTypeGraphics`
// directly so kind-lookup stays in one place.
//
// `SlideTypeGraphic` — default. Returns an `IconBtn` carrying the graphic, so
// the icon is itself the click target (e.g. in toolbars / pickers). Accepts the
// usual IconBtn modifiers.
//
// `SlideTypeGraphicSvg` — bare svg inside a sizing wrapper. Use in purely
// decorative spots, or anywhere the icon already sits inside a clickable
// ancestor and rendering a nested <button> would be wrong.
//
// Color props — both components accept `fillColor` and `outlineColor` to
// override the SVG's two-color palette (defaults: #54FFF1 / #6019FF). These
// are wired as `--graphic-fill` / `--graphic-outline` CSS custom properties
// on the SVG element so all descendant paths/strokes pick them up.
import type { ButtonHTMLAttributes, CSSProperties, SVGProps } from "react";
import type {
  BtnFill,
  BtnShape,
  BtnSize,
  BtnVariant,
} from "@ui/Buttons/Btn.types";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { slideTypeGraphics } from "./slideTypeGraphics";
import styles from "./SlideTypeGraphic.module.css";
import { SlideType } from "@deck/store/deckEnums.gen";

interface SlideTypeGraphicProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type"
> {
  slideType: SlideType;
  size?: BtnSize;
  variant?: BtnVariant;
  fill?: BtnFill;
  shape?: BtnShape;
  fillColor?: string;
  outlineColor?: string;
  svgProps?: SVGProps<SVGSVGElement>;
}

const SlideTypeGraphic = ({
  slideType,
  size = "md",
  fill = "ghost",
  fillColor,
  outlineColor,
  svgProps,
  ...rest
}: SlideTypeGraphicProps) => {
  const Graphic = slideTypeGraphics[slideType];
  const graphicStyle: CSSProperties = {
    ...(fillColor && { "--graphic-fill": fillColor } as CSSProperties),
    ...(outlineColor && { "--graphic-outline": outlineColor } as CSSProperties),
    ...svgProps?.style,
  };
  return (
    <IconBtn
      icon={<Graphic {...svgProps} style={graphicStyle} />}
      size={size}
      fill={fill}
      {...rest}
    />
  );
};

interface SlideTypeGraphicSvgProps {
  slideType: SlideType;
  size?: BtnSize;
  className?: string;
  fillColor?: string;
  outlineColor?: string;
  svgProps?: SVGProps<SVGSVGElement>;
}

const SlideTypeGraphicSvg = ({
  slideType,
  size = "md",
  className,
  fillColor,
  outlineColor,
  svgProps,
}: SlideTypeGraphicSvgProps) => {
  const Graphic = slideTypeGraphics[slideType];
  const graphicStyle: CSSProperties = {
    ...(fillColor && { "--graphic-fill": fillColor } as CSSProperties),
    ...(outlineColor && { "--graphic-outline": outlineColor } as CSSProperties),
    ...svgProps?.style,
  };
  return (
    <span
      className={[styles.wrapper, styles[size], className]
        .filter(Boolean)
        .join(" ")}>
      <Graphic {...svgProps} style={graphicStyle} />
    </span>
  );
};

export { SlideTypeGraphic, SlideTypeGraphicSvg };
