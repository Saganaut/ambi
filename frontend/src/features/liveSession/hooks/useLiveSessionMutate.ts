// Write boundary for a live session. Wraps every command mutation behind
// intent-level handlers so callers never touch RTK Query directly. The backend
// is broadcast-only: each command is an HTTP POST whose effect comes back to all
// clients as a `SessionEvent` over the socket, so these handlers just fire and
// forget — there is no response cache to reconcile (the socket is the update
// path). Commands that return a body (`create`, `join`, `advance`) hand back the
// unwrapped promise so the `useLiveSession` view-model can act on it (navigate).
//
// Write-only surface (see z-docs/rules/frontend/hook-roles.md): read live state
// via `useLiveSessionQuery`. Args are typed by indexed access on the generated
// `*ApiArg` types so a schema change breaks compilation.
import {
  useAdvanceMutation,
  useCancelMutation,
  useCloseRoundMutation,
  useCreateMutation,
  useEndMutation,
  useGoToRoundMutation,
  useHeartbeatMutation,
  useJoinMutation,
  useLeaveMutation,
  useReconnectMutation,
  useRestartRoundMutation,
  useRevealResponsesMutation,
  useRevealResultsMutation,
  useStartMutation,
  useSubmitAnswerMutation,
  type AdvanceApiResponse,
  type CreateApiArg,
  type CreateApiResponse,
  type JoinApiArg,
  type JoinApiResponse,
  type SubmitAnswerApiArg,
} from "../store/liveSessionApi.gen";

interface UseLiveSessionMutateResult {
  // ── Lobby / lifecycle ──
  /** Open a new lobby for a deck; resolves with the session handles to host with. */
  create: (deckId: string) => Promise<CreateApiResponse>;
  /** Join a session by room code; resolves with the participant handles. */
  join: (request: JoinApiArg["joinSessionRequest"]) => Promise<JoinApiResponse>;
  start: (id: string) => void;
  leave: (id: string) => void;
  end: (id: string) => void;
  cancel: (id: string) => void;

  // ── Answering ──
  submitAnswer: (
    id: string,
    request: SubmitAnswerApiArg["submitAnswerRequest"],
  ) => void;

  // ── Host round & navigation control ──
  /** Advance to the next round; resolves with the opened slide (or terminal). */
  advance: (id: string) => Promise<AdvanceApiResponse>;
  goToRound: (id: string, slideId: string) => void;
  closeRound: (id: string, slideId: string) => void;
  revealResponses: (id: string, slideId: string) => void;
  revealResults: (id: string, slideId: string) => void;
  restartRound: (id: string, slideId: string) => void;

  // ── Presence ──
  reconnect: (id: string) => void;
  heartbeat: (id: string) => void;
}

const useLiveSessionMutate = (): UseLiveSessionMutateResult => {
  const [createMutation] = useCreateMutation();
  const [joinMutation] = useJoinMutation();
  const [startMutation] = useStartMutation();
  const [leaveMutation] = useLeaveMutation();
  const [endMutation] = useEndMutation();
  const [cancelMutation] = useCancelMutation();
  const [submitAnswerMutation] = useSubmitAnswerMutation();
  const [advanceMutation] = useAdvanceMutation();
  const [goToRoundMutation] = useGoToRoundMutation();
  const [closeRoundMutation] = useCloseRoundMutation();
  const [revealResponsesMutation] = useRevealResponsesMutation();
  const [revealResultsMutation] = useRevealResultsMutation();
  const [restartRoundMutation] = useRestartRoundMutation();
  const [reconnectMutation] = useReconnectMutation();
  const [heartbeatMutation] = useHeartbeatMutation();

  const create = (deckId: string) => {
    const request: CreateApiArg["createSessionRequest"] = { deckId };
    return createMutation({ createSessionRequest: request }).unwrap();
  };

  const join = (request: JoinApiArg["joinSessionRequest"]) =>
    joinMutation({ joinSessionRequest: request }).unwrap();

  const start = (id: string) => void startMutation({ id });
  const leave = (id: string) => void leaveMutation({ id });
  const end = (id: string) => void endMutation({ id });
  const cancel = (id: string) => void cancelMutation({ id });

  const submitAnswer = (
    id: string,
    request: SubmitAnswerApiArg["submitAnswerRequest"],
  ) => void submitAnswerMutation({ id, submitAnswerRequest: request });

  const advance = (id: string) => advanceMutation({ id }).unwrap();
  const goToRound = (id: string, slideId: string) =>
    void goToRoundMutation({ id, slideId });
  const closeRound = (id: string, slideId: string) =>
    void closeRoundMutation({ id, slideId });
  const revealResponses = (id: string, slideId: string) =>
    void revealResponsesMutation({ id, slideId });
  const revealResults = (id: string, slideId: string) =>
    void revealResultsMutation({ id, slideId });
  const restartRound = (id: string, slideId: string) =>
    void restartRoundMutation({ id, slideId });

  const reconnect = (id: string) => void reconnectMutation({ id });
  const heartbeat = (id: string) => void heartbeatMutation({ id });

  return {
    create,
    join,
    start,
    leave,
    end,
    cancel,
    submitAnswer,
    advance,
    goToRound,
    closeRound,
    revealResponses,
    revealResults,
    restartRound,
    reconnect,
    heartbeat,
  };
};

export { useLiveSessionMutate };
export type { UseLiveSessionMutateResult };
