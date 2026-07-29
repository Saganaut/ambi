// Route stub for the favorites grid — the page itself lives in
// `src/pages/FavoritesPage/`.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/my-favorites")({
  // TODO(migration): page not yet implemented (element→slide / liveSession migration)
  component: function FavoritesPage() {
    return <div>Favorites — under construction.</div>;
  },
});
