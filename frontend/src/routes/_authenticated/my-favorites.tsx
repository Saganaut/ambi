// Route stub for the favorites grid — the page itself lives in
// `src/pages/FavoritesPage/`.
import { createFileRoute } from "@tanstack/react-router";

// TODO(migration): page not yet implemented (element→slide / liveSession migration)
function FavoritesPage() {
  return <div>Favorites — under construction.</div>;
}

export const Route = createFileRoute("/_authenticated/my-favorites")({
  component: FavoritesPage,
});
