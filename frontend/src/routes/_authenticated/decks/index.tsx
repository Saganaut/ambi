import { MyDecksPage } from "@deck/views/MyDecksPage/MyDecksPage";
import { createFileRoute } from "@tanstack/react-router";
import { AsyncBoundary } from "@ui/AsyncBoundary/AsyncBoundary";

export const Route = createFileRoute("/_authenticated/decks/")({
  component: () => (
    <AsyncBoundary boundaryName="my-decks-route">
      <MyDecksPage />
    </AsyncBoundary>
  ),
});
