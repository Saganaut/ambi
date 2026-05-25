/**
 * Manages the per-user STOMP subscription that pushes new
 * {@link NotificationResponse} rows into the dropdown the instant the server
 * writes them.
 *
 * Lifecycle is scoped to a registered user: while the caller is signed in we
 * connect to /ws, subscribe to `/user/queue/notifications`, and dispatch every
 * frame into the RTK Query cache (prepend to `listNotifications` pages and
 * bump `getUnreadNotificationCount`). When the connection drops the bell
 * polls `getUnreadNotificationCount` every 60s as a fallback — the polling
 * lives in the badge component and is unaffected by this hook.
 *
 * Visitors / guests don't get a subscription — the bell renders nothing for
 * them, so there's nothing for the stream to drive.
 */
import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

import { apiBaseUrl } from "../store/emptyApi";
import { useAppDispatch } from "../store/hooks";
import { BrainFlex, type NotificationResponse } from "../store/BrainFlexApi";

export function useNotificationStream(enabled: boolean) {
  const dispatch = useAppDispatch();
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(`${apiBaseUrl}/ws`),
      reconnectDelay: 3000,
      onConnect: () => {
        client.subscribe("/user/queue/notifications", (msg) => {
          const row = JSON.parse(msg.body) as NotificationResponse;
          // The list endpoint is paginated; the user might have hydrated
          // page 0 only. Patching every cached page keeps stale dropdowns
          // consistent with what's now on the server.
          const queries =
            // RTK Query exposes the query cache through getState; we go
            // through the store's util to avoid coupling to its internal
            // shape more than necessary.
            BrainFlex.endpoints.listNotifications.select({
              page: 0,
              size: 20,
            }) as unknown;
          // Force-fetch a fresh first page so server-side ordering is
          // authoritative; the optimistic prepend below covers the eye-blink
          // gap before that fetch lands.
          void queries;
          dispatch(
            BrainFlex.util.updateQueryData(
              "listNotifications",
              { page: 0, size: 20 },
              (draft) => {
                draft.items ??= [];
                if (!draft.items.some((existing) => existing.id === row.id)) {
                  draft.items.unshift(row);
                  if (draft.totalElements != null) draft.totalElements += 1;
                }
              },
            ),
          );
          if (!row.read) {
            dispatch(
              BrainFlex.util.updateQueryData(
                "getUnreadNotificationCount",
                undefined,
                (draft) => {
                  draft.count = (draft.count ?? 0) + 1;
                },
              ),
            );
          }
        });
      },
    });

    clientRef.current = client;
    client.activate();

    return () => {
      void client.deactivate();
      clientRef.current = null;
    };
  }, [enabled, dispatch]);
}
