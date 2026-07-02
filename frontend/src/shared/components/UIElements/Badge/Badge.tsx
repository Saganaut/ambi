// Small status pill. Variant and size map to className modifiers in
// Badge.module.css.
import styles from "./Badge.module.css";
import type { BtnVariant, BtnSize } from "../Buttons/Btn.types";

interface BadgeProps {
  label: string;
  variant?: BtnVariant;
  size?: BtnSize;
}

const Badge = ({ label, size = "md", variant = "info" }: BadgeProps) => {
  return (
    <span className={[styles.badge, styles[variant], styles[size]].join(" ")}>
      {label}
    </span>
  );
};

export { Badge };
