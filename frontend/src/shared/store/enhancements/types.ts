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
