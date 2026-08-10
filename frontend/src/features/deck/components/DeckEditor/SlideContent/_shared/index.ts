// Public surface for the reusable slide-editor primitives. Each per-kind
// editor pulls everything it needs from this barrel so the import lines
// stay short.
export { AddItemCard } from "./AddItemCard/AddItemCard";
export { ItemCard } from "./ItemCard";
export { ItemField } from "./ItemField/ItemField";
export { PhraseOrImageCard } from "./PhraseOrImageCard/PhraseOrImageCard";
export type { PhraseOrImageItem } from "./PhraseOrImageCard/PhraseOrImageCard";
export { PromptField } from "./PromptField";
export type { PromptFieldProps } from "./PromptField";
export { SectionHeader } from "./SectionHeader";
export { SettingsCard, SettingsRow } from "./SettingsCard";
export { SortableItemCard } from "./SortableItemCard/SortableItemCard";
export type { SortableItemCardProps } from "./SortableItemCard/SortableItemCard";
// export { ImageBackingEditor } from "./ImageBackingEditor";
export { EmptySelect } from "./EmptySelect";
export { ScoringFooter } from "./ScoringFooter";
export { useSlideDraft } from "./useSlideDraft";
export type { ComposerQuestion, SlideDraft } from "./useSlideDraft";

// ── Item-bank row (Axis, Grid, Ranking, Scales, Allocation, Place-on-Image) ──
export { ItemBankRow, SortableItemBankRow } from "./ItemBankRow/ItemBankRow";

// ── Item chart legend (the editable results charts' per-option row) ─────────
export { ItemChartLegend, SortableItemChartLegend } from "./ItemChartLegend/ItemChartLegend";
export type {
  ItemChartLegendPlacement,
  ItemChartLegendProps,
  SortableItemChartLegendProps,
} from "./ItemChartLegend/ItemChartLegend";

// ── Placement kit (Axis, Place-on-Image, Grid) ──────────────────────────
export type { Identified, NormalizedPoint, PlaceableItem } from "./placement/placement.types";
export {
  clamp01,
  DRAG_THRESHOLD_PX,
  normalizeToBox,
  toRenderStyle,
} from "./placement/placementGeometry";
export { PlacementMarker } from "./placement/PlacementMarker";
export type { PlacementMarkerProps } from "./placement/PlacementMarker";
export { ToleranceField } from "./placement/ToleranceField";
export { PENDING_PLACEMENT_KEY, usePlacementSurface } from "./placement/usePlacementSurface";
export type {
  PlacementDrag,
  UsePlacementSurfaceOptions,
  UsePlacementSurfaceResult,
} from "./placement/usePlacementSurface";
export { usePointerPlacement } from "./placement/usePointerPlacement";
export type {
  PointerPlacement,
  SurfacePointerHandlers,
  UsePointerPlacementOptions,
  UsePointerPlacementResult,
} from "./placement/usePointerPlacement";
