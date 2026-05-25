import { DeckViewPage } from "../../../pages/DeckViewPage/DeckViewPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/decks/$deckId/edit")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      questionId: (search.questionId as string) || undefined,
    };
  },
  component: DeckViewPage,
});
