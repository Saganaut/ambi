/**
 * Hook that wires "start a interactiveSession from a deck" into one reusable shape.
 *
 * `quickStart(deckId)` creates a interactiveSession with deck defaults (the backend
 * cascades nulls through `Deck.defaultSettings` → platform defaults) and
 * navigates straight to the lobby. This is the common path from Quick Start
 * buttons on deck cards and the deck editor.
 *
 * `customize(deckId)` is a navigation-only helper that routes to
 * `/games/create?deckId=<id>` so the user can override settings before the
 * interactiveSession is created. The settings page submits the mutation itself.
 */
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { useCreateInteractiveSessionMutation } from "../store/AmbiApi";
import { extractErrorMessage } from "../utils/utils";

interface UseStartInteractiveSession {
  quickStart: (deckId: string) => Promise<void>;
  customize: (deckId: string) => void;
  isStarting: boolean;
  error: string | null;
  clearError: () => void;
}

const useStartInteractiveSession = (): UseStartInteractiveSession => {
  const navigate = useNavigate();
  const [createInteractiveSession, { isLoading: isStarting }] =
    useCreateInteractiveSessionMutation();
  const [error, setError] = useState<string | null>(null);

  const quickStart = async (deckId: string): Promise<void> => {
    setError(null);
    try {
      const session = await createInteractiveSession({
        createInteractiveSessionRequest: { deckId },
      }).unwrap();
      if (session.roomCode) {
        // Gen-2 SessionPage: one page that opens on the lobby stage and switches
        // to the game as the host starts. The `$sessionId` param carries the
        // room code (the join code the REST/STOMP APIs key on).
        await navigate({
          to: "/sessions/$sessionId",
          params: { sessionId: session.roomCode },
        });
      } else {
        setError(
          "InteractiveSession was created but no room code was returned.",
        );
      }
    } catch (e) {
      setError(extractErrorMessage(e, "Failed to start the game."));
    }
  };

  const customize = (deckId: string): void => {
    void navigate({
      to: "/games/create",
      search: { deckId },
    });
  };

  const clearError = () => {
    setError(null);
  };

  return { quickStart, customize, isStarting, error, clearError };
};

export { useStartInteractiveSession };
