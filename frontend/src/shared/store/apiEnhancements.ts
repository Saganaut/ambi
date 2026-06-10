/**
 * Barrel that registers the per-feature cache-sync rules onto the auto-
 * generated AmbiApi. Each side-effect import below runs a
 * `Ambi.enhanceEndpoints({ ... })` call for one feature surface
 * (decks, collections, favorites, …).
 *
 * The shared strategy is response reconciliation: each mutation optimistically
 * patches the relevant query cache in `onQueryStarted`, then folds its own
 * canonical response back in to land server truth (LexoRank `sortOrder`,
 * `version`, `acl`, audit ids) — no refetch. The slide editor reconciles the
 * `listDeckSlides` list (see `./enhancements/slide`); the deck surface reconciles
 * the `getDeck` object (see `./enhancements/deck`). The lone holdout is
 * `deleteDeck`, which has no response to reconcile and instead splices the
 * deleted deck out of every cached deck-list query.
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
import "@deck/store/enhancements/deck";
import "@deck/store/enhancements/slide";
import "@deck/store/enhancements/comment";
import "@features/theme/store/enhancements/theme";
import "@features/gallery/store/enhancements/gallery";
import "@auth/store/enhancements/user";
