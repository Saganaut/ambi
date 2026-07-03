// Small numeric marker for an item's position in a slide-editor list. Two
// looks share one implementation via a variant, replacing the near-identical
// `.indexPill` rules that ItemCard and McqOptionEditable each used to declare:
//   - "solid" (default): a filled circle avatar for ItemCard's compact rows.
//   - "bare": no fill, left-aligned, for the larger McqOptionEditable card.
import styles from "./IndexPill.module.css";

interface IndexPillProps {
  /** 1-based position shown inside the pill. */
  value: number;
  variant?: "solid" | "bare";
}

const IndexPill = ({ value, variant = "solid" }: IndexPillProps) => (
  <span className={`${styles.indexPill} ${styles[variant]}`}>{value}</span>
);

export { IndexPill };
