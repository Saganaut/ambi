import { DeckViewPage } from "@features/deck/views/DeckViewPage/DeckViewPage";
import { createFileRoute } from "@tanstack/react-router";
import { AsyncBoundary } from "@ui/AsyncBoundary/AsyncBoundary";

export const Route = createFileRoute("/_authenticated/decks/$deckId/edit")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      slideId: (search.slideId as string) || undefined,
    };
  },
  component: () => (
    <AsyncBoundary boundaryName='DeckEditRoute'>
      <DeckViewPage />
    </AsyncBoundary>
  ),
});
