// File-based route for the per-deck analytics dashboard (chunk 16). Auth is
// enforced server-side by the analytics endpoints (owner / EDITOR only); the
// page itself shows a forbidden banner if the API returns 403 so we don't
// need to gate the route behind a layout.
import { createFileRoute } from "@tanstack/react-router";

import { DeckAnalyticsPage } from "@deck/views/DeckAnalyticsPage/DeckAnalyticsPage";

export const Route = createFileRoute("/_authenticated/decks/$deckId/analytics")(
  {
    component: DeckAnalyticsPage,
  },
);
