import type { SegmentItem } from "./Segment";

export type RangeId = "7d" | "30d" | "90d" | "all";

export const mockRangeItems: SegmentItem<RangeId>[] = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "all", label: "All time" },
];

export const mockItemsWithDisabled: SegmentItem<RangeId>[] = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days", disabled: true },
  { id: "all", label: "All time" },
];
