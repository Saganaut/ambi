// Public surface for the reusable slide-editor primitives. Each per-kind
// editor pulls everything it needs from this barrel so the import lines
// stay short.
export { PromptField } from "./PromptField";
export type { PromptFieldProps } from "./PromptField";
export { SectionHeader } from "./SectionHeader";
export { SettingsCard, SettingsRow } from "./SettingsCard";
export { ItemCard } from "./ItemCard";
export { ItemField } from "./ItemField/ItemField";
export { SortableItemCard } from "./SortableItemCard/SortableItemCard";
export type { SortableItemCardProps } from "./SortableItemCard/SortableItemCard";
export { AddItemCard } from "./AddItemCard/AddItemCard";
export { PhraseOrImageCard } from "./PhraseOrImageCard/PhraseOrImageCard";
export type { PhraseOrImageItem } from "./PhraseOrImageCard/PhraseOrImageCard";
// export { ImageBackingEditor } from "./ImageBackingEditor";
export { ScoringFooter } from "./ScoringFooter";
export { EmptySelect } from "./EmptySelect";
export { useSlideComposerState } from "./useSlideComposerState";
export type { ComposerQuestion, SlideComposerState } from "./useSlideComposerState";

// ── Item-bank row (Axis, Grid, Ranking, Scales, Allocation, Place-on-Image) ──
export { ItemBankRow, SortableItemBankRow } from "./ItemBankRow/ItemBankRow";

// ── Placement kit (Axis, Place-on-Image, Grid) ──────────────────────────
export { PlacementMarker } from "./placement/PlacementMarker";
export type { PlacementMarkerProps } from "./placement/PlacementMarker";
export { ToleranceField } from "./placement/ToleranceField";
export {
  DRAG_THRESHOLD_PX,
  clamp01,
  normalizeToBox,
  toRenderStyle,
} from "./placement/placementGeometry";
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
export type { Identified, NormalizedPoint, PlaceableItem } from "./placement/placement.types";
