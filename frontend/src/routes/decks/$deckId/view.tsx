import { DeckViewPage } from "../../../pages/DeckViewPage/DeckViewPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/decks/$deckId/view")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      questionId: (search.questionId as string) || undefined,
    };
  },

  component: DeckViewPage,
});
