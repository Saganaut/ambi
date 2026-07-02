// Generic card with header/body/footer slots. Variant and size map to className
// modifiers in Cards.module.css. Becomes clickable when onClick is provided
// (renders as <button> for native keyboard + screen reader support). `as` is
// used for non-clickable cards where a semantic wrapper element is needed.
import { type ElementType, type ReactNode } from "react";
import type { BtnVariant, BtnSize } from "../Buttons/Btn.types";
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
  const className = [
    styles.card,
    variant && styles[variant],
    styles[size],
    isClickable && styles.isClickable,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <div className={styles.header}>{header}</div>
      <div className={styles.body}>{body}</div>
      <div className={styles.footer}>{footer}</div>
    </>
  );

  if (isClickable) {
    return (
      <button type='button' className={className} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <Component className={className}>{content}</Component>;
};

export { Card };
