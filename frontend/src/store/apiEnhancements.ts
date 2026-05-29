/**
 * Barrel that registers the per-feature cache-sync rules onto the auto-
 * generated AmbiApi. Each side-effect import below runs a
 * `Ambi.enhanceEndpoints({ ... })` call for one feature surface
 * (decks, collections, favorites, …).
 *
 * The generated mutations all return the canonical updated DTO with
 * presigned `imgUrl` values fully hydrated; the per-feature modules splice
 * those responses into the relevant query caches so subscribed components
 * re-render without a refetch and without any stale-URL merge dance.
 *
 * This file is imported for its side effect from `store.ts`; do not remove
 * the import there or these mutations will silently fall out of sync. The
 * individual `./enhancements/*` modules are likewise imported here only
 * for their side effects.
 *
 * `AmbiApi.ts` is regenerated from the OpenAPI schema, so we layer
 * this behavior on top via `enhanceEndpoints` instead of editing the
 * generated file.
 */
import "./enhancements/deck";
import "./enhancements/collection";
import "./enhancements/collaborator";
import "./enhancements/favorite";
import "./enhancements/comment";
import "./enhancements/rating";
import "./enhancements/interactiveSession";
import "./enhancements/notification";
