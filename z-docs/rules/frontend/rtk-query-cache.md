# RTK Query cache & intent hooks

Two paired conventions govern how the frontend talks to the API: **mutations reconcile the cache from their own response** (they don't invalidate + refetch), and **components reach the cache only through intent-level hooks** (never raw generated mutations).

## Optimistic patch → response reconcile (never invalidate + refetch)

Cache behavior is layered onto the generated, never-edited API via `enhanceEndpoints` in per-feature side-effect modules under `features/<f>/store/enhancements/*.ts`. Each mutation:

1. **Optimistically patches** the relevant query cache in `onQueryStarted` (`api.util.updateQueryData(...)`) so the UI updates instantly — *skipped* for mutations whose result needs server data (e.g. `shareDeck` reshapes the `acl`, nothing to preview);
2. **awaits `queryFulfilled`** and folds the canonical response **straight back into the cache** — a whole-object replace, so server-owned fields (`version`, `acl`, `permissions`, LexoRank `sortOrder`, audit ids) land and dropped optional fields clear;
3. **undoes the patch on reject** (`patch.undo()`).

**No mutation invalidates a tag to trigger a refetch.** The reference implementation is `features/deck/store/enhancements/deck.ts` (`reconcilingDeckMutation` factory); the deck feature's `slide.ts` / `comment.ts` / `promote.ts`, plus `theme/store/enhancements/theme.ts`, `gallery/…/gallery.ts`, and `auth/…/user.ts`, follow suit. Two documented exceptions:

- a delete (`deleteDeck`) has no response to reconcile, so it splices the entity out of every cached list instead;
- `gallery.ts` re-reads after every image write (`listImages.initiate(arg, { subscribe: false, forceRefetch: true })`). `listImages` is a *server-driven* page, so a local splice can't be the final state — the write still patches optimistically for instant feedback, then the refetch refills the page and restores the server totals that drive the pager.

Each enhancement module is imported **for its side effect only** from the `shared/store/apiEnhancements.ts` barrel, which `store.ts` imports — drop that import and the mutations silently fall out of sync. Add a new feature's enhancements by adding a side-effect import line there.

## Intent-level hooks wrap every mutation

Components never call a generated `useXMutation` directly. Each feature exposes a hook (`useDeckMutate`, `useAuthActions`, `useRegister`, `useAccount`) that:

- wraps the query + its mutations and returns a **named result object** (`UseDeckMutateResult`, never a bare tuple) of intent handlers — `rename`, `setVisibility`, `share`, `remove`;
- keeps handlers thin (just fire the mutation) — cache behavior stays in the enhancement module so it applies no matter who calls;
- types mutation params via **indexed access** on the generated arg types (`setVisibility: (visibility: SetVisibilityRequest["visibility"]) => void`) so a schema change breaks compilation rather than drifting.

Worked example: `features/deck/hooks/useDeckMutate.ts`. Which hook owns which surface is governed by [hook-roles.md](hook-roles.md).
