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
  const { data: snapshot, isLoading, error } = useSnapshotQuery({ id: sessionId });

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
    uploadDrawing: (file) => mutate.uploadDrawing(sessionId, file),
    sendRevealResponses: (slideId) => {
      mutate.revealResponses(sessionId, slideId);
    },
    sendCloseRound: (slideId) => {
      mutate.closeRound(sessionId, slideId);
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

  // Open the socket once the snapshot has given us the topic key (publicId).
  // Keyed on publicId so a snapshot refetch doesn't churn the connection; resets
  // the slice when the page unmounts.
  const publicId = snapshot?.publicId;
  useEffect(() => {
    if (!publicId) return;
    const close = openLiveSessionSocket(publicId, {
      onEvent: (event) => dispatch(eventReceived(event)),
      onConnectionChange: (status) => dispatch(connectionChanged(status)),
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
