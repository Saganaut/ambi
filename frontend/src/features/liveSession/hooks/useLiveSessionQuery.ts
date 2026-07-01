// The read boundary for the live session. Selects the socket-fed
// `liveSessionSlice` and returns it as the page's read model — every component
// that renders session state composes this hook rather than reaching into Redux
// or the socket. The slice is seeded from the REST snapshot and kept current by
// STOMP events, both owned by `SessionConnectionProvider`; this hook only reads.
//
// Write via `useLiveSessionMutate`; workflow/navigation via `useLiveSession`.
// See z-docs/rules/frontend/hook-roles.md.
import { useAppSelector } from "@store/hooks";

import type { LiveSessionState } from "../store/liveSessionSlice";

/** The live read model — the current slice snapshot (see {@link LiveSessionState}). */
type UseLiveSessionQueryResult = LiveSessionState;

const useLiveSessionQuery = (): UseLiveSessionQueryResult =>
  useAppSelector((state) => state.liveSession);

export { useLiveSessionQuery };
export type { UseLiveSessionQueryResult };
