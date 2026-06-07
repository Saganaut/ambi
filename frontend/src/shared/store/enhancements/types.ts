/**
 * Shared types for the per-feature cache-sync enhancements that layer onto
 * the auto-generated AmbiApi. Each enhancement file imports only what
 * it needs from here; feature-specific shapes (CollectionSyncApi,
 * ChatSendApi, etc.) stay private to their own module.
 */

export interface WithApiQueries {
  api?: {
    queries?: Record<
      string,
      | { endpointName?: string; originalArgs?: unknown; data?: unknown }
      | undefined
    >;
  };
}

export interface CacheSyncApi {
  dispatch: (action: unknown) => unknown;
  getState: () => WithApiQueries;
  queryFulfilled: Promise<{ data: unknown }>;
}

/**
 * Minimal `onQueryStarted` lifecycle api for mutations that reconcile a cache
 * from their own response. Parameterized over the response `Data` so the
 * `queryFulfilled` payload stays typed; `dispatch` returns the patch handle
 * whose `.undo()` rolls back the optimistic update on reject. Hand-written to
 * sidestep RTK Query's heavy internal `MutationLifecycleApi` generics.
 */
export interface CacheSyncMutationApi<Data> {
  dispatch: (action: unknown) => { undo: () => void };
  queryFulfilled: Promise<{ data: Data }>;
}
