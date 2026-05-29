/**
 * Cache-sync rules for the live-session lobby + scoreboard surface.
 *
 * - `seedInteractiveSessionCache` pre-populates the `getInteractiveSession`
 *   cache from the `createInteractiveSession` response so the lobby page
 *   can read the chunk-24 `format` field (and every other lobby header
 *   field) on first render without waiting for the explicit GET. The
 *   roomCode comes from the response — the request arg doesn't know it
 *   yet.
 *
 * - `syncInteractiveSessionCache` splices an authoritative
 *   {@link InteractiveSessionResponse} into every cached `getInteractiveSession`
 *   view for the same roomCode. Team mutations
 *   (create/update/delete/movePlayer) all return the whole session so the
 *   lobby + scoreboard re-render without a refetch and the per-player
 *   teamId stays in sync with the team list.
 *
 * Imported for its side effect via the `../apiEnhancements` barrel.
 */
import { Ambi, type InteractiveSessionResponse } from "../AmbiApi";
import type { CacheSyncApi } from "./types";

const syncInteractiveSessionCache = async (
  roomCode: string,
  api: CacheSyncApi,
) => {
  try {
    const { data } = await api.queryFulfilled;
    api.dispatch(
      Ambi.util.upsertQueryData(
        "getInteractiveSession",
        { roomCode },
        data as InteractiveSessionResponse,
      ),
    );
  } catch {
    // Mutation rejected — leave the cache alone; the caller surfaces error UX.
  }
};

const seedInteractiveSessionCache = async (api: CacheSyncApi) => {
  try {
    const { data } = await api.queryFulfilled;
    const session = data as InteractiveSessionResponse;
    if (!session.roomCode) return;
    api.dispatch(
      Ambi.util.upsertQueryData(
        "getInteractiveSession",
        { roomCode: session.roomCode },
        session,
      ),
    );
  } catch {
    // Creation failed — caller surfaces the error; nothing to cache.
  }
};

Ambi.enhanceEndpoints({
  endpoints: {
    // Chunk 24 — seed the per-roomCode cache from the create response so the
    // lobby's first render already knows `format`, `customRoomCode`,
    // `hostName`, etc. Without this the lobby page mounts with no session in
    // cache and the chrome flips from a GAME default to PRESENTATION once the
    // GET completes.
    createInteractiveSession: {
      onQueryStarted: (_arg, api) => seedInteractiveSessionCache(api),
    },
    // Team mutations all return the full session DTO; splice into the
    // getInteractiveSession cache so the lobby team picker and the scoreboard
    // team badges update without a refetch. The /teams STOMP broadcast still
    // patches the slice for everyone in the room, but this keeps the
    // mutating client itself smooth even if its socket is briefly disconnected.
    createTeam: {
      onQueryStarted: (arg, api) =>
        syncInteractiveSessionCache(arg.roomCode, api),
    },
    updateTeam: {
      onQueryStarted: (arg, api) =>
        syncInteractiveSessionCache(arg.roomCode, api),
    },
    deleteTeam: {
      onQueryStarted: (arg, api) =>
        syncInteractiveSessionCache(arg.roomCode, api),
    },
    movePlayerToTeam: {
      onQueryStarted: (arg, api) =>
        syncInteractiveSessionCache(arg.roomCode, api),
    },
  },
});
