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

### 5. `ImageRole` type exported from the wrong hook

`ImageRole` is now defined independently in both `useDeck.ts` and `useSlide.ts`
(`"cover" | "background"`). It should be moved to a shared types file so both
hooks import it from one place rather than duplicating the definition.

### 6. `UseDeckSettingsResult` interface not exported

`useDeckSettings.ts` never exports `UseDeckSettingsResult`. Only `SettingsPatch` (an
internal implementation detail) is exported. Every other hook exports its `Use*Result`
type. Either export `UseDeckSettingsResult` or stop exporting `SettingsPatch`.

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

### 1. `useGetDeckQuery` subscribed independently in three hooks

`useDeck`, `useDeckImage`, and `useDeckSettings` each call
`useGetDeckQuery({ id: deckId })`. RTK Query dedupes the network request, but three
separate subscriptions are mounted per `deckId`. Acknowledged as safe; no consolidation
point exists. Consider whether any of these hooks should be composed (e.g.
`useDeckImage` taking the deck as a prop rather than fetching it).

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

### 5. `useDeck` conflates data and confirm-dialog concerns

`useDeck` exposes both `remove` (raw mutation promise) and `openDeleteDeckModal`
(confirm dialog + delete), embedding `useConfirm` dialog logic inside a data hook.
The dialog concern should live in the component or a UI-layer hook, not in the data
layer.

---

## Leftover / Debt

- `useSlide.ts:162` — `console.log("Payload", payload)` debug line. Remove.
- `ImageSlotContext.tsx:13-31` — unresolved planning comment block ("concerns:",
  "consider…"). Resolve or delete.
- `useDeck.ts:67-69` — `handleAddToCollection` is a stub (`console.log` only) on an
  otherwise complete hook. Implement or remove.
- `useCreateDeck.ts:44` — unresolved `// TODO` comment.
- `ImageSlot.types.ts` — `slotButtons[5]` (`"right-centered"`) has identical
  `placement` coordinates to `slotButtons[1]` (`"right-half"`). Likely a copy-paste
  error; verify the intended grid coords.
