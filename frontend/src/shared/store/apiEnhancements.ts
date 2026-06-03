/**
 * Barrel that registers the per-feature cache-sync rules onto the auto-
 * generated AmbiApi. Each side-effect import below runs a
 * `Ambi.enhanceEndpoints({ ... })` call for one feature surface
 * (decks, collections, favorites, …).
 *
 * Two strategies live here. Most surfaces (favorites, ratings, comments,
 * collections, …) splice the canonical mutation response into the relevant
 * query cache so subscribed components re-render without a refetch. The
 * deck + slide editor surfaces instead use tag invalidation (`providesTags`
 * / `invalidatesTags`) with an optimistic `onQueryStarted` patch: the edit
 * shows instantly, then a tag-driven refetch reconciles against server truth
 * (LexoRank `sortOrder`, `version`, audit ids) — see `./enhancements/slide`.
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
import "./enhancements/slide";
