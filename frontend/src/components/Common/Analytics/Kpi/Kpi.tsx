/**
 * Single KPI tile used inside dashboards (deck analytics, org analytics, …).
 *
 * Composes label / value / sub-line slots plus an optional `trend` indicator
 * with a delta string. The trend chip is the only piece of color the tile
 * exposes — the rest of the card stays neutral so a row of KPIs reads as one
 * surface rather than a parade of competing colors. Status tints are reserved
 * for trend ("error" for downturns, "success" for growth) per the design rule
 * that status color === operational feedback only.
 *
 * Lives in Common/Analytics so it can be reused by any dashboard page; the
 * deck-analytics page composes per-segment KPI sets out of these tiles.
 */
import type { ReactNode } from "react";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
} from "@heroicons/react/24/outline";

import styles from "./Kpi.module.css";

type KpiSize = "sm" | "md" | "lg";
type KpiTrend = "up" | "down" | "flat";

interface KpiProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  size?: KpiSize;
  trend?: KpiTrend;
  delta?: string;
  icon?: ReactNode;
}

const TREND_ICON: Record<KpiTrend, typeof ArrowTrendingUpIcon> = {
  up: ArrowTrendingUpIcon,
  down: ArrowTrendingDownIcon,
  flat: MinusIcon,
};

const Kpi = ({
  label,
  value,
  sub,
  size = "md",
  trend,
  delta,
  icon,
}: KpiProps) => {
  const TrendIcon = trend ? TREND_ICON[trend] : null;
  return (
    <div
      className={[styles.kpi, styles[size]].filter(Boolean).join(" ")}
      data-trend={trend ?? undefined}>
      <div className={styles.head}>
        <span className={styles.label}>{label}</span>
        {icon && <span className={styles.icon}>{icon}</span>}
      </div>
      <span className={styles.value}>{value}</span>
      {(sub ?? delta ?? trend) && (
        <div className={styles.foot}>
          {TrendIcon && delta && (
            <span className={styles.trendChip}>
              <TrendIcon className={styles.trendIcon} aria-hidden='true' />
              {delta}
            </span>
          )}
          {sub && <span className={styles.sub}>{sub}</span>}
        </div>
      )}
    </div>
  );
};

export { Kpi };
export type { KpiProps, KpiSize, KpiTrend };
