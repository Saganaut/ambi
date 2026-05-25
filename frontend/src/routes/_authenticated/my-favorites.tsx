// Route stub for the favorites grid — the page itself lives in
// `src/pages/FavoritesPage/`.
import { createFileRoute } from "@tanstack/react-router";
import { FavoritesPage } from "../../pages/FavoritesPage/FavoritesPage";

export const Route = createFileRoute("/_authenticated/my-favorites")({
  component: FavoritesPage,
});
