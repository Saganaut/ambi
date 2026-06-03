// Popover — floating surface for editing toolbars and inline-edit controls.
// Provides the shared visual chrome (border, bg, shadow, padding) plus a small
// set of row / button / divider primitives so any popover toolbar across the
// app reads visually the same. Positioning is the consumer's job: pair this
// with TipTap's BubbleMenu, an absolute-positioned panel, or a portal.
import type { ReactNode, MouseEvent as ReactMouseEvent } from "react";
import styles from "./Popover.module.css";

interface PopoverProps {
  children: ReactNode;
  className?: string;
  role?: "dialog" | "toolbar" | "menu";
  ariaLabel?: string;
}

const Popover = ({
  children,
  className,
  role = "dialog",
  ariaLabel,
}: PopoverProps) => (
  <div
    className={[styles.popover, className].filter(Boolean).join(" ")}
    role={role}
    aria-label={ariaLabel}>
    {children}
  </div>
);

interface PopoverRowProps {
  children: ReactNode;
  className?: string;
}

const PopoverRow = ({ children, className }: PopoverRowProps) => (
  <div className={[styles.row, className].filter(Boolean).join(" ")}>
    {children}
  </div>
);

interface PopoverButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  ariaLabel: string;
  isActive?: boolean;
  // Swallow mousedown so a focused outer editor (e.g. ProseMirror) keeps its
  // selection. Off by default — regular popovers want their buttons focusable.
  preventFocusSteal?: boolean;
}

const PopoverButton = ({
  ariaLabel,
  isActive,
  preventFocusSteal = false,
  onMouseDown,
  className,
  children,
  ...rest
}: PopoverButtonProps) => {
  const handleMouseDown = preventFocusSteal
    ? (e: ReactMouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        onMouseDown?.(e);
      }
    : onMouseDown;
  return (
    <button
      type='button'
      aria-label={ariaLabel}
      aria-pressed={isActive}
      onMouseDown={handleMouseDown}
      {...rest}
      className={[styles.btn, isActive ? styles.btnActive : "", className]
        .filter(Boolean)
        .join(" ")}>
      {children}
    </button>
  );
};

const PopoverDivider = () => (
  <div className={styles.divider} aria-hidden='true' />
);

interface PopoverGroupLabelProps {
  children: ReactNode;
}

const PopoverGroupLabel = ({ children }: PopoverGroupLabelProps) => (
  <span className={styles.groupLabel}>{children}</span>
);

export {
  Popover,
  PopoverRow,
  PopoverButton,
  PopoverDivider,
  PopoverGroupLabel,
};
