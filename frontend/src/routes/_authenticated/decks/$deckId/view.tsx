import { DeckViewPage } from "@deck/views/DeckViewPage/DeckViewPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/decks/$deckId/view")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      slideId: (search.slideId as string) || undefined,
    };
  },

  component: DeckViewPage,
});
