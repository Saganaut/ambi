// Generic card with header/body/footer slots. Variant and size map to className
// modifiers in Cards.module.css. Becomes clickable when onClick is provided.
// `as` lets callers render the card as <article>/<section>/<li> for semantics.
import { type ElementType, type KeyboardEvent, type ReactNode } from "react";
import type { BtnVariant, BtnSize } from "../Buttons/BtnTypes";
import styles from "./Cards.module.css";

interface CardProps {
  header: ReactNode;
  body: ReactNode;
  footer?: ReactNode;
  variant?: BtnVariant;
  size?: BtnSize;
  onClick?: () => void;
  as?: ElementType;
}

const Card = ({
  header,
  body,
  footer,
  variant,
  size = "md",
  onClick,
  as: Component = "div",
}: CardProps) => {
  const isClickable = onClick != null;
  const interactiveProps = isClickable
    ? {
        role: "button" as const,
        tabIndex: 0,
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        },
      }
    : {};
  return (
    <Component
      onClick={onClick}
      {...interactiveProps}
      className={[
        styles.card,
        variant && styles[variant],
        styles[size],
        isClickable && styles.isClickable,
      ]
        .filter(Boolean)
        .join(" ")}>
      <div className={styles.header}>{header}</div>
      <div className={styles.body}>{body}</div>
      <div className={styles.footer}>{footer}</div>
    </Component>
  );
};

export { Card };
