/**
 * Layout wrapper for a row of Kpi tiles. Picks a sensible auto-fit grid so
 * tiles wrap on narrow viewports without callers writing their own grid CSS.
 *
 * Kept as a separate file (not a prop on Kpi) so dashboards can drop the
 * strip in/out of a section while keeping the same tile component.
 */
import type { ReactNode } from "react";

import styles from "./KpiStrip.module.css";

type KpiStripDensity = "compact" | "comfortable";

interface KpiStripProps {
  children: ReactNode;
  density?: KpiStripDensity;
  className?: string;
}

const KpiStrip = ({
  children,
  density = "comfortable",
  className,
}: KpiStripProps) => (
  <div
    className={[styles.strip, styles[density], className]
      .filter(Boolean)
      .join(" ")}>
    {children}
  </div>
);

export { KpiStrip };
export type { KpiStripProps };
