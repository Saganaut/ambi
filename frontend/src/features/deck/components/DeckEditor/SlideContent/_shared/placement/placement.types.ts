/**
 * The vocabulary the placement kit speaks: a normalized point and the slice of
 * a slide entity its rows and markers need.
 *
 * `PlaceableItem` is deliberately structural rather than a union of the wire
 * types (`AxisItem`, `PlaceTarget`, `GridItem`) — every placement kind already
 * carries these four fields, so the kit stays decoupled from any one of them.
 */
import type { AppImage } from "@deck/store/deckApi.gen";

/** A coordinate pair in a surface's normalized [0, 1] placement space. */
interface NormalizedPoint {
  x: number;
  y: number;
}

/** What the shared row and marker chrome reads off an item. */
interface PlaceableItem {
  id?: string;
  label?: string;
  image?: AppImage;
  /** Authored color override; absent falls back to the palette default. */
  color?: string;
}

/**
 * An item past the editors' load-time identity backfill
 * (`useItemIdentityBackfill`): its client id is guaranteed present, so rows,
 * markers, React keys and `useSortable` all address it directly instead of
 * falling back to its array position.
 */
type Identified<T extends { id?: string }> = T & { id: string };

export type { Identified, NormalizedPoint, PlaceableItem };
