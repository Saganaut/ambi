// Popover — floating surface for editing toolbars and inline-edit controls.
// Provides the shared visual chrome (border, bg, shadow, padding) plus a small
// set of row / button / divider primitives
// Used in conjuction wiht PopverWrapper and PopoverNavContext to provide full utility
import { useListItem } from "@floating-ui/react";
import { ButtonHTMLAttributes, useContext, type ReactNode } from "react";
import styles from "./Popover.module.css";
import { PopoverNavContext } from "./PopoverNavContext";

interface PopoverProps {
  children: ReactNode;
  className?: string;
  role?: "dialog" | "toolbar" | "menu";
  ariaLabel?: string;
  style?: React.CSSProperties;
}

const Popover = ({ children, className, role = "dialog", ariaLabel, style }: PopoverProps) => (
  <div
    className={[styles.popover, className].filter(Boolean).join(" ")}
    role={role}
    aria-label={ariaLabel}
    style={style}
  >
    {children}
  </div>
);

interface RowProps {
  children: ReactNode;
  className?: string;
}

const Row = ({ children, className }: RowProps) => (
  <div className={[styles.row, className].filter(Boolean).join(" ")}>{children}</div>
);

const Button = ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => {
  const nav = useContext(PopoverNavContext);
  const { ref, index } = useListItem();

  if (!nav) {
    return (
      <button className={styles.btn} type="button" {...props}>
        {children}
      </button>
    );
  }
  return (
    <button
      className={styles.btn}
      type="button"
      ref={ref}
      {...nav.getItemProps(props)}
      role="menuitem"
      tabIndex={nav.activeIndex === index ? 0 : -1}
    >
      {children}
    </button>
  );
};

const Divider = () => <div className={styles.divider} aria-hidden="true" />;

interface GroupLabelProps {
  children: ReactNode;
}

const GroupLabel = ({ children }: GroupLabelProps) => (
  <span className={styles.groupLabel}>{children}</span>
);

Popover.row = Row;
Popover.Button = Button;
Popover.divider = Divider;
Popover.groupLabel = GroupLabel;

export { Popover };
