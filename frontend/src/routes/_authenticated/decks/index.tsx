import { MyDecksPage } from "../../../features/decks/views/MyDecksPage/MyDecksPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/decks/")({
  component: MyDecksPage,
});
