// Warms the deck editor before the user commits to opening it. Two things gate
// the editor's first paint — its route code chunk and its two API reads
// (`getDeck` + `listDeckSlides`) — and neither starts until the click. This hook
// kicks both off on hover/focus of a deck card so they're already in flight.
//
// The "Edit" <Link> already preloads the *code* via the router's
// `defaultPreload: "intent"` (see main.tsx), but the card body navigates through
// `useDeckActions`/`useNavigate` (not a <Link>), so we preload the route here too
// to cover that path. Data is warmed via the generated lazy triggers with
// `preferCacheValue`, so a repeat hover over an already-warm deck is a no-op.
import { useRouter } from "@tanstack/react-router";

import {
  useLazyGetDeckQuery,
  useLazyListDeckSlidesQuery,
} from "@deck/store/deckApi.gen";

interface PrefetchHandlers {
  onMouseEnter: () => void;
  onFocus: () => void;
}

const usePrefetchDeckEditor = (deckId: string): PrefetchHandlers => {
  const router = useRouter();
  const [loadDeck] = useLazyGetDeckQuery();
  const [loadSlides] = useLazyListDeckSlidesQuery();

  const prefetch = () => {
    // preferCacheValue=true → skip the request if the cache is already warm.
    void loadDeck({ id: deckId }, true);
    void loadSlides({ id: deckId }, true);
    void router.preloadRoute({
      to: "/decks/$deckId/edit",
      params: { deckId },
      search: { slideId: undefined },
    });
  };

  return { onMouseEnter: prefetch, onFocus: prefetch };
};

export { usePrefetchDeckEditor };
