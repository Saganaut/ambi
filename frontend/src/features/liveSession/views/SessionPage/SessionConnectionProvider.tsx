// Owns the one live connection for a session page. On mount it fetches the REST
// snapshot (the sole caller of the generated `useSnapshotQuery`), seeds the
// `liveSessionSlice`, then opens the STOMP socket and streams every event into
// the slice — so the whole page renders from one seeded-then-live read model
// (read via `useLiveSessionQuery`). It gates its children behind the snapshot so
// consumers never see an empty store.
//
// It still supplies the legacy `SessionConnection` context (the send-actions
// surface) as a no-op: those commands moved to REST (`useLiveSessionMutate`), but
// the old board consumers still read `useSessionConnection`, so the context stays
// until their migration. New code should not use it.
import { useEffect, type ReactNode } from "react";

import { useAppDispatch } from "@store/hooks";

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

interface SessionConnectionProviderProps {
  /** The session id — carried by the `$sessionId` route param; the REST/snapshot key. */
  sessionId: string;
  children: ReactNode;
}

const noopConnection: SessionConnection = {
  sendStart: () => {},
  sendAnswer: () => {},
  sendVote: () => {},
  sendNextRound: () => {},
  sendLeave: () => {},
  sendBoot: () => {},
  sendEndInteractiveSession: () => {},
  sendRevealNow: () => {},
  sendFreezeResponses: () => {},
  sendEndSubmitPhase: () => {},
  sendRestart: () => {},
  sendPauseTimer: () => {},
  sendResumeTimer: () => {},
  sendChat: () => {},
  sendReaction: () => {},
};

const SessionConnectionProvider = ({
  sessionId,
  children,
}: SessionConnectionProviderProps) => {
  const dispatch = useAppDispatch();
  const { data: snapshot, isLoading, error } = useSnapshotQuery({ id: sessionId });

  // Seed (and re-seed on any refetch) the read model from the snapshot.
  useEffect(() => {
    if (snapshot) dispatch(seed(snapshot));
  }, [snapshot, dispatch]);

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
    <SessionConnectionContext value={noopConnection}>
      {children}
    </SessionConnectionContext>
  );
};

export { SessionConnectionProvider };
