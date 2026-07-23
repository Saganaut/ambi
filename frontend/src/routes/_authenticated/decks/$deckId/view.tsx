import { DeckViewPage } from "@deck/views/DeckViewPage/DeckViewPage";
import { createFileRoute } from "@tanstack/react-router";
import { AsyncBoundary } from "@ui/AsyncBoundary/AsyncBoundary";

export const Route = createFileRoute("/_authenticated/decks/$deckId/view")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      slideId: (search.slideId as string) || undefined,
    };
  },

  component: function DeckViewRoute() {
    const { deckId } = Route.useParams();
    return (
      <AsyncBoundary key={deckId} boundaryName="deck-view-route">
        <DeckViewPage />
      </AsyncBoundary>
    );
  },
});
