/**
 * Common/Analytics — reusable primitives for dashboard surfaces (Kpi tiles,
 * segmented controls, distribution bar lists). Page-specific compositions
 * live with the page; this folder holds only the design-system pieces.
 */
export { Kpi } from "./Kpi/Kpi";
export type { KpiProps, KpiSize, KpiTrend } from "./Kpi/Kpi";
export { KpiStrip } from "./KpiStrip/KpiStrip";
export type { KpiStripProps } from "./KpiStrip/KpiStrip";
export { Segment } from "./Segment/Segment";
export type { SegmentProps, SegmentItem } from "./Segment/Segment";
export { DistributionList } from "./DistributionList/DistributionList";
export type {
  DistributionListProps,
  DistributionRow,
} from "./DistributionList/DistributionList";
