// Owns the one live connection for a session page. On mount it fetches the REST
// snapshot (the sole caller of the generated `useSnapshotQuery`), seeds the
// `liveSessionSlice`, then opens the STOMP socket and streams every event into
// the slice — so the whole page renders from one seeded-then-live read model
// (read via `useLiveSessionQuery`). It gates its children behind the snapshot so
// consumers never see an empty store.
//
// It also supplies the `SessionConnection` context — the board's command surface —
// as a thin adapter over the REST command hook `useLiveSessionMutate`, keyed on
// this session's id. Consumers (SessionControls, McqBoardContent) fire commands
// through it; the effect returns to every client over the socket.
import { useEffect, useRef, type ReactNode } from "react";

import { useAppDispatch, useAppSelector } from "@store/hooks";

import { useLiveSessionMutate } from "../../hooks/useLiveSessionMutate";
import { useSnapshotQuery } from "../../store/liveSessionApi.gen";
import {
  connectionChanged,
  eventReceived,
  myVoteRecorded,
  reset,
  seed,
} from "../../store/liveSessionSlice";
import { openLiveSessionSocket } from "../../store/liveSessionSocket";
import { SessionConnectionContext } from "./SessionConnectionContext";
import type { SessionConnection } from "./SessionConnectionContext";
import styles from "./SessionConnectionProvider.module.css";

/**
 * How often each connected client beats. Must sit well inside the backend's
 * host-offline threshold (`ambi.session.deadlines.host-offline-after`, 30s) so
 * a healthy host is never mistaken for disconnected.
 */
const HEARTBEAT_INTERVAL_MS = 10_000;

/**
 * How long a detected gap waits before the snapshot is refetched. Coalesces a
 * burst of out-of-order arrivals into one fetch, and rate-limits the retry when
 * the fresh snapshot still doesn't close the gap (the slice keeps the flag set
 * until it does).
 */
const RESYNC_REFETCH_DELAY_MS = 250;

interface SessionConnectionProviderProps {
  /** The session id — carried by the `$sessionId` route param; the REST/snapshot key. */
  sessionId: string;
  children: ReactNode;
}

const SessionConnectionProvider = ({
  sessionId,
  children,
}: SessionConnectionProviderProps) => {
  const dispatch = useAppDispatch();
  const {
    data: snapshot,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useSnapshotQuery({ id: sessionId });

  // The command surface: each send maps to one REST mutation keyed on this
  // session's id (the effect comes back over the socket). Built inline — the
  // handlers are stable RTK dispatchers and the few consumers re-render from
  // query state anyway.
  const mutate = useLiveSessionMutate();
  const connection: SessionConnection = {
    sendStart: () => {
      mutate.start(sessionId);
    },
    sendAnswer: (slideId, payload) => {
      mutate.submitAnswer(sessionId, { slideId, payload });
    },
    sendVote: (slideId, optionId) => {
      // Record the accepted vote locally: the POST returns no body and the
      // VoteCast broadcast never identifies the voter.
      mutate.submitVote(sessionId, slideId, optionId).then(
        () => dispatch(myVoteRecorded(optionId)),
        () => undefined, // rejected vote (closed / own answer) — leave state as-is
      );
    },
    uploadDrawing: (file) => mutate.uploadDrawing(sessionId, file),
    sendRevealResponses: (slideId) => {
      mutate.revealResponses(sessionId, slideId);
    },
    sendCloseRound: (slideId) => {
      mutate.closeRound(sessionId, slideId);
    },
    sendOpenVoting: (slideId) => {
      mutate.openVoting(sessionId, slideId);
    },
    sendRevealResults: (slideId) => {
      mutate.revealResults(sessionId, slideId);
    },
    sendAdvance: () => {
      void mutate.advance(sessionId);
    },
    sendRestartRound: (slideId) => {
      mutate.restartRound(sessionId, slideId);
    },
    sendPauseTimer: (slideId) => {
      mutate.pauseTimer(sessionId, slideId);
    },
    sendResumeTimer: (slideId) => {
      mutate.resumeTimer(sessionId, slideId);
    },
    sendHostAnswer: (slideId, questionId, answer) => {
      mutate.answerQuestion(sessionId, slideId, questionId, answer);
    },
    sendEnd: () => {
      mutate.end(sessionId);
    },
  };

  // Seed (and re-seed on any refetch) the read model from the snapshot.
  useEffect(() => {
    if (snapshot) dispatch(seed(snapshot));
  }, [snapshot, dispatch]);

  // Re-seed whenever the slice reports missed events. The snapshot is the only
  // way back to a coherent state — the topic has no replay — and the slice
  // replays whatever it buffered on top of the fresh seed, keeping the flag set
  // if a gap survives (which schedules another attempt). Refetching is the
  // hook's own `refetch`, not a cache invalidation (see rtk-query-cache rules);
  // it is read through a ref so the socket effect below can share it without
  // taking on RTK Query's identity churn as a dependency.
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  const resyncNeeded = useAppSelector((state) => state.liveSession.resyncNeeded);
  useEffect(() => {
    if (!resyncNeeded || isFetching) return;
    const timer = setTimeout(() => {
      void refetchRef.current();
    }, RESYNC_REFETCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [resyncNeeded, isFetching]);

  // Refetch once when a follow-up round opens. The snapshot is the ONLY channel
  // for `myFollowUpOptionId` — which of the round's candidates the viewer
  // authored — because it is per-participant while the STOMP topic is shared by
  // every client, so no broadcast event may carry it. A late joiner gets it in
  // the snapshot it joins on; a client already connected when the round opens
  // only ever sees `RoundStarted`, so it fetches a fresh snapshot here (which
  // re-seeds through the same `seed` path as any other refetch).
  //
  // Guarded by the round the field was last obtained for — the slide id plus its
  // start instant, so a restart of the same follow-up (fresh candidates, and the
  // slice cleared the field) counts as a new round. Any seed already carries the
  // field for the round it describes (first effect below), so the refetch (the
  // second) fires at most once per follow-up round and never for another kind.
  const followUpRound = useAppSelector((state) =>
    state.liveSession.currentSlide?.followUp
      ? `${state.liveSession.currentSlideId ?? ""}@${state.liveSession.roundStartedAt ?? ""}`
      : null,
  );
  const seededRound = snapshot
    ? `${snapshot.currentSlideId ?? ""}@${snapshot.currentRoundStartedAt ?? ""}`
    : null;
  const followUpSeededForRef = useRef<string | null>(null);
  useEffect(() => {
    if (seededRound != null) followUpSeededForRef.current = seededRound;
  }, [seededRound]);
  useEffect(() => {
    if (followUpRound == null) return;
    if (followUpSeededForRef.current === followUpRound) return;
    // Claim the round before fetching so a re-render can't fire a second one.
    followUpSeededForRef.current = followUpRound;
    void refetchRef.current();
  }, [followUpRound]);

  // Liveness heartbeat while the session is live (server-debounced). Presence
  // feeds the roster display, and a host's beats arm the host-disconnect watch
  // that auto-pauses timed rounds (ADR 002/F5) — so send one immediately, then
  // keep beating well inside the server's 30s offline threshold. Stops once the
  // session goes terminal (the live status comes from the slice, which tracks
  // the ended/cancelled events the snapshot alone would miss). The command
  // adapter is a fresh closure each render, so the interval calls through a ref
  // instead of keying the effect on it (which would churn the timer every
  // render).
  const heartbeatRef = useRef(mutate.heartbeat);
  heartbeatRef.current = mutate.heartbeat;
  const liveStatus = useAppSelector((state) => state.liveSession.status);
  const beating =
    snapshot != null && liveStatus !== "FINISHED" && liveStatus !== "CANCELLED";
  useEffect(() => {
    if (!beating) return;
    heartbeatRef.current(sessionId);
    const timer = setInterval(() => {
      heartbeatRef.current(sessionId);
    }, HEARTBEAT_INTERVAL_MS);
    return () => {
      clearInterval(timer);
    };
  }, [beating, sessionId]);

  // Open the socket once the snapshot has given us the topic key (publicId) —
  // snapshot-first is forced, since publicId is only known from the snapshot.
  // The window between the snapshot read and the subscription is covered by the
  // slice's gap detection: the first envelope past `lastSequence + 1` triggers
  // the re-seed above. Keyed on publicId so a snapshot refetch doesn't churn the
  // connection; resets the slice when the page unmounts.
  const publicId = snapshot?.publicId;
  useEffect(() => {
    if (!publicId) return;
    const close = openLiveSessionSocket(publicId, {
      onEvent: (envelope) => dispatch(eventReceived(envelope)),
      onConnectionChange: (status) => dispatch(connectionChanged(status)),
      // Everything broadcast during the drop was missed silently, so close that
      // window the same way a gap is closed — with a fresh snapshot.
      onReconnect: () => {
        void refetchRef.current();
      },
    });
    return () => {
      close();
      dispatch(reset());
    };
  }, [publicId, dispatch]);

  if (error) {
    return <div className={styles.state}>Could not load this session.</div>;
  }
  if (isLoading || !snapshot) {
    return <div className={styles.state}>Loading session…</div>;
  }

  return (
    <SessionConnectionContext value={connection}>
      {children}
    </SessionConnectionContext>
  );
};

export { SessionConnectionProvider };
