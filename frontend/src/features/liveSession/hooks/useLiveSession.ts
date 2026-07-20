// Entry-point view-model for reaching a live session: it turns a deck (host) or a
// room code (player) into a running session and navigates to its page. It owns
// the UI concern the write boundary must not — navigation — composing
// `useLiveSessionMutate` with the router.
//
// Deliberately minimal for now: the full in-session board view-model (composing
// `useLiveSessionQuery` + the host/answer commands for SessionBoard) is a
// follow-up. See z-docs/rules/frontend/hook-roles.md.
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { extractErrorMessage } from "@utils/utils";

import type { JoinApiArg } from "../store/liveSessionApi.gen";
import { useLiveSessionMutate } from "./useLiveSessionMutate";

interface UseLiveSessionResult {
  /** Host a deck as a live session, then open its session page. */
  present: (deckId: string) => Promise<void>;
  /** Join a session by room code, then open its session page. */
  join: (request: JoinApiArg["joinSessionRequest"]) => Promise<void>;
  /** True while a `present` (create-session) request is in flight. */
  isStarting: boolean;
  /** A user-readable message if the last `present` failed, else null. */
  startError: string | null;
}

const useLiveSession = (): UseLiveSessionResult => {
  const navigate = useNavigate();
  const { create, join: joinMutation } = useLiveSessionMutate();
  // Presentation state for the "Start" affordance. It's a view-model concern
  // (see hook-roles.md), so it lives here rather than on the write boundary:
  // `present` awaits the create command, then navigates on success or surfaces
  // the failure on `startError` so the button can report it.
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const goToSession = (sessionId: string | undefined) => {
    if (!sessionId) return;
    void navigate({ to: "/sessions/$sessionId", params: { sessionId } });
  };

  const present = async (deckId: string) => {
    setIsStarting(true);
    setStartError(null);
    try {
      const { sessionId } = await create(deckId);
      goToSession(sessionId);
    } catch (err) {
      setStartError(
        extractErrorMessage(err, "Couldn't start the session. Please try again."),
      );
    } finally {
      setIsStarting(false);
    }
  };

  const join = async (request: JoinApiArg["joinSessionRequest"]) => {
    const { sessionId } = await joinMutation(request);
    goToSession(sessionId);
  };

  return { present, join, isStarting, startError };
};

export { useLiveSession };
export type { UseLiveSessionResult };
