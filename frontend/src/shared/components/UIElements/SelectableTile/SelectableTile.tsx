// Generic selectable tile: optional media (icon or image), title, optional
// meta line, optional description, optional badge, and a selected state.
// Renders as a router Link when `to` is set, otherwise a button.
//
// Generalizes the bespoke tile patterns in NewSlideModal, DeckGrid in the
// Create Game flow, and ContentDeckPicker. ActionCard pre-dates this and
// remains for the simpler "icon + title + description" hero placements.
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import styles from "./SelectableTile.module.css";

interface SelectableTileBaseProps {
  media?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  description?: ReactNode;
  badge?: string;
  selected?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

interface SelectableTileLinkProps extends SelectableTileBaseProps {
  to: string;
  onClick?: never;
}

interface SelectableTileButtonProps extends SelectableTileBaseProps {
  to?: never;
  onClick: () => void;
}

type SelectableTileProps = SelectableTileLinkProps | SelectableTileButtonProps;

const SelectableTile = (props: SelectableTileProps) => {
  const {
    media,
    title,
    meta,
    description,
    badge,
    selected,
    disabled,
    size = "md",
    className,
  } = props;

  const composed = [
    styles.tile,
    styles[size],
    selected ? styles.selected : "",
    disabled ? styles.disabled : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {badge && <span className={styles.badge}>{badge}</span>}
      {media && <span className={styles.media}>{media}</span>}
      <span className={styles.title}>{title}</span>
      {meta && <span className={styles.meta}>{meta}</span>}
      {description && <span className={styles.description}>{description}</span>}
    </>
  );

  if (disabled) {
    return (
      <button type='button' className={composed} disabled aria-pressed={selected}>
        {content}
      </button>
    );
  }

  if ("to" in props && props.to) {
    return (
      <Link to={props.to} className={composed} viewTransition>
        {content}
      </Link>
    );
  }

  return (
    <button
      type='button'
      className={composed}
      onClick={"onClick" in props ? props.onClick : undefined}
      aria-pressed={selected}>
      {content}
    </button>
  );
};

export { SelectableTile };
export type { SelectableTileProps };
