// Small numeric marker for an item's position in a slide-editor list. Two
// looks share one implementation via a variant, replacing the near-identical
// `.indexPill` rules that ItemCard and McqOptionEditable each used to declare:
//   - "solid" (default): a filled circle avatar for ItemCard's compact rows.
//   - "bare": no fill, left-aligned, for the larger McqOptionEditable card.
import styles from "./IndexPill.module.css";

interface IndexPillProps {
  /** 1-based position shown inside the pill. */
  value: number | string;
  variant?: "solid" | "bare" | "square";
  /** Fill color override — e.g. an item's palette color (Axis rows). */
  color?: string;
}

const IndexPill = ({ value, variant = "solid", color }: IndexPillProps) => {
  console.log("index pill color", color);
  return (
    <span
      className={[styles.indexPill, styles[variant], color ? styles.tinted : ""]
        .filter(Boolean)
        .join(" ")}
      style={color ? ({ "--background-color": color } as React.CSSProperties) : undefined}
    >
      {value}
    </span>
  );
};

export { IndexPill };
