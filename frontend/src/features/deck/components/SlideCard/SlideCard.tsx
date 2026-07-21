/**
 * Reusable slide card — the code side of the Ambi DS "Slide Card" component
 * set. Implements the row variant: index + slide-type icon box + type label +
 * title, with an `active` state (canvas background + md shadow) and an `sm`
 * size used for attached follow-up rows in the deck editor's left rail. The
 * NewSlideModal picker is slated to adopt this component's tile variant.
 *
 * Purely presentational: interaction handlers (click, context menu) and drag
 * wiring stay with the caller via the spread div props.
 */
import type { HTMLAttributes, ReactNode } from "react";
import { SlideType } from "@deck/store/deckEnums.gen";
import { slideTypeIcons } from "./slideTypeIcons";
import styles from "./SlideCard.module.css";

interface SlideCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  slideType: SlideType;
  title: ReactNode;
  /** Defaults to the slide type with underscores spaced (e.g. "Q AND A"). */
  typeLabel?: string;
  /** Position badge, e.g. 3 or "3a" for a follow-up. */
  index?: ReactNode;
  active?: boolean;
  size?: "md" | "sm";
}

const SlideCard = ({
  slideType,
  title,
  typeLabel,
  index,
  active,
  size = "md",
  className,
  ...rest
}: SlideCardProps) => {
  const composed = [styles.slideCard, styles[size], active ? styles.active : "", className]
    .filter(Boolean)
    .join(" ");
  const TypeIcon = slideTypeIcons[slideType];

  return (
    <div className={composed} data-slide-type={slideType} {...rest}>
      {index != null && <div className={styles.index}>{index}</div>}
      <div className={styles.iconBox}>
        <TypeIcon className={styles.typeIcon} aria-hidden="true" />
      </div>
      <div className={styles.text}>
        <div className={styles.typeLabel}>{typeLabel ?? slideType.replaceAll("_", " ")}</div>
        <div className={styles.title}>{title}</div>
      </div>
    </div>
  );
};

export { SlideCard };
export type { SlideCardProps };
