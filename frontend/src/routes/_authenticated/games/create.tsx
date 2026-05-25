/**
 * Customize-before-start route for a interactiveSession. Reached via the chevron menu
 * on a deck's Quick Start button — `?deckId=<id>` is required. Without it,
 * CreateGamePage redirects back to /decks (My Decks), which is where you
 * pick a deck.
 */

import { createFileRoute } from "@tanstack/react-router";

import { CreateGamePage } from "../../../pages/GamePage/CreateGamePage";

interface CreateGameSearch {
  deckId: string | undefined;
}

export const Route = createFileRoute("/_authenticated/games/create")({
  validateSearch: (search: Record<string, unknown>): CreateGameSearch => ({
    deckId: typeof search.deckId === "string" ? search.deckId : undefined,
  }),
  component: CreateGamePage,
});
