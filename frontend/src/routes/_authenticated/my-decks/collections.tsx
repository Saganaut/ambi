// Route stub for the collections grid. The page itself lives in
// src/pages/CollectionsPage/.
import { createFileRoute } from "@tanstack/react-router";
import { CollectionsPage } from "../../../pages/CollectionsPage/CollectionsPage";

export const Route = createFileRoute("/_authenticated/my-decks/collections")({
  component: CollectionsPage,
});
