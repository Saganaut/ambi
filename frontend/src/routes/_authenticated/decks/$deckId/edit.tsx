import { DeckViewPage } from "../../../../features/decks/views/DeckViewPage/DeckViewPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/decks/$deckId/edit")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      questionId: (search.questionId as string) || undefined,
    };
  },
  component: DeckViewPage,
});
