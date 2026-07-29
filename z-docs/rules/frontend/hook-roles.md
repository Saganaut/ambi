# Hook Roles — the CQRS hook layer

**Rule:** Every hook in a feature is exactly one of three kinds, and the kind is
legible from its name. Components and views read and write feature state only
through these hooks — never the generated RTK Query endpoints directly. The
one narrow exception is the **shared interaction-state hook** carved out
below — it isn't a CQRS hook at all, because it touches no server state.

This is the **CQRS** seam of the architecture: the data layer is split into
read-only **query hooks** and write-only **mutate hooks** over the RTK Query
cache (the single source of truth), composed for the screen by **view-model
hooks**. It sits inside the feature-sliced layering of
[file-structure.md](file-structure.md) and pairs with the cache conventions in
[rtk-query-cache.md](rtk-query-cache.md).

## The three kinds

| Kind | Name pattern | Public surface | May do internally |
|---|---|---|---|
| **Query** | `use<Entity>Query` | read only | — |
| **Mutate** | `use<Entity><Slice>Mutate` | write only | read the cache to build payloads; hold write-coordination (debounce) state |
| **View-model** | `use<Workflow>` (`use<Entity>Editor`, `use<Page>`) | composes query + mutate hooks into a render shape | confirm dialogs, navigation, route arguments, local UI state |

Examples: `useDeckQuery` (query); `useDeckMutate`, `useDeckImageMutate`,
`useDeckSettingsMutate` (mutate); `useDeckEditor` (view-model). The `useSlide`
cluster is still unsplit into this taxonomy — `useSlideQuery` doesn't exist
yet; splitting it out is a known TODO, see
[deck-editor/hooks-cleanup.md](../../features/deck-editor/hooks-cleanup.md).

## Query hooks

- **One per aggregate root.** `useDeckQuery(deckId)` returns
  `{ deck, isLoading, error }` and nothing else.
- **Sole caller of the generated read.** The generated `useGet<Entity>Query`
  is imported in **exactly one file** — that entity's query hook. Everything
  that needs the current entity composes `use<Entity>Query`; nobody calls
  `useGetDeckQuery` elsewhere. This is the single chokepoint for "where is the
  deck read?" — fetching policy changes live in one place.
- RTK Query dedupes the request and shares the store slice, so composing the
  query hook in several places mounts cheap, deduped subscriptions — not extra
  network traffic.

## Mutate hooks

- **Write-only public surface.** A mutate hook returns *only* write operations.
  It never returns query data — that would re-merge the read and write seams the
  CQRS split exists to keep apart. Anything that needs to *render* a slice reads
  it from the query hook.
- **Reading the cache to build a command is allowed — and expected.** Assembling
  a correct payload often needs current state: `useDeckSettingsMutate.commit`
  deep-merges the caller's partial sub-object onto the cached full sub-object so
  the PUT body is complete. That internal read (via `useEntityQuery` or a
  non-subscribing selector) is *command construction*, not a query interface;
  CQRS segregates the public surface, not the implementation.
- **Write-coordination state lives here.** Debounce timers and the
  `commit` / `schedule*` / `flush` / `cancel` surface (see
  [frontend-rules.md](../frontend-rules.md) rule 13) are intrinsic to writing and
  belong in the mutate hook.
- **No UI concerns.** Confirm dialogs, navigation, toasts, and route params are
  *not* part of a write boundary — they belong in the view-model hook.
- Handlers stay thin: cache behaviour (optimistic patch + response reconcile)
  lives in `store/enhancements/*.ts` so it applies no matter who fires the
  mutation. Type params via indexed access on the generated arg types so a schema
  change breaks compilation. See [rtk-query-cache.md](rtk-query-cache.md).

## View-model hooks

- Compose the query and mutate hooks for one screen and add the UI-layer concerns
  the data hooks refuse: `useConfirm` dialogs, `useNavigate`, toasts, and local
  presentation state.
- Read **route params only here** (passed *into* data hooks as arguments) per
  [component-design.md](component-design.md) — data hooks never reach into the
  router.
- A view-model hook is imported only by its view. It exists so a panel that needs
  both a slice read and its writes can take a single import instead of wiring
  `useDeckQuery` + `useDeckImageMutate` itself.

## Shared interaction-state hooks (the one carve-out)

A fourth shape exists alongside the three CQRS kinds: a hook that owns
**round-local or gesture-local interaction state shared by several sibling
components**, and touches neither the RTK Query cache nor any other server
state. It fits none of the three kinds above — it is not a query (it derives
nothing from the cache), not a mutate (its writes, if any, are local
`useState`, not a server command), and not a view-model (it has no one owning
view; several peer components import it directly).

- **Named `use<Noun>`, not `use<Entity>Query/Mutate/Editor`** — the ordinary
  naming rules don't apply since the hook is neither an entity accessor nor a
  single screen's composition. `useCappedSelection` (a capped multi-select
  toggle) and `useBoardPlacement` (the drag/tap/nudge placement engine) are
  the two live-session examples, both at
  `SessionBoard/content/` — beside, not above, the sibling board components
  that import them.
- **Owns no server state and reads no cache.** Everything it holds is
  `useState`/`useRef` local to the hook instance; a server write it triggers
  (`useBoardPlacement.submit` calls `sendAnswer`) is a pass-through to a
  connection object the caller supplies, not a mutate hook's cache-reconciled
  command.
- **Deliberately multi-consumer.** Unlike a view-model hook (imported only by
  its one view), a shared interaction-state hook exists *because* two or more
  sibling components need the identical stateful behavior — `useBoardPlacement`
  is the Axis and Place-on-Image boards' shared placement engine, not either
  one's private hook promoted.
- **Lives beside its consumers**, not in a shared hooks directory — it is
  scoped to the one family of components that uses it, following the same
  "shared code sits at the nearest common ancestor" placement as the
  components themselves.

## Status

The deck hooks predate this taxonomy and are being migrated to it — see the
resolution and step plan in
[deck-editor/hooks-cleanup.md](../../features/deck-editor/hooks-cleanup.md). New
hooks must conform.
