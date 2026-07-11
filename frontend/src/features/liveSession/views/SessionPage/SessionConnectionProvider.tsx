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
import { useEffect, type ReactNode } from "react";

import { useAppDispatch } from "@store/hooks";

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
