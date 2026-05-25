import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/decks/$deckId/present")({
  component: RouteComponent,
});

// eslint-disable-next-line react-refresh/only-export-components
function RouteComponent() {
  return <div>Hello "/decks/$deckId/present"!</div>;
}
