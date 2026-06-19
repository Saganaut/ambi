// Quick-start action card: icon + title + description, rendered as a link or button.
// Used on MainPage and Create Game flow to surface high-level user choices.
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import styles from "./Cards.module.css";

interface ActionCardBaseProps {
  icon: ReactNode;
  title: string;
  description: string;
  disabled?: boolean;
  badge?: string;
  selected?: boolean;
}

interface ActionCardLinkProps extends ActionCardBaseProps {
  to: string;
  onClick?: never;
}

interface ActionCardButtonProps extends ActionCardBaseProps {
  to?: never;
  onClick: () => void;
}

type ActionCardProps = ActionCardLinkProps | ActionCardButtonProps;

const ActionCard = (props: ActionCardProps) => {
  const { icon, title, description, disabled, badge, selected } = props;

  const className = [
    styles.actionCard,
    disabled ? styles.disabled : "",
    selected ? styles.selected : "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {badge && <span className={styles.badge}>{badge}</span>}
      <span className={styles.icon} aria-hidden='true'>
        {icon}
      </span>
      <span className={styles.title}>{title}</span>
      <span className={styles.description}>{description}</span>
    </>
  );

  if (disabled) {
    return (
      <button type='button' className={className} disabled aria-pressed={selected}>
        {content}
      </button>
    );
  }

  if ("to" in props && props.to) {
    return (
      <Link to={props.to} className={className} viewTransition>
        {content}
      </Link>
    );
  }

  return (
    <button
      type='button'
      className={className}
      onClick={"onClick" in props ? props.onClick : undefined}
      aria-pressed={selected}>
      {content}
    </button>
  );
};

export { ActionCard };
