// Primary button. Two orthogonal style axes:
//   - `variant` picks the color slot (primary, secondary, brand, info,
//     error, success, warning, disabled).
//   - `fill` picks how the color renders (default = filled, bordered =
//     filled + border, ghost = text-only).
// Both map to nested rules under .btn in Buttons.module.css; see
// Btn.types.ts and styling-rules.md "Named button + icon-button variants".
import type { ReactNode, Ref } from "react";
import type { BtnVariant, BtnFill, BtnSize, BtnShape } from "./Btn.types";
import styles from "./Buttons.module.css";

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
  variant?: BtnVariant;
  fill?: BtnFill;
  size?: BtnSize;
  shape?: BtnShape;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  isLoading?: boolean;
  children?: ReactNode;
}

const Btn = ({
  variant = "primary",
  fill = "default",
  size = "md",
  shape = "default",
  disabled = false,
  type = "button",
  icon,
  iconPosition = "left",
  isLoading,
  className,
  children,
  ref,
  ...rest
}: BtnProps) => {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      data-icon-position={icon ? iconPosition : undefined}
      {...rest}
      className={[
        styles.btn,
        styles[variant],
        styles[fill],
        styles[size],
        shape !== "default" && styles[shape],
        className,
      ]
        .filter(Boolean)
        .join(" ")}>
      {icon != null && <span>{icon}</span>}
      {children}
    </button>
  );
};

export { Btn };
