// Visual rule used to separate content. Horizontal by default; vertical
// requires the parent to provide some height (flex/grid track). The component
// only emits a styled element — no margins — so callers control spacing.
import styles from "./Divider.module.css";

interface DividerProps {
  orientation?: "horizontal" | "vertical";
  inset?: boolean;
  className?: string;
}

const Divider = ({
  orientation = "horizontal",
  inset = false,
  className,
}: DividerProps) => (
  <div
    role='separator'
    aria-orientation={orientation}
    className={[
      styles.divider,
      styles[orientation],
      inset && styles.inset,
      className,
    ]
      .filter(Boolean)
      .join(" ")}
  />
);

export { Divider };
