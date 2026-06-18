import { createContext, Dispatch, SetStateAction, useState, type ReactNode } from "react";

import { useSlide } from "@deck/hooks/useSlide";
import type { Placement } from "@deck/store/deckApi.gen";
import { getRouteApi } from "@tanstack/react-router";
import { resolveSlot } from "../utils/imageSlotUtil";
import { ImageSlotConfig } from "./ImageSlot.types";

/**
 * Divide slide into 6 columns and 4 rows.
 * Start 1 end 4 would be take up the 1/3 of the screen from left to right
 * Top 1 bottom 2, would be take up the top half of the screen
 *
 *
 * These need to be mapped to a slot ID, or the slot ID takes these values as their ID.
 *
 * concerns:
 * - validation/typing
 * - re-usability
 * - refactoring potentatial
 * - consistency will it really map to a grid?  Does it need to?
 * Consider how re-usable this needs to be.  Will we use this for other elements?
 * We definitely need to re-use it for the live session.
 *
 *
 * left side half screen start:1 end:3 top: 1 end: 4  --> s1e3t1e4
 * right side half screen start:4 end:6, top: 1 end: 4
 *
 * left side centered start:2 end: 3: top:2 end:3
 * right side centered start:4 end: 5 top:2 end:3
 *
 * **/

// The preset cover-image slots, expressed in the same shape the backend
// persists ({@link Placement} from the generated client) so there's a single
// source of truth for the grid coordinates. `satisfies` keeps each entry's
// literal types (so `SlotMapping` stays a union of the known slots) while
// guaranteeing every option is a valid `Placement`.

export interface ImageSlotContextValue {
  /**
   * The effective image + placement to render, derived from the active slide's
   * persisted cover image and overlaid with any transient hover preview. Null
   * when the slide has no cover image yet.
   */
  imageConfig: null | ImageSlotConfig;
  /**
   * Set a transient placement preview (e.g. on hover). Pass `null` to drop the
   * preview and fall back to the persisted placement. This never touches the
   * backend — committing is the cover-image mutation's job.
   */
  setPreviewPlacement: Dispatch<SetStateAction<Placement | null>>;
}
const ImageSlotContext = createContext<ImageSlotContextValue | null>(null);
const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const ImageSlotProvider = ({ children }: { children: ReactNode }) => {
  const { deckId } = routeApi.useParams();
  const { slideId } = routeApi.useSearch();
  const { getSlide } = useSlide(deckId);

  // The only genuinely local state: a hover preview that overrides the
  // persisted placement until released. Everything else is derived from the
  // RTK cache, so the config reacts to async load, slide switches, and saves
  // with no effect and no stale snapshot.
  const [previewPlacement, setPreviewPlacement] = useState<Placement | null>(null);

  const cover = slideId ? getSlide(slideId)?.coverImage : undefined;
  const imgUrl = cover?.variants?.XL;
  const placement = previewPlacement ?? cover?.placement;
  const slot = placement ? resolveSlot(placement) : undefined;

  // `slot` is a canonical preset (correlated name + placement) or undefined, so
  // the config is type-safe without reconstructing the slot by hand.
  const imageConfig: ImageSlotConfig | null = imgUrl && slot ? { imgUrl, slot } : null;

  return (
    <ImageSlotContext.Provider value={{ imageConfig, setPreviewPlacement }}>
      {children}
    </ImageSlotContext.Provider>
  );
};

export { ImageSlotContext, ImageSlotProvider };
