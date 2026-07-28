// One-shot, load-time repair of an item bank's identity, shared by the four
// editors whose rows carry a number and a color: Axis, Grid, Ranking and
// Place-on-Image.
//
// Items and targets authored before ids and colors reached the wire carry
// neither, and the editors papered over that by deriving both from the array
// index. That made a reorder look destructive — the answer key never moved
// (it is id-keyed, and Place-on-Image's targets carry their own coordinates),
// but every marker changed number AND color, so the author saw the placements
// "jump". It also left id-keyed ops with nothing to address.
//
// So both fields are frozen into the content the first time an affected slide
// is opened: a missing id becomes a fresh `nanoid(8)`, a missing color becomes
// the palette default the item's CURRENT position was already rendering. The
// author sees exactly what they saw a moment ago — and from then on the color
// travels with the item instead of with the row.
//
// The repair is ONE write per slide (ids and colors together, immediately
// flushed) fired from an effect once the slide has loaded, and latched by slide
// id so a re-render, a refetch, or an unrelated edit can never re-run it.
import { useEffect, useRef } from "react";
import { nanoid } from "nanoid";

import { paletteColorAt } from "@/shared/components/Charts/optionPalette";

/** The two identity fields the backfill owns; every placement item carries them. */
interface IdentifiableItem {
  id?: string;
  color?: string;
}

/**
 * The list with every missing id and color filled in, or `null` when each item
 * already carries both — the caller writes nothing in that (overwhelmingly
 * common) case, so an already-migrated slide costs no PUT.
 *
 * A colorless item takes the palette default for its CURRENT index, which is
 * precisely the color the index-derived fallback was painting it: the backfill
 * preserves the author's view and only makes it permanent.
 */
const backfillItemIdentity = <T extends IdentifiableItem>(items: readonly T[]): T[] | null => {
  if (items.every((item) => item.id != null && item.color != null)) return null;
  return items.map((item, index) => ({
    ...item,
    id: item.id ?? nanoid(8),
    color: item.color ?? paletteColorAt(index),
  }));
};

/**
 * Run {@link backfillItemIdentity} once for the loaded slide, handing the
 * repaired list to `commit`.
 *
 * @param slideId the slide being edited — the latch's key, so switching slides
 *   arms the repair for the next one
 * @param items   the slide's items, or `undefined` while it is still loading —
 *   an empty array is a loaded, item-less slide and must not be confused with
 *   one that has not arrived yet, or the latch would close before the items do
 * @param commit  persists the repaired list (a flushed `updateSlideContent`)
 */
const useItemIdentityBackfill = <T extends IdentifiableItem>(
  slideId: string,
  items: readonly T[] | undefined,
  commit: (backfilled: T[]) => void,
): void => {
  const repairedSlideIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (items == null || repairedSlideIdRef.current === slideId) return;
    // Latch before committing: the write re-renders this hook with fresh
    // `items` / `commit` identities, and the latch — not the dependency list —
    // is what keeps the repair to one write per slide.
    repairedSlideIdRef.current = slideId;
    const backfilled = backfillItemIdentity(items);
    if (backfilled) commit(backfilled);
  }, [slideId, items, commit]);
};

export { backfillItemIdentity, useItemIdentityBackfill };
export type { IdentifiableItem };
