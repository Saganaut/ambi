/**
 * Vertical horizontal-bar list for response distributions. Each row is
 * `label · bar · display value`; bar width is the row value as a percentage
 * of the largest row so a single dominant answer doesn't flatten the others
 * into nothing.
 *
 * Diverges from Charts/BarChart in two ways:
 *  - Accepts a pre-formatted `display` string so callers can mix averages
 *    (`1.5`) with counts (`127`) without losing precision through Number
 *    formatting at this layer.
 *  - Renders a stable `key` per row instead of array-index, since analytics
 *    rows are keyed by element-id / option-id and may be reordered.
 *
 * Empty + "no distribution available" states live here so dashboards can drop
 * the component in without writing their own placeholder branches.
 */
import type { ReactNode } from "react";

import styles from "./DistributionList.module.css";

interface DistributionRow {
  key: string;
  label: string;
  value: number;
  display: string;
  highlight?: boolean;
}

interface DistributionListProps {
  rows: DistributionRow[];
  emptyMessage?: ReactNode;
  caption?: ReactNode;
}

const DistributionList = ({
  rows,
  emptyMessage,
  caption,
}: DistributionListProps) => {
  if (rows.length === 0) {
    return (
      <div className={styles.wrap}>
        {caption && <div className={styles.caption}>{caption}</div>}
        <p className={styles.empty}>{emptyMessage ?? "No responses yet."}</p>
      </div>
    );
  }
  const max = rows.reduce((acc, row) => Math.max(acc, row.value), 0);
  return (
    <div className={styles.wrap}>
      {caption && <div className={styles.caption}>{caption}</div>}
      <ul className={styles.list}>
        {rows.map((row) => {
          const pct = max > 0 ? (row.value / max) * 100 : 0;
          return (
            <li
              key={row.key}
              className={styles.row}
              data-highlight={row.highlight ? "true" : undefined}>
              <span className={styles.label} title={row.label}>
                {row.label}
              </span>
              <span className={styles.track}>
                <span
                  className={styles.fill}
                  style={{ width: `${pct.toFixed(1)}%` }}
                />
              </span>
              <span className={styles.value}>{row.display}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export { DistributionList };
export type { DistributionListProps, DistributionRow };
