// Icon-only button. Two orthogonal style axes mirror Btn:
//   - `variant` picks the color slot.
//   - `fill` picks default / bordered / ghost.
// For a close (X) button, pass an XMarkIcon as the icon and use
// fill="ghost". `shape="avatar"` gives the round photo treatment (zero
// padding, thicker border, image clipping). See BtnTypes.ts and
// styling-rules.md "Named button + icon-button variants".
import React, { type ReactNode } from "react";
import type { BtnShape, BtnSize, BtnVariant, BtnFill } from "./BtnTypes";
import styles from "./Buttons.module.css";

interface IconBtnProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "type"
> {
  variant?: BtnVariant;
  fill?: BtnFill;
  icon?: ReactNode;
  size?: BtnSize;
  shape?: BtnShape;
}

const IconBtn = ({
  variant = "primary",
  fill = "default",
  icon,
  size = "md",
  shape = "default",
  disabled = false,
  onClick,
  className,
  ...rest
}: IconBtnProps) => {
  return (
    <button
      type='button'
      disabled={disabled}
      onClick={onClick}
      {...rest}
      className={[
        styles.iconBtn,
        styles[variant],
        styles[fill],
        styles[size],
        shape !== "default" && styles[shape],
        className,
      ]
        .filter(Boolean)
        .join(" ")}>
      {icon}
    </button>
  );
};

export { IconBtn };
