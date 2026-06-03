// Lightweight hover/focus tooltip. Wraps a single trigger child and renders
// a positioned label when hovered or focused. The trigger keeps its own
// semantics; the tooltip is rendered inside the wrapper so it never escapes
// scrolling containers — fine for in-page hints, not for absolute-overlay
// menus (DropdownMenu covers that case).
import { useId, useState, type ReactNode } from "react";
import styles from "./Tooltip.module.css";

type TooltipPosition = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  label: ReactNode;
  children: ReactNode;
  position?: TooltipPosition;
  delay?: number;
  className?: string;
}

const Tooltip = ({
  label,
  children,
  position = "top",
  className,
}: TooltipProps) => {
  const [visible, setVisible] = useState(false);
  const tooltipId = useId();

  return (
    <span
      className={[styles.wrapper, className].filter(Boolean).join(" ")}
      onMouseEnter={() => {
        setVisible(true);
      }}
      onMouseLeave={() => {
        setVisible(false);
      }}
      onFocus={() => {
        setVisible(true);
      }}
      onBlur={() => {
        setVisible(false);
      }}>
      <span aria-describedby={visible ? tooltipId : undefined}>{children}</span>
      <span
        id={tooltipId}
        role='tooltip'
        className={[
          styles.tooltip,
          styles[position],
          visible ? styles.visible : "",
        ]
          .filter(Boolean)
          .join(" ")}>
        {label}
      </span>
    </span>
  );
};

export { Tooltip };
