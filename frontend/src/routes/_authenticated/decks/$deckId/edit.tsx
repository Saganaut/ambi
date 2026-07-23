import { DeckViewPage } from "@features/deck/views/DeckViewPage/DeckViewPage";
import { createFileRoute } from "@tanstack/react-router";
import { AsyncBoundary } from "@ui/AsyncBoundary/AsyncBoundary";

export const Route = createFileRoute("/_authenticated/decks/$deckId/edit")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      slideId: (search.slideId as string) || undefined,
    };
  },
  component: function DeckEditRoute() {
    const { deckId } = Route.useParams();
    return (
      <AsyncBoundary key={deckId} boundaryName="deck-edit-route">
        <DeckViewPage />
      </AsyncBoundary>
    );
  },
});
