// The single read boundary for one deck. This is the *only* caller of the
// generated `useGetDeckQuery` — every hook or component that needs the current
// deck composes `useDeckQuery`, so "where is the deck read?" has exactly one
// answer and fetching policy lives in one place. RTK Query dedupes the request
// and shares the store slice, so composing this in several places is cheap.
//
// The write boundaries (`useDeck`, `useDeckImageMutate`, `useDeckSettingsMutate`)
// compose this when they need cache data to build a payload; they never expose a
// read of their own. See z-docs/rules/frontend/hook-roles.md.
import { type DeckResponse, useGetDeckQuery } from "@deck/store/deckApi.gen";
import { IMAGE_QUERY_REFRESH } from "@/shared/store/imageRefreshPolicy.ts";

interface UseDeckQueryResult {
  /** The deck (undefined while the initial fetch is in flight). */
  deck: DeckResponse | undefined;
  isLoading: boolean;
  error: unknown;
}

const useDeckQuery = (deckId: string): UseDeckQueryResult => {
  // The deck carries presigned cover/background image URLs; keep them fresh so a
  // long-open editor never renders an expired URL. See imageRefreshPolicy.
  const { data: deck, isLoading, error } = useGetDeckQuery(
    { id: deckId },
    IMAGE_QUERY_REFRESH,
  );
  return { deck, isLoading, error };
};

export { useDeckQuery };
export type { UseDeckQueryResult };
