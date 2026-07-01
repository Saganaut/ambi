// Entry-point view-model for reaching a live session: it turns a deck (host) or a
// room code (player) into a running session and navigates to its page. It owns
// the UI concern the write boundary must not — navigation — composing
// `useLiveSessionMutate` with the router.
//
// Deliberately minimal for now: the full in-session board view-model (composing
// `useLiveSessionQuery` + the host/answer commands for SessionBoard) is a
// follow-up. See z-docs/rules/frontend/hook-roles.md.
import { useNavigate } from "@tanstack/react-router";

import type { JoinApiArg } from "../store/liveSessionApi.gen";
import { useLiveSessionMutate } from "./useLiveSessionMutate";

interface UseLiveSessionResult {
  /** Host a deck as a live session, then open its session page. */
  present: (deckId: string) => Promise<void>;
  /** Join a session by room code, then open its session page. */
  join: (request: JoinApiArg["joinSessionRequest"]) => Promise<void>;
}

const useLiveSession = (): UseLiveSessionResult => {
  const navigate = useNavigate();
  const { create, join: joinMutation } = useLiveSessionMutate();

  const goToSession = (sessionId: string | undefined) => {
    if (!sessionId) return;
    void navigate({ to: "/sessions/$sessionId", params: { sessionId } });
  };

  const present = async (deckId: string) => {
    const { sessionId } = await create(deckId);
    goToSession(sessionId);
  };

  const join = async (request: JoinApiArg["joinSessionRequest"]) => {
    const { sessionId } = await joinMutation(request);
    goToSession(sessionId);
  };

  return { present, join };
};

export { useLiveSession };
export type { UseLiveSessionResult };
