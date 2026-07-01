// Context for the session's host/answer commands. Kept in its own (non-component)
// module so the provider file can stay component-only for fast refresh.
// `SessionConnectionProvider` supplies the value — an adapter over the REST
// command hook `useLiveSessionMutate` — and consumers (SessionControls,
// McqBoardContent) read it via `useSessionConnection`.
//
// This is the write seam: the board reads live state through `useLiveSessionQuery`
// and fires commands through here. The surface is intentionally narrow — only the
// commands the current board consumers issue — and each maps to one REST mutation
// (the effect returns to every client over the socket).
import { createContext, use } from "react";

import type { SubmitAnswerApiArg } from "../../store/liveSessionApi.gen";

/** The answer payload a participant submits — the discriminated `payload` body. */
export type SessionAnswerPayload =
  SubmitAnswerApiArg["submitAnswerRequest"]["payload"];

export interface SessionConnection {
  /** Host: start the session from the lobby. */
  sendStart: () => void;
  /** Participant: submit this device's answer for the given slide. */
  sendAnswer: (slideId: string, payload: SessionAnswerPayload) => void;
  /** Host: reveal the live response distribution without ending the round. */
  sendRevealResponses: (slideId: string) => void;
  /** Host: close submissions for the round (locks + scores it). */
  sendCloseRound: (slideId: string) => void;
  /**
   * Host: reveal the results (correct answer + scores). The backend requires the
   * round to be closed first — see {@link sendCloseRound}.
   */
  sendRevealResults: (slideId: string) => void;
  /** Host: advance to the next round. */
  sendAdvance: () => void;
  /** Host: restart the current round from the top. */
  sendRestartRound: (slideId: string) => void;
  /** Host: end the session now; scores so far are final. */
  sendEnd: () => void;
}

export const SessionConnectionContext = createContext<SessionConnection | null>(
  null,
);

/** Access the session's command surface. Must be used within the provider. */
export const useSessionConnection = (): SessionConnection => {
  const ctx = use(SessionConnectionContext);
  if (!ctx) {
    throw new Error(
      "useSessionConnection must be used within a SessionConnectionProvider",
    );
  }
  return ctx;
};
