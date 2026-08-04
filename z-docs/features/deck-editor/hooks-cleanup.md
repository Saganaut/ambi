# Deck Hooks — Cleanup Backlog

Open items in `frontend/src/features/deck/hooks/` and `contexts/`. Resolved
entries are deleted rather than annotated — this file is the backlog, not its
history. The hook-kind conventions these items are measured against live in
[hook-roles.md](../../rules/frontend/hook-roles.md).

## Naming

- **`contexts/useImageSlot.tsx` has the wrong extension.** It contains no JSX — a plain `useContext` call. Should be `.ts`.
- **`useCreateDeck.ts` exports two result types.** Both `CreateDeckResult` (the inner `createDeck()` promise's type) and `UseCreateDeckResult` (the hook's). Every other hook exports only `Use*Result`; unexport the non-hook type unless a caller needs it.

## Overlap

- **The `useSlide` cluster still needs the CQRS split.** `useDeck` was split into `useDeckQuery` / `useDeckMutate` / `useDeckActions`, with `useGetDeckQuery` imported in exactly one file. The slide side has had no equivalent pass — `ImageSlotContext` is its instance of the same problem.
- **`useSlide` is mounted in four hooks** — `useDeckEditor`, `useSlideEditor`, `useSlideSettings`, `ImageSlotContext` — plus several components directly, all for the same `deckId`. Safe via the RTK cache, but a component using all four mounts four subscriptions. Document it in `useSlide.ts` or consolidate at the component level.
- **`useDeckEditor` re-exports `removeSlide` and `reorder` unchanged.** Straight pass-throughs from `useSlide`, which many consumers already call directly — so the forwarding is redundant and costs a second subscription for anyone calling both.
- **`ImageSlotContext` is a thin adapter with a route dependency.** Its only genuinely local state is `previewPlacement` (hover preview); all slide data comes from an internal `useSlide` call — the same data the surrounding `useSlideEditor`/`useSlideSettings` already hold. It is also coupled to a specific TanStack Router route via `getRouteApi`, unusual for a context. Either lift `previewPlacement` into the component that owns the hover behaviour and drop the wrapper, or document why a context is needed.

## Debt

- `contexts/ImageSlotContext.tsx` — an unresolved planning comment block ("concerns:", "consider…") above the slot presets. Resolve or delete.
- `useDeckActions.ts` — `addToCollection` is a `console.log` stub. Implement or remove.
- `useCreateDeck.ts` — unresolved `//TODO` about awaiting the persisted deck id.
