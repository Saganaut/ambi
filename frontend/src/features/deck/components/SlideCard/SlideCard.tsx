/**
 * Reusable slide card — the code side of the Ambi DS "Slide Card" component
 * set.
 *
 * Variants:
 * - `row` (default): index + slide-type icon box + type label + title, with an
 *   `active` state (canvas background + md shadow) and an `sm` size used for
 *   attached follow-up rows in the deck editor's left rail.
 * - `tile`: descriptive picker card (icon box + title + description) used by
 *   the NewSlideModal slide-type picker.
 *
 * Purely presentational: interaction handlers (click, context menu) and drag
 * wiring stay with the caller via the spread element props. Pass `as="button"`
 * when the card is a standalone interactive control (e.g. the picker tiles).
 */
import type { HTMLAttributes, ReactNode } from "react";
import { SlideType } from "@deck/store/deckEnums.gen";
import { slideTypeIcons } from "./slideTypeIcons";
import styles from "./SlideCard.module.css";

interface SlideCardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  slideType: SlideType;
  title: ReactNode;
  /** Row only. Defaults to the slide type with underscores spaced (e.g. "Q AND A"). */
  typeLabel?: string;
  /** Tile only. Secondary line describing the slide type. */
  description?: ReactNode;
  /** Row only. Position badge, e.g. 3 or "3a" for a follow-up. */
  index?: ReactNode;
  active?: boolean;
  size?: "md" | "sm";
  variant?: "row" | "tile";
  /** Rendered element; use "button" when the card itself is the control. */
  as?: "div" | "button";
}

const SlideCard = ({
  slideType,
  title,
  typeLabel,
  description,
  index,
  active,
  size = "md",
  variant = "row",
  as = "div",
  className,
  ...rest
}: SlideCardProps) => {
  const composed = [
    styles.slideCard,
    styles[size],
    styles[variant],
    active ? styles.active : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const TypeIcon = slideTypeIcons[slideType];

  const content = (
    <>
      {variant === "row" && index != null && <div className={styles.index}>{index}</div>}
      <div className={styles.iconBox}>
        <TypeIcon className={styles.typeIcon} aria-hidden="true" />
      </div>
      <div className={styles.text}>
        {variant === "row" && (
          <div className={styles.typeLabel}>{typeLabel ?? slideType.replaceAll("_", " ")}</div>
        )}
        <div className={styles.title}>{title}</div>
        {variant === "tile" && <div className={styles.description}>{description}</div>}
      </div>
    </>
  );

  return as === "button" ? (
    <button type="button" className={composed} data-slide-type={slideType} {...rest}>
      {content}
    </button>
  ) : (
    <div className={composed} data-slide-type={slideType} {...rest}>
      {content}
    </div>
  );
};

export { SlideCard };
export type { SlideCardProps };
