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
import type { ButtonHTMLAttributes } from "react";
import type {
  BtnFill,
  BtnShape,
  BtnSize,
  BtnVariant,
} from "@ui/Buttons/BtnTypes";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { slideTypeGraphics, type ElementKind } from "./slideTypeGraphics";
import styles from "./SlideTypeGraphic.module.css";

interface SlideTypeGraphicProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type"
> {
  kind: ElementKind;
  size?: BtnSize;
  variant?: BtnVariant;
  fill?: BtnFill;
  shape?: BtnShape;
}

const SlideTypeGraphic = ({
  kind,
  size = "md",
  fill = "ghost",
  ...rest
}: SlideTypeGraphicProps) => {
  const Graphic = slideTypeGraphics[kind];
  return <IconBtn icon={<Graphic />} size={size} fill={fill} {...rest} />;
};

interface SlideTypeGraphicSvgProps {
  kind: ElementKind;
  size?: BtnSize;
  className?: string;
}

const SlideTypeGraphicSvg = ({
  kind,
  size = "md",
  className,
}: SlideTypeGraphicSvgProps) => {
  const Graphic = slideTypeGraphics[kind];
  return (
    <span
      className={[styles.wrapper, styles[size], className]
        .filter(Boolean)
        .join(" ")}>
      <Graphic />
    </span>
  );
};

export { SlideTypeGraphic, SlideTypeGraphicSvg };
