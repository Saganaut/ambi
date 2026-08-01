# Deck Hooks — Cleanup Backlog

Review of `frontend/src/features/deck/hooks/` and `contexts/` for overlap and naming
inconsistencies. Items are roughly prioritised: **Naming** issues are cheap to fix and
pay forward; **Overlap** issues are architectural and need more thought.

---

## Naming Issues

### 1. Inconsistent debounced-write vocabulary *(FIXED — see below)*

Three hooks used different terms for the same two primitives:

| Hook | "write now" | "write debounced" | discard |
|---|---|---|---|
| `useDeckSettings` | `commit` | `schedule` | — |
| `useSlideSettings` | — | `update*` | `cancelPendingWrites` |
| `useMcqEditor` | `commitOption` | `schedulePrompt` / `scheduleOption` | — |

**Resolution:** adopted `commit` = write now, `schedule*` = write debounced,
`flush` = fire pending, `cancel` = discard pending as the canonical vocabulary.
`useSlideSettings` was updated: `updatePointSettings` → `schedulePointSettings`,
`updateAnswerSettings` → `scheduleAnswerSettings`, `cancelPendingWrites` → `cancel`.

### 2. `handlePresent` renamed to `quickStart` one layer up *(FIXED)*

`useDeck.ts` exposed `handlePresent`. `useDeckEditor.ts` wrapped it as
`quickStart = () => handlePresent()` for no apparent reason. Meanwhile the same
return object had `handleShareClick`, `handleScheduleClick`, `handlePreview` — all
`handle*` prefixed — so `quickStart` was an unexplained outlier.

**Resolution:** adopted plain verbs for all hook-returned actions; `handle*` reserved
only for genuine event callbacks that take an event object (`handleDragEnd`).
`useDeck`: `handlePresent` → `present`, `handleAddToCollection` → `addToCollection`.
`useDeckEditor`: `quickStart` → `present`, `handleShareClick` → `share`,
`handleScheduleClick` → `schedule`, `handlePreview` → `preview`.
The wrapper `quickStart = () => handlePresent()` was removed; `present` is passed
through from `useDeck` directly.

### 3. Mixed `handle*` / plain-verb / `open*` surface in `useDeck` *(FIXED — see #2)*

The same return object mixed three naming styles. Resolved alongside #2: all methods
now use plain verbs. The `open*` prefix (`openDeckInEditor`, `openDeleteDeckModal`)
is treated as part of the plain-verb convention — "open" is an action verb, not a
naming-style category.

### 4. Asymmetric deck / slide image API *(FIXED)*

`useDeckImage` was a dedicated hook with explicit named methods
(`setCoverImage`, `clearCoverImage`, `setBackgroundImage`, `clearBackgroundImage`).
For slides there is no `useSlideImage` — image ops are inlined into `useSlide` itself
via a discriminated `ImageRole` type (`"cover" | "background"`).

**Resolution:** folded `useDeckImage` into `useDeck` using the same `ImageRole`
pattern as `useSlide`. `useDeck` now exposes `setDeckImage(slot, image)` and
`clearDeckImage(slot)` alongside `coverImage` / `backgroundImage` read fields.
`useDeckImage.ts` is deleted; `DeckPanel` updated to use `useDeck` directly.

### 5. `ImageRole` type exported from the wrong hook *(FIXED)*

`ImageRole` was defined independently in both `useDeck.ts` and `useSlide.ts`.

**Resolution:** moved to `deck.types.ts` (the feature-level shared types file).
Both hooks now import it from there; `useSlide` still re-exports it for consumers
that already import it from that path.

### 6. `UseDeckSettingsResult` interface not exported *(RESOLVED — file renamed)*

`useDeckSettings.ts` was renamed to `hooks/useDeckSettingsMutate.ts` as part of
the CQRS split (see Overlap #1). It now exports both `UseDeckSettingsMutateResult`
and `SettingsPatch`, matching every other hook's convention.

### 7. `useImageSlot.tsx` has wrong file extension

`contexts/useImageSlot.tsx` contains no JSX — it is a plain `useContext` call.
Should be `.ts`.

### 8. `CreateDeckResult` exported alongside `UseCreateDeckResult`

`useCreateDeck.ts` exports both `CreateDeckResult` (return type of the inner
`createDeck()` promise) and `UseCreateDeckResult` (return type of the hook).
All other hooks export only the `Use*Result` type. Remove or unexport the
non-hook result type if callers don't need it directly.

---

## Overlap Issues

### 1. `useGetDeckQuery` subscribed independently in three hooks *(RESOLVED — formalized)*

`useDeck`, `useDeckImage`, and `useDeckSettings` each call
`useGetDeckQuery({ id: deckId })`. RTK Query dedupes the network request, but three
separate subscriptions are mounted per `deckId`. This was never a perf problem (the
request is deduped and the store slice shared) — it was a *conceptual ownership* gap:
no single hook owned "the deck read," so each re-opened it.

**Resolution:** the hook layer is split into three kinds along a CQRS seam, formalized
in [hook-roles.md](../../rules/frontend/hook-roles.md):

- `use<Entity>Query` — read only; the **sole** caller of the generated
  `useGet<Entity>Query`.
- `use<Entity><Slice>Mutate` — write only; may read the cache *internally* to build
  command payloads (and hold debounce state) but never returns query data.
- `use<Workflow>` view-model (`useDeckEditor`, `use<Page>`) — composes query + mutate
  hooks and owns UI concerns (confirm dialogs, navigation, route params).

The load-bearing rule that closes this item: **`useGetDeckQuery` is imported in
exactly one file, `useDeckQuery.ts`.** Everything else composes it.

**Step plan:**

1. ✅ **Done.** `useDeckQuery(deckId) → { deck, isLoading, error }` is the only
   `useGetDeckQuery` caller in the feature. (The cross-feature
   `liveSession/useSession.ts` still reaches into the generated query directly — its
   own follow-up.)
2. ✅ **Done.** Image and settings writes extracted as write-only hooks
   `useDeckImageMutate` (role-param `setDeckImage`/`clearDeckImage`) and
   `useDeckSettingsMutate` (`commit`/`schedule`/`flush`, reads cache internally only to
   build complete PUT bodies). Returned slice data dropped from their public surface;
   panels read `deck.settings` / `deck.coverImage` from `useDeckQuery`. (By the time
   this landed, the image ops had already been folded into `useDeck`, so this was an
   *extraction* rather than the rename of a standalone `useDeckImage`.)
3. ✅ **Done (resolves #5).** `useDeck` split into the write-only `useDeckMutate`
   (`rename`/`updateDeck`/`setVisibility`/`share`/`revokeShare`/`remove`) and the
   view-model `useDeckActions` (`openDeckInEditor`/`openDeleteDeckModal`/`present`/
   `addToCollection`), which owns the `useConfirm`/`useNavigate`/`useLiveSession`
   concerns. `useDeck.ts` is deleted.
4. ⬜ **Pending.** Apply the same split to the `useSlide` cluster (resolves #2/#4 —
   `ImageSlotContext` is the slide-side instance of this problem).

### 2. `useSlide` mounted in four separate hooks

`useDeckEditor`, `useSlideEditor`, `useSlideSettings`, and `ImageSlotContext` all call
`useSlide` for the same `deckId`. Again safe via RTK cache, but unacknowledged — a
component using all four mounts four subscriptions. Consider documenting this in
`useSlide.ts` or consolidating at the component level.

### 3. `useDeckEditor` re-exports `removeSlide` and `reorder` unchanged

`useDeckEditor` destructures `removeSlide` and `reorder` from `useSlide` and forwards
them in its return object with no transformation. Consumers could call `useSlide`
directly — and many already do — so this pass-through is redundant and causes a second
subscription for consumers who call both.

### 4. `ImageSlotContext` is a thin adapter with a route dependency

`ImageSlotContext`'s only genuinely local state is `previewPlacement` (hover preview).
All slide data comes from RTK cache via an internal `useSlide` call — the same data
the surrounding `useSlideEditor` / `useSlideSettings` already hold. The context is also
coupled to a specific TanStack Router route via `getRouteApi` (unusual for a context).
Consider extracting `previewPlacement` state into the component that owns the hover
behaviour and removing the context wrapper, or at minimum documenting why a context
is needed here.

### 5. `useDeck` conflates data and confirm-dialog concerns *(RESOLVED)*

`useDeck` exposed both `remove` (raw mutation promise) and `openDeleteDeckModal`
(confirm dialog + delete), embedding `useConfirm` dialog logic inside a data hook.

**Resolution:** resolved by step 3 of #1. The confirm/navigate/live-session concerns
moved to the `useDeckActions` view-model hook; the write boundary `useDeckMutate`
exposes only `remove`. `useDeck` no longer exists.

### 6. Five item-bank hooks carried the same bank engine *(RESOLVED)*

`useAxisEditor`, `useGridEditor`, `useRankingEditor`, `useScalesEditor` and
`usePlaceOnImageEditor` each own a list of identity-bearing rows with the same
mechanics, and each had written them out by hand: a byte-identical
`handleItemDragEnd`, its own `patchItem`/`commitItemPatch` pair, the same
`useItemIdentityBackfill` call, the same `canAdd`/`canRemove` bounds and the
same mint-against-the-freshest-draft `addItem`. Ranking additionally rebuilt
`correctOrder` in four separate places (add, remove, reorder, backfill) — four
chances for its mirror of the item order to drift.

**Resolution:** extracted `hooks/useItemBankEditor.ts`, generic over the bank's
content type. Each kind hook composes it over the **one** `useSlideEditor` the
slide already owns (the bank mounts none itself — a second instance would open a
second draft buffer) and re-exposes the result under its own names, keeping its
public surface unchanged apart from Ranking, whose whole-item
`scheduleItem`/`commitItem` pair collapsed into the bank's
`scheduleItemLabel`. Kind-specific behaviour enters through options, not
branches: `toPatch` lifts a fresh bank into a content patch (Ranking folds its
`correctOrder` rebuild in here, so every structural write keeps the order in
lockstep) and `onRemoveItem` drops whatever the removed row keyed
(`correctPositions`, `correctCells`, `correctValues`). `toPatch` is also the
type seam that keeps the hook free of the `as` cast
[conventions.md](../../rules/frontend/conventions.md) forbids: only the caller,
where the content type is concrete, can produce a patch of it.

Not folded in: `useAllocationEditor` (its collection is `options`, and
`McqOption`'s label field is `text`, not `label`) and `useMatchingEditor` (two
index-paired lists, not one bank). `useItemBankEditor` is composed only by
sibling hooks, never by a component — the shape recorded in
[hook-roles.md](../../rules/frontend/hook-roles.md).

---

## Leftover / Debt

- `ImageSlotContext.tsx:13-31` — unresolved planning comment block ("concerns:",
  "consider…"). Resolve or delete.
- `useDeckActions.ts` — `addToCollection` is a stub (`console.log` only). Implement or
  remove.
- `useCreateDeck.ts:44` — unresolved `// TODO` comment.
