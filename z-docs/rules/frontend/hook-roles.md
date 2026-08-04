# Hook Roles — the CQRS hook layer

**Rule:** Every hook in a feature is exactly one of three kinds, and the kind is legible from its name. Components and views read and write feature state only through these hooks — never the generated RTK Query endpoints directly.

| Kind | Name pattern | Public surface | May do internally |
|---|---|---|---|
| **Query** | `use<Entity>Query` | read only | — |
| **Mutate** | `use<Entity><Slice>Mutate` | write only | read the cache to build payloads; hold write-coordination (debounce) state |
| **View-model** | `use<Workflow>` (`use<Entity>Editor`, `use<Page>`) | composes query + mutate hooks into a render shape | confirm dialogs, navigation, route arguments, local UI state |

Examples: `useDeckQuery`; `useDeckMutate` / `useDeckImageMutate` / `useDeckSettingsMutate`; `useDeckEditor`. Sits inside the layering of [file-structure.md](file-structure.md) and pairs with [rtk-query-cache.md](rtk-query-cache.md). The `useSlide` cluster is not yet split into this taxonomy — see [deck-editor/hooks-cleanup.md](../../features/deck-editor/hooks-cleanup.md); new hooks must conform.

## Query hooks

- **One per aggregate root.** `useDeckQuery(deckId)` returns `{ deck, isLoading, error }` and nothing else.
- **Sole caller of the generated read.** A generated `useGet<Entity>Query` is imported in exactly one file — that entity's query hook — so fetching policy has one home.

## Mutate hooks

- **Write-only public surface.** A mutate hook returns *only* write operations, never query data. Anything that needs to *render* a slice reads it from the query hook.
- **Reading the cache to build a command is allowed** — assembling a correct payload often needs current state (`useDeckSettingsMutate.commit` deep-merges onto the cached sub-object). CQRS segregates the public surface, not the implementation.
- **Write-coordination state lives here** — debounce timers and the `commit` / `schedule*` / `flush` / `cancel` surface (see [frontend-rules.md](../frontend-rules.md) rule 13).
- **No UI concerns.** Confirm dialogs, navigation, toasts, and route params belong in the view-model hook.

Cache behaviour (optimistic patch + response reconcile) and param typing are governed by [rtk-query-cache.md](rtk-query-cache.md), not restated here.

## View-model hooks

- Compose the query and mutate hooks for one screen and add the UI-layer concerns the data hooks refuse: `useConfirm` dialogs, `useNavigate`, toasts, local presentation state.
- Read **route params only here** and pass them *into* data hooks as arguments, per [component-design.md](component-design.md) — data hooks never reach into the router.
- Imported only by its own view.

## Two carve-outs (neither is a CQRS hook)

- **Shared interaction-state hook** — owns round-local or gesture-local state shared by several *sibling* components, touching no server state and no cache. Named `use<Noun>`, lives beside its consumers, and is deliberately multi-consumer (unlike a view-model hook). Any server write it triggers is a pass-through to a connection object the caller supplies. Live examples: `useCappedSelection` and `useBoardPlacement`, both in `features/liveSession/components/SessionBoard/content/`.
- **Hook-composition helper** — extracted to be composed by sibling *hooks* and never imported by a view. It takes the surface it works on as a parameter rather than mounting its own, so the composing hook keeps the single instance every write funnels through. Example: `useItemBankEditor` (`features/deck/hooks/`).
