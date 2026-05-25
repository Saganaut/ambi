/**
 * Notification cache patches for the bell dropdown.
 *
 * - `optimisticMarkNotificationRead` flips every cached copy of the row to
 *   read=true and decrements the badge counter. On fulfillment the server
 *   returns the authoritative DTO and we splice it back in; on reject we
 *   undo. The notification list endpoint paginates with (page, size); a
 *   user opening the dropdown might have queried page 0 only, so we patch
 *   every cached page we find via {@link ListNotificationsApiArg}
 *   reflection on the queries map.
 *
 * - `optimisticMarkAllNotificationsRead` marks every cached row read and
 *   zeroes the badge. Round-trip then reconciles the badge to the count
 *   the server reports back (always 0 unless a fresh notification raced
 *   the request).
 *
 * - `optimisticDismissNotification` removes a row from every cached page and
 *   adjusts the unread badge if the dismissed row was still unread. The
 *   server returns 200 with empty body; on failure we undo.
 *
 * Imported for its side effect via the `../apiEnhancements` barrel.
 */
import {
  BrainFlex,
  type ListNotificationsApiArg,
  type NotificationResponse,
} from "../BrainFlexApi";
import type { CacheSyncApi } from "./types";

// `updateQueryData` thunks are dispatched for their PatchCollection handle so
// we can `.undo()` on reject. CacheSyncApi.dispatch is intentionally typed
// `unknown` (it dispatches many action shapes), so narrow the handle here.
interface PatchHandle {
  undo: () => void;
}

const optimisticMarkNotificationRead = async (
  arg: { id: string },
  api: CacheSyncApi,
) => {
  const queries = api.getState().api?.queries ?? {};
  const patches: PatchHandle[] = [];
  // Decide whether the row was previously unread *before* patching cached
  // pages, so the badge-decrement decision is independent of the iteration
  // order and ESLint can narrow the type cleanly.
  const wasUnread = Object.values(queries).some((entry) => {
    if (entry?.endpointName !== "listNotifications") return false;
    const cached = (
      entry.data as { items?: NotificationResponse[] } | undefined
    )?.items;
    return cached?.some((row) => row.id === arg.id && !row.read) ?? false;
  });
  for (const entry of Object.values(queries)) {
    if (entry?.endpointName !== "listNotifications") continue;
    const queryArg = entry.originalArgs as ListNotificationsApiArg | undefined;
    if (!queryArg) continue;
    patches.push(
      api.dispatch(
        BrainFlex.util.updateQueryData(
          "listNotifications",
          queryArg,
          (draft) => {
            if (!draft.items) return;
            for (const row of draft.items) {
              if (row.id !== arg.id) continue;
              row.read = true;
              row.readAt = new Date().toISOString();
            }
          },
        ),
      ) as PatchHandle,
    );
  }
  if (wasUnread) {
    patches.push(
      api.dispatch(
        BrainFlex.util.updateQueryData(
          "getUnreadNotificationCount",
          undefined,
          (draft) => {
            if (typeof draft.count === "number") {
              draft.count = Math.max(0, draft.count - 1);
            }
          },
        ),
      ) as PatchHandle,
    );
  }
  try {
    const { data } = await api.queryFulfilled;
    const authoritative = data as NotificationResponse;
    for (const entry of Object.values(queries)) {
      if (entry?.endpointName !== "listNotifications") continue;
      const queryArg = entry.originalArgs as
        | ListNotificationsApiArg
        | undefined;
      if (!queryArg) continue;
      api.dispatch(
        BrainFlex.util.updateQueryData(
          "listNotifications",
          queryArg,
          (draft) => {
            if (!draft.items) return;
            for (const row of draft.items) {
              if (row.id === authoritative.id)
                Object.assign(row, authoritative);
            }
          },
        ),
      );
    }
  } catch {
    for (const p of patches) p.undo();
  }
};

const optimisticMarkAllNotificationsRead = async (api: CacheSyncApi) => {
  const queries = api.getState().api?.queries ?? {};
  const nowIso = new Date().toISOString();
  const patches: PatchHandle[] = [];
  for (const entry of Object.values(queries)) {
    if (!entry) continue;
    if (entry.endpointName !== "listNotifications") continue;
    const queryArg = entry.originalArgs as ListNotificationsApiArg | undefined;
    if (!queryArg) continue;
    patches.push(
      api.dispatch(
        BrainFlex.util.updateQueryData(
          "listNotifications",
          queryArg,
          (draft) => {
            if (!draft.items) return;
            for (const row of draft.items) {
              if (!row.read) {
                row.read = true;
                row.readAt = nowIso;
              }
            }
          },
        ),
      ) as PatchHandle,
    );
  }
  patches.push(
    api.dispatch(
      BrainFlex.util.updateQueryData(
        "getUnreadNotificationCount",
        undefined,
        (draft) => {
          draft.count = 0;
        },
      ),
    ) as PatchHandle,
  );
  try {
    const { data } = await api.queryFulfilled;
    const echoed = data as { count?: number };
    if (typeof echoed.count === "number") {
      api.dispatch(
        BrainFlex.util.updateQueryData(
          "getUnreadNotificationCount",
          undefined,
          (draft) => {
            draft.count = echoed.count ?? 0;
          },
        ),
      );
    }
  } catch {
    for (const p of patches) p.undo();
  }
};

const optimisticDismissNotification = async (
  arg: { id: string },
  api: CacheSyncApi,
) => {
  const queries = api.getState().api?.queries ?? {};
  const patches: PatchHandle[] = [];
  // See {@link optimisticMarkNotificationRead}: decide whether the dismissed
  // row was unread before mutating cached pages, so the badge decrement is
  // independent of iteration order.
  const wasUnread = Object.values(queries).some((entry) => {
    if (entry?.endpointName !== "listNotifications") return false;
    const cached = (
      entry.data as { items?: NotificationResponse[] } | undefined
    )?.items;
    return cached?.some((row) => row.id === arg.id && !row.read) ?? false;
  });
  for (const entry of Object.values(queries)) {
    if (entry?.endpointName !== "listNotifications") continue;
    const queryArg = entry.originalArgs as ListNotificationsApiArg | undefined;
    if (!queryArg) continue;
    patches.push(
      api.dispatch(
        BrainFlex.util.updateQueryData(
          "listNotifications",
          queryArg,
          (draft) => {
            if (!draft.items) return;
            const before = draft.items.length;
            draft.items = draft.items.filter((row) => row.id !== arg.id);
            if (draft.totalElements != null && before > draft.items.length) {
              draft.totalElements = Math.max(
                0,
                draft.totalElements - (before - draft.items.length),
              );
            }
          },
        ),
      ) as PatchHandle,
    );
  }
  if (wasUnread) {
    patches.push(
      api.dispatch(
        BrainFlex.util.updateQueryData(
          "getUnreadNotificationCount",
          undefined,
          (draft) => {
            if (typeof draft.count === "number") {
              draft.count = Math.max(0, draft.count - 1);
            }
          },
        ),
      ) as PatchHandle,
    );
  }
  try {
    await api.queryFulfilled;
  } catch {
    for (const p of patches) p.undo();
  }
};

BrainFlex.enhanceEndpoints({
  endpoints: {
    markNotificationRead: {
      onQueryStarted: (arg, api) => optimisticMarkNotificationRead(arg, api),
    },
    markAllNotificationsRead: {
      onQueryStarted: (_arg, api) => optimisticMarkAllNotificationsRead(api),
    },
    dismissNotification: {
      onQueryStarted: (arg, api) => optimisticDismissNotification(arg, api),
    },
  },
});
