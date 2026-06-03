// Layout container that arranges PricingCard children in a responsive grid.
// Caller controls the column count above the wrap-breakpoint via the
// `columns` prop so the same grid can host 2-tier or 3-tier pricing pages.
import type { ReactNode, CSSProperties } from "react";
import styles from "./PricingGrid.module.css";

interface PricingGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
}

const PricingGrid = ({ children, columns = 3 }: PricingGridProps) => {
  const style = { "--pricing-columns": columns } as CSSProperties;
  return (
    <div className={styles.grid} style={style}>
      {children}
    </div>
  );
};

export { PricingGrid };
