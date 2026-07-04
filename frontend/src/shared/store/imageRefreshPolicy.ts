/**
 * RTK Query refresh policy for queries whose responses embed short-lived
 * presigned S3 image URLs (`AppImage.variants`).
 *
 * The backend hydrates opaque S3 keys into presigned GET URLs on read
 * (`ImageUrlResolver` / `AppImageSerializer`) with a 1-hour TTL
 * (`ambi.media.presign-ttl`). Those URLs ride inside cached RTK Query
 * responses, and while a subscriber (the deck editor, the gallery picker) stays
 * mounted the query never refetches on its own — so the URLs freeze at
 * first-fetch time and expire in place, after which Garage answers every
 * `<img>` load with `400 "Date is too old"`.
 *
 * Spreading this policy into a query's hook keeps its presigned URLs fresh
 * through three complementary triggers:
 *   • `refetchOnFocus` / `refetchOnReconnect` — the user tabs away / sleeps the
 *     machine / drops network and returns after the URLs have expired.
 *   • `pollingInterval` — the continuously-focused editor, where no focus event
 *     ever fires during uninterrupted editing.
 *   • `refetchOnMountOrArgChange` — a modal (the gallery picker) that remounts
 *     on each open, so reopening after idle always fetches fresh URLs.
 *
 * The 10-minute interval must stay below the backend's 15-minute
 * `presignRefreshMargin` — the *minimum* remaining life guaranteed on any
 * handed-out URL — so a freshly received URL is always replaced before it can
 * die. Cost is low: the backend caches each key's signed URL for ~45 minutes
 * and returns the identical string until then, so most polls change nothing and
 * an `<img src>` only actually reloads when the backend re-signs.
 *
 * Requires `setupListeners` (wired in `store.ts`) for the focus/reconnect flags.
 */
export const IMAGE_QUERY_REFRESH = {
  pollingInterval: 10 * 60 * 1000,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: 5 * 60, // seconds
} as const;
