import { Orientation } from "@/features/deck/components/DeckEditor/SlideContent/_shared/Item.types";
import styles from "./Divider.module.css";

interface DividerProps {
  orientation?: Orientation;
  inset?: boolean;
  className?: string;
}

const Divider = ({ orientation = "horizontal", inset = false, className }: DividerProps) => (
  <div
    role="separator"
    aria-orientation={orientation}
    className={[styles.divider, styles[orientation], inset && styles.inset, className]
      .filter(Boolean)
      .join(" ")}
  />
);

export { Divider };
