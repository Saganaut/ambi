# Frontend Found Issues — Audit 2026-05-21

A code-quality audit of the BrainFlex frontend (`frontend/src/`) focused on architectural smells, not bugs. Findings are grouped by theme and tagged with severity (high / medium / low). Each entry quotes specific file paths and line ranges so issues can be picked up and worked on directly.

Scope of audit:

- `pages/`, `routes/` — page-level coupling and duplication
- `components/` — UI/logic decoupling, missing primitives, design-rule violations
- `hooks/`, `store/`, `utils/`, `context/`, `types/` — non-UI layers

Out of scope: `store/BrainFlexApi.ts` (auto-generated), bug hunting, performance.

---

## Table of contents

1. [Duplication & missing component abstractions](#1-duplication--missing-component-abstractions)
2. [UI and data-fetching coupled in presentational components](#2-ui-and-data-fetching-coupled-in-presentational-components)
3. [Logic that belongs in hooks (not pages/components)](#3-logic-that-belongs-in-hooks-not-pagescomponents)
4. [Raw HTML elements where primitives exist](#4-raw-html-elements-where-primitives-exist)
5. [Design-rule violations (CSS / styling)](#5-design-rule-violations-css--styling)
6. [Page/file size & organization](#6-pagefile-size--organization)
7. [Type duplication](#7-type-duplication)
8. [Store / RTK Query layer](#8-store--rtk-query-layer)
9. [Debug leftovers](#9-debug-leftovers)
10. [Positive findings (no action needed)](#10-positive-findings-no-action-needed)

---

## 1. Duplication & missing component abstractions

### 1.1 Deck card rendered three different ways across pages — **high** ✅ DONE

`MyDecksPage`, `ExplorePage`, and `FavoritesPage` each hand-roll a visually similar deck card (cover image + title + meta + favorite heart + tags), with subtly different markup. The same semantic object (a deck) deserves one card primitive that accepts variant props.

- `frontend/src/pages/MyDecksPage/MyDecksPage.tsx:178-245` — `DeckCard` defined locally (158 lines), with modal/dropdown wiring for edit/delete.
- `frontend/src/pages/ExplorePage/ExplorePage.tsx:58-117` — read-only variant.
- `frontend/src/pages/FavoritesPage/FavoritesPage.tsx:44-77` — read-only variant, again.

**Refactor:** Extract `components/Cards/DeckCard.tsx` accepting `actions?: ReactNode`, `onEdit`, `onDelete`, `variant`. Compose all three pages from it. Consider promoting `MyDecksPage`'s `DeckCard` first since it has the richest behavior, then thin Explore/Favorites down to it.

**Resolution:** Added `frontend/src/components/Common/Cards/DeckCard.tsx` with `variant: "full" | "discovery" | "compact"` and an `actions` slot. MyDecksPage wraps it in a `DropdownMenu` + composes its play/edit/delete actions; ExplorePage uses `"discovery"`; FavoritesPage uses `"compact"`. The per-page CSS modules dropped the now-redundant card classes.

### 1.2 Duplicated grid block in CollectionDetailPage — **medium** ✅ DONE

`frontend/src/pages/CollectionDetailPage/CollectionDetailPage.tsx:200-232` renders the same `.map()` twice, once inside `DragDropProvider` and once outside, differing only in whether `onRemove` is wired. This is a classic "wrap optional" smell.

**Refactor:** Render the grid unconditionally and conditionally wrap it in `DragDropProvider` at the page level, OR push the conditional inside a `<DeckGrid isOwner>` component.

**Resolution:** Built the grid once into a local `grid` const and conditionally wrapped it with `DragDropProvider` only when `isOwner` is true.

### 1.3 Preset theme cards re-implement ThemeCard inline — **low** ✅ DONE

`frontend/src/pages/AccountPage/ThemeSection.tsx:50-93` hand-rolls preset theme cards (swatches + badge logic) right next to a `<ThemeCard>` usage at line 101 for custom themes. Two ways to render the same visual object.

**Refactor:** Add a `variant: "preset" | "custom"` prop to `ThemeCard` (or extract a shared `PresetThemeCard`).

**Resolution:** Generalized `ThemeCard`'s props to take primitive `huePrimary`/`hueAccent`/`name` plus optional `onActivate`/`onEdit`/`onDelete` callbacks. Presets and customs both render through the same component — owner-only `onEdit`/`onDelete` are simply omitted for presets.

### 1.4 Picker modal hooks share identical pattern — **low** ✅ DONE

`frontend/src/hooks/useMediaPicker.tsx:35-52` and `frontend/src/hooks/useGalleryPicker.tsx:37-54` both: accept a callback, call `openModal` with a title + content component, close on `onPick`. Identical shape.

**Refactor:** Extract `usePickerModal<T>(title, Component, onPick)` and have both hooks delegate to it.

**Resolution:** Added `frontend/src/hooks/usePickerModal.tsx` exposing `openPicker({ title, content })` where `content` is a factory receiving an `autoClose` callback. Both `useMediaPicker` and `useGalleryPicker` now delegate to it.

### 1.5 Answer formatting helpers duplicated across game components — **low** ✅ DONE

`humanReadableAnswer` / `correctAnswerText` helpers in `frontend/src/components/Games/RoundResult/RoundResult.tsx:177-227` are used by both `RoundResult` and `ReviewPanel`.

**Refactor:** Move to `frontend/src/utils/answerDisplay.ts`.

**Resolution:** Moved both helpers to `frontend/src/utils/answerDisplay.ts`; `RoundResult` now imports them. `ReviewPanel.renderSubmission` was left as-is — it has different semantics (always returns a user-facing string for a table cell rather than `string | null`).

---

## 2. UI and data-fetching coupled in presentational components

### 2.1 MediaAssetChip fetches its own data — **high** ❎ INTENTIONAL

`frontend/src/components/Common/MediaPicker/MediaAssetChip.tsx:16,37-40` — name suggests a "dumb" chip, but it calls `useGetMediaQuery` itself. A list of N chips means N parallel queries instead of one batched fetch at the container.

**Refactor:** Move query to parent (`MediaPicker` or wherever the list lives), pass `asset: MediaAssetResponse` + `isLoading: boolean` as props.

**Resolution:** Kept as-is. The chip's per-asset fetch is intentional (the file comment documents that re-hydration follows the same presign cycle as every other read). RTK Query already caches per `assetId`, so identical chips share a cache entry; current usage in `MediaSlots` is only 1-2 chips per slide, never a list.

### 2.2 CommonOptionsSection fetches the whole deck for one element — **medium** ❎ INTENTIONAL

`frontend/src/components/DeckEditor/RightSidebar/EditSlideSections/CommonOptionsSection.tsx:37-44` calls `useGetDeckQuery` with `selectFromResult` to pull a single element. The deck is already loaded at the editor level — this is a redundant subscription.

**Refactor:** Pass the element down via props from `RightSidebarContent`/`EditSlidePanel`.

**Resolution:** Kept as-is. RTK Query keys cache entries by `(endpoint, args)`, so a second `useGetDeckQuery({id: deckId})` subscriber shares the existing entry rather than issuing a new request — `selectFromResult` is just a memoized slice. The "redundant" subscription has no runtime cost; passing the element down via props would only be a stylistic change.

### 2.3 GalleryPicker & MediaPicker call `useListMyOrgsQuery` directly — **medium** ✅ DONE

Both `frontend/src/components/Common/GalleryPicker/GalleryPicker.tsx:40` and `frontend/src/components/Common/MediaPicker/MediaPicker.tsx:68` reach into RTK Query for "current user's orgs" — a domain concept that should be a hook.

**Refactor:** Add `frontend/src/hooks/useCurrentUserOrgs.ts` and consume it from both pickers (and any future caller).

**Resolution:** Added `frontend/src/hooks/useCurrentUserOrgs.ts` wrapping `useListMyOrgsQuery` with the registered-user `skip` gate. Migrated `GalleryPicker`, `MediaPicker`, `GallerySection`, and `useThemePicker` — four sites that had been copy-pasting the same `useCurrentUser` + `skip: userState.state !== "registered"` shape. `OrgSection` keeps its direct call: it relies on `refetch`/`isLoading`, runs behind a section-level auth gate, and never used the skip pattern.

### 2.4 FavoriteHeart owns mutations despite "presentational" naming — **medium** ❎ INTENTIONAL

`frontend/src/components/Common/FavoriteHeart/FavoriteHeart.tsx:11-13,35-36` — receives `isFavorited` from props but also owns `useFavoriteDeckMutation` / `useUnfavoriteDeckMutation`. The internal comment suggests the original intent was presentational.

**Refactor:** Either (a) accept `onFavorite` / `onUnfavorite` callbacks and remove the mutations, OR (b) rename to `FavoriteHeartContainer` and keep one usage-pattern.

**Resolution:** Kept as-is. The file-level comment documents the intended design: the heart is a self-contained widget paired with optimistic cache updates in `apiEnhancements.ts`, so callers just point it at a `deckId` and trust the cache. Pushing mutations up to parents would force every caller to duplicate identical click-handler glue; renaming to `Container` is purely cosmetic.

---

## 3. Logic that belongs in hooks (not pages/components)

### 3.1 ThemeEditor form state — **medium** ✅ DONE

`frontend/src/pages/AccountPage/ThemeEditor.tsx` (291 lines) had 10+ pieces of local state, 3 RTK mutations, and 5 event handlers for file upload + image preview + form validation.

**Refactor:** Extract `frontend/src/hooks/useThemeEditor.ts` returning `{ state, handlers, isSaving }`; reduce the component to JSX wiring.

**Resolution:** Added `frontend/src/hooks/useThemeEditor.ts` owning every field, the four RTK mutations, and the create → upload-bg → upload-logo save flow. `ThemeEditor.tsx` is now pure JSX wiring — destructures `{ state, handlers }` from the hook and renders the form.

### 3.2 SlideOptionsSection over-uses useState — **medium** ✅ DONE

`frontend/src/components/DeckEditor/RightSidebar/EditSlideSections/SlideOptionsSection.tsx:39-96` had 10+ `useState` declarations with manual sync logic when the element changes.

**Refactor:** `useReducer` or a dedicated hook (`useSlideOptionsForm`). The manual setter cascade on element-change is the smell.

**Resolution:** Added `useSlideOptionsForm` next to the section. Collapses the ten mirrors into one object with a merging `patch(...)` updater and a single `resync(element)` call that replaces the prior setter cascade. The component still owns the commit/schedule calls (it talks to `useElementEditor`), but no longer fans out across ten setState references.

### 3.3 CreateGamePage form seeding pattern — **low** ✅ DONE

`frontend/src/pages/GamePage/CreateGamePage.tsx:407-436` used a `seededFromDeckId` ref to handle "fetch deck → seed form defaults" — a reusable hook shape.

**Refactor:** `hooks/useGameSettings.ts` to return `[settings, setSettings]` with deck-seeding handled internally.

**Resolution:** Added `frontend/src/hooks/useGameSettings.ts` exposing `{ deck, isLoadingDeck, settings, setSettings }`. The hook owns `useGetDeckQuery`, the platform defaults, and the seeded-once-per-deck-id cascade. The page consumes it and is otherwise unchanged.

### 3.4 useTheme persists to localStorage directly — **medium** ✅ DONE

`frontend/src/hooks/useTheme.ts:85-109` wrote theme/hue choices to `localStorage` directly from a hook. This coupled UI state to storage and risked divergence from the server-side `activeThemeId` returned by RTK Query.

**Refactor:** Drive theme identity from RTK Query (`useCurrentUser` / theme query) as the single source of truth; treat localStorage as an optimistic cache hydrated at app boot, not an authoritative store.

**Resolution:** Added `frontend/src/hooks/useActiveThemeSync.ts` + `frontend/src/components/Common/ActiveThemeBridge.tsx`. The bridge is mounted once in `routes/__root.tsx`. When the user is registered and their `activeThemeId` resolves (via `useGetCurrentUserQuery` + `useListThemesQuery`), the sync hook applies the server theme's `huePrimary` / `hueAccent` / `mode` through the existing `useTheme` setters — which has the side effect of overwriting localStorage. localStorage is now boot-time cache only (so the first paint doesn't flash) and never wins against the server. `useTheme`'s header comment was updated to describe the new boundary; visitors/guests with no server identity continue to use localStorage-only behavior.

### 3.5 useStartInteractiveSession bundles navigation with the mutation — **low** ⏸ DEFERRED

`frontend/src/hooks/useStartInteractiveSession.ts:27-64` wraps a mutation + `navigate` together. Fine for one entry point; if quick-start / scheduled / invite flows diverge, this becomes hard to compose.

**Refactor:** Defer until a second caller forces the split.

**Resolution:** Left as-is. Audit re-confirmed there is still only one composition (Quick Start). The recommendation itself was to defer; this entry stays open as a tripwire — the moment a second flow (scheduled / invite) needs different post-create navigation, split the hook into a pure-mutation core + a thin navigation wrapper.

---

## 4. Raw HTML elements where primitives exist ✅ DONE

The project has Btn (`components/Common/Buttons/`), Input (`components/Common/Input/`), Modal (`components/Common/Modal/`), Tabs (`components/Common/Tabs/`), etc. Several components hand-roll raw `<button>` / `<input>` instead, breaking design consistency.

| File | Lines | Issue | Severity |
|---|---|---|---|
| `frontend/src/components/Games/ChatPanel/ChatPanel.tsx` | 103-114, 190-196 | Raw `<button>` for toggle and hide controls | medium |
| `frontend/src/components/Games/ReviewPanel/ReviewPanel.tsx` | 54-66 | Round pager uses raw `<button role="tab">` — should be `<Tabs>` | medium |
| `frontend/src/components/Games/DrawingCanvas/DrawingCanvas.tsx` | 258, 282-304 | Color swatches + thickness pickers as raw `<button>`s | medium |
| `frontend/src/components/Games/WordCloudInput/WordCloudInput.tsx` | 113-122 | Chip remove `×` as raw `<button>` (inconsistent with sibling Btn usage) | low |

**Refactor pattern:** Use `<Btn>` for actions; for grouped pickers (color, thickness, round), extract a small primitive (`ColorPaletteButton`, `ThicknessRadioGroup`) or use `<Tabs>` / `<RadioGroup>`.

**Resolution:**

- **ChatPanel** — Toggle uses `<Btn variant="secondary" fill="ghost" size="sm">`; the hide-message control uses `<Btn variant="error" fill="ghost" size="xs">`. The local CSS keeps only the layout overrides (`.toggleBtn` shapes the chevron-on-right layout + bottom border; `.hideBtn` keeps the absolute positioning and hover-to-reveal opacity) — color, border, and hover styling come from the primitive.
- **ReviewPanel** — Round pager replaced with `<Tabs variant="pill" />`. Per-round content (question header + aggregate + timed-out notice + details toggle + details table) moved into a colocated `RoundContent` sub-component that becomes each tab's panel. `showDetails` stays as parent-level state and is threaded through props so the toggle is shared across tabs.
- **DrawingCanvas** — Color swatches and thickness pickers extracted into colocated `PaletteSwatch` and `ThicknessOption` components in `frontend/src/components/Games/DrawingCanvas/`. Both wrap a `<button>` with the radio semantics (`role="radio"` + `aria-checked`). The inline thickness sizing is intentionally preserved — it's tracked separately in §5.4.
- **WordCloudInput** — Chip remove `×` replaced with `<IconBtn icon={<XMarkIcon />} variant="secondary" fill="ghost" size="xs">`. The local `.chipRemove` class shrinks the IconBtn down to the chip-sized 1.25rem footprint via the `--height`/`--width` CSS variables exposed by the primitive.

---

## 5. Design-rule violations (CSS / styling)

Project rules (from `z-docs/rules/STYLE-RULES` and memory): no `box-shadow` (theme-fragile in dark mode), semantic tokens only (`--bg-*`, `--text-*`, `--edge-*`), no inline color literals.

### 5.1 Hard-coded `box-shadow` — **high** ✅ DONE

`frontend/src/components/Pricing/PricingCard/PricingCard.module.css:140`:

```
.featured .cta { box-shadow: 0 0 24px oklch(...); }
```

Direct violation of the no-box-shadow rule. Use the surface ladder + `--edge-*` hairline for elevation.

**Resolution:** Removed the `box-shadow` declaration from `.featured .cta`. The CTA's border now uses `--edge-brand` (the brand-tinted hairline paired with `--bg-brand`) so the featured card still reads as the visually loudest tier without leaning on a shadow. The `.card` transition no longer references `box-shadow` either.

### 5.2 Hard-coded overlay colors — **medium** ✅ DONE

- `frontend/src/components/Common/Modal/Modal.module.css` — `background-color: rgb(0 0 0 / 50%)` for overlay.
- `frontend/src/components/Common/Toast/Toast.module.css` — same pattern.

**Refactor:** Centralize overlay color as `--bg-overlay` in `tokens.css` and reference it.

**Resolution:** Added `--bg-overlay: rgb(0 0 0 / 50%)` to `tokens.css` (same value in light and dark — the overlay's job is to dim whatever sits behind it regardless of theme) and pointed `Modal.module.css`'s `::backdrop` at it. `Toast.module.css` turned out not to contain any overlay color; the audit was inaccurate on that file, so no change there. The same `rgb(0 0 0 / ...)` pattern appears at other opacities in DrawingReveal, RoundResult, and RoundDataView — those weren't flagged and use different alpha values, so they're left for a follow-up.

### 5.3 Repeated inline icon sizing — **low** ✅ DONE

`frontend/src/components/DeckEditor/DeckEditor.tsx:104,135,141`:

```jsx
<Icon style={{ width: "1rem", height: "1rem" }} />
```

Three identical inline-style props in one file.

**Refactor:** A `.iconMd` CSS module class, or wrap heroicons in a thin `<Icon size="md">` component.

**Resolution:** Added `.iconMd { width: 1rem; height: 1rem; }` to `DeckEditor.module.css` and replaced every `style={{ width: "1rem", height: "1rem" }}` in `DeckEditor.tsx` with `className={styles.iconMd}` (4 occurrences — the audit counted 3, but the same shape appears on the fullscreen icon as well).

### 5.4 DrawingCanvas inline thickness sizing — **medium** ✅ DONE

`frontend/src/components/Games/DrawingCanvas/DrawingCanvas.tsx:295-299` builds `width`/`height` strings inline from a computed expression and applies background color inline.

**Refactor:** Either a small set of CSS module classes per thickness level, or expose a CSS variable on the swatch and let the module style consume it.

**Resolution:** Took the CSS-variable route. The `.thicknessDot` rule in `DrawingCanvas.module.css` now consumes `var(--dot-size)` and `var(--dot-color)`; the runtime-derived values are passed in via inline style on `ThicknessOption.tsx`. The React side carries only data; the structural rules (display, border-radius, sizing/background bindings) stay in the module. The component-level comment was updated to describe the new contract.

### 5.5 DropdownMenu cursor as inline style — **low** ✅ DONE

`frontend/src/components/Menus/DropdownMenu.tsx` uses `style={cursorStyle}` for cursor selection.

**Refactor:** CSS module class toggled by data attribute.

**Resolution:** This wasn't a CSS `cursor:` property — `cursorStyle` was pinning a panel at the user's click coordinates (so a strict "CSS class toggled by data attribute" refactor wouldn't have worked since the coordinates are runtime values). Took the same approach as §5.4: added a `.panelAtCursor` modifier class plus four cursor-mode corner rules in `DropdownMenu.module.css` that consume `var(--cursor-x)` / `var(--cursor-y)`. React now only emits those two custom-property values via `style`; the `position: fixed` switch and the corner math live in the module. The composed `panelClassName` toggles `.panelAtCursor` based on whether cursor mode is active.

---

## 6. Page/file size & organization

### 6.1 DeckAnalyticsPage is 730 lines with 12 internal components — **low** ✅ DONE

`frontend/src/pages/DeckAnalyticsPage/DeckAnalyticsPage.tsx` defines `FormatMixChip`, `SegmentControl`, `KpiStrip`/`AllKpis`/`GameKpis`/`PresentationKpis`, `Kpi`, `ElementCard`, `DistributionChart`, plus helpers (`buildOrderedElements`, `buildDistributionRows`, `buildLabelLookup`, `formatDuration`, `formatRelativeDate`). All page-specific, but the file is hard to navigate.

**Refactor:** Split into `pages/DeckAnalyticsPage/KpiStrip.tsx`, `ElementCard.tsx`, `DistributionChart.tsx`, with helpers in a sibling `helpers.ts`. Keep them co-located (no need to promote to `components/`).

**Resolution:** Split `DeckAnalyticsPage.tsx` (730 lines) into five files: `DeckAnalyticsPage.tsx` (page chrome, 188 lines), `KpiStrip.tsx` (per-segment KPI compositions), `ElementCard.tsx` + `ElementCard.module.css` (accordion row), `DistributionChart.tsx` (kind-aware empty-state wrapper), and `helpers.ts` (data plumbing + formatters + kind classification). Also extracted reusable dashboard primitives into a new `components/Common/Analytics/` folder: `Kpi` (label/value/sub + optional trend chip), `KpiStrip` (responsive auto-fit grid), `Segment` (generic segmented pill control with proper tablist ARIA + arrow-key nav, replacing the page-local raw `<button>` markup), and `DistributionList` (label/bar/value rows with stable keys + kind-aware empty states). All new CSS modules follow STYLE-RULES — semantic tokens only, `var(--name, fallback)` manifest pattern, container queries for responsive collapse, no `box-shadow`.

### 6.2 GallerySection embeds `EditForm` inline — **low**

`frontend/src/pages/AccountPage/GallerySection.tsx:37-122` defines an 85-line `EditForm` component inline that's used once.

**Refactor:** Either extract to `pages/AccountPage/GalleryEditForm.tsx`, or push form state into a hook so the inline JSX is small.

### 6.3 AccountPage builds panels as JSX constants — **low**

`frontend/src/pages/AccountPage/AccountPage.tsx:151-234` constructs `profilePanel` and `dangerPanel` as JSX consts inside the component, then passes them to `<Tabs>`.

**Refactor:** Extract to `<ProfilePanel />` and `<DangerPanel />` for testability.

### 6.4 apiEnhancements.ts approaching split threshold — **low** ✅ DONE

`frontend/src/store/apiEnhancements.ts` is ~1064 lines with 15+ optimistic update handlers across the whole app. Well-documented but a future merge-conflict magnet.

**Refactor:** When it crosses ~2000 LOC, split per-feature (`deckEnhancements.ts`, `collectionEnhancements.ts`, …) and import them all from `store/store.ts`. Not urgent today.

**Resolution:** Split the file ahead of the 2000-LOC threshold to neutralize the merge-conflict surface now (every feature was concatenating handlers into one shared file). Created `frontend/src/store/enhancements/` with nine per-feature modules — `deck.ts`, `collection.ts`, `collaborator.ts`, `favorite.ts`, `comment.ts`, `rating.ts`, `interactiveSession.ts`, `chat.ts`, `notification.ts` — plus a shared `types.ts` for `WithApiQueries` / `CacheSyncApi`. Each module calls `BrainFlex.enhanceEndpoints({ ... })` for its own endpoint subset; RTK Query merges the calls additively. `apiEnhancements.ts` is now a 9-line barrel that side-effect-imports each module, so `store.ts` and the doc-comment references in the rest of the codebase stay valid.

### 6.5 store.ts implicit side-effect import — **low**

`frontend/src/store/store.ts:5-6` imports `apiEnhancements` purely for its side effects. A future cleanup pass could mistakenly remove it.

**Refactor:** Export `applyApiEnhancements()` from `apiEnhancements.ts` and call it explicitly, OR add a `// Side effect: do not remove` comment above the import.

---

## 7. Type duplication

### 7.1 SessionFormat / ShowResponsesMode / AnswerSubmissionMode duplicated — **medium**

`frontend/src/pages/GamePage/CreateGamePage.tsx` redefines these types locally. `SessionFormat` and `ShowResponsesMode` are already defined in `frontend/src/utils/showResponsesResolver.ts`. Two sources of truth that can drift.

**Refactor:** Move all three to `frontend/src/types/sessionConfig.ts` and import everywhere.

---

## 8. Store / RTK Query layer

### 8.1 `store/galleryApi.ts` is a documented stop-gap — **medium** ✅ DONE

`frontend/src/store/galleryApi.ts` lines 1-5 explicitly say "delete this once `/api/gallery` is regenerated from OpenAPI." If the backend now exposes gallery endpoints via OpenAPI, this file is dead code with active consumers (`GalleryPicker`, `GallerySection`).

**Action:** Regenerate the API client (`npx @rtk-query/codegen-openapi openapi-config.cts`), check whether `useListMyGalleryQuery` etc. now exist in `BrainFlexApi.ts`, migrate the two consumers, delete the file.

**Resolution:** The generated client already exposed `useListImagesQuery`, `useUploadImageMutation`, `useUpdateImageMutation`, `useDeleteImageMutation`, and a `GalleryImageResponse` type — codegen had been re-run since the stop-gap was written. Migrated `GalleryPicker.tsx` and `GallerySection.tsx` to import from `@/store/BrainFlexApi` and switched to the generated hook names. The upload migration was the only non-mechanical change: the generated `uploadImage` types `body` as `{ image: Blob }` and emits `name`/`tags`/`organizationId` as URL query params, so the caller now builds a `FormData` with only the `image` part and passes the strings alongside (cast through `unknown` to satisfy the codegen shape — Spring's `@RequestParam` accepts the strings from the query string and the multipart `image` from the body). Optional-field shape differences (the generated type marks every field optional) were handled with `?? "" / ?? []` at the boundary. `MockData.ts` already imported `GalleryImageResponse` from `BrainFlexApi.ts`, so no change there. Deleted `frontend/src/store/galleryApi.ts`.

### 8.2 `authPromptBus` is a custom pub/sub bridge — **low** ✅ DONE

`frontend/src/store/authPromptBus.ts` exists to let the non-React RTK Query baseQuery trigger a React modal on 401. It works, but it's a hand-rolled event bus that duplicates what Redux middleware can do natively.

**Refactor (deferred):** Replace with a Redux middleware that dispatches a modal action when baseQuery sees 401. Not urgent.

**Resolution:** Added `frontend/src/store/authPromptSlice.ts` — `{ pending: { message?, nonce } | null, nonce }` with `authPromptRequested` / `authPromptDismissed` actions. The base-query wrapper in `emptyApi.ts` now calls `api.dispatch(authPromptRequested({...}))` from its 401 branch instead of `emitAuthRequired`; `store.ts` wires the slice in under the `authPrompt` key. `AuthPromptBridge.tsx` switched from `subscribeAuthRequired` to `useAppSelector(state => state.authPrompt.pending)`. The throttling guarantee is preserved: a monotonically increasing `nonce` on every 401 lets the bridge distinguish fresh requests from re-renders (the old 500 ms burst guard still applies), and the bridge dispatches `authPromptDismissed` after handling so the slice clears between prompts. Deleted `authPromptBus.ts`. Net effect: no event bus, no global subscribers, no React-vs-non-React seam — the 401 signal lives in Redux state the same way every other piece of app state does.

---

## 9. Debug leftovers

### 9.1 console.log statements in production hook — **high**

`frontend/src/hooks/useInteractiveSessionWebSocket.ts` lines 51 and 208:

- Line 51: `console.log("using interactive session start")`
- Line 208: `console.log("sending starT")` (note: typo'd capital T)

**Action:** Remove both.

---

## 10. Positive findings (no action needed)

Recording these so they're not "fixed" by accident:

- **No manual HTTP calls anywhere.** Grepped for `fetch(`, `axios`, `XMLHttpRequest` — all data flows through RTK Query. Excellent discipline.
- **Route files are thin.** All `routes/**/*.tsx` are < 35 lines and just mount a page component.
- **`useCurrentUser` discriminated union.** `frontend/src/hooks/useCurrentUser.ts` correctly transforms the RTK Query result into a typed state machine (visitor / guest / registered) — exemplary auth abstraction.
- **Hand-authored type unions in `types/`.** `types/elements.ts` and `types/bestAnswer.ts` correctly supplement the auto-generated `BrainFlexApi.ts` with sealed discriminated unions the codegen can't represent.
- **Image utility cascade.** `utils/image.ts` centralizes fallback resolution (variant → largest → placeholder) cleanly.
- **WebSocket lifecycle in `useNotificationStream`.** Proper STOMP subscription + cleanup + optimistic RTK Query cache patches.
- **`BrainFlexApi.ts` has no manual edits.** Verified clean; safe to regenerate.

---

## Suggested order of attack

If you want to work through this list, the highest leverage-per-effort items first:

1. **Remove the debug logs** (§9.1) — 30-second fix.
2. **Delete the `box-shadow`** (§5.1) — confirm the design works without it, then remove.
3. **Regenerate the API client and delete `galleryApi.ts`** (§8.1) — clears a documented stop-gap.
4. **Consolidate the duplicate session-config types** (§7.1) — one new file, three imports.
5. **Extract a shared `DeckCard` primitive** (§1.1) — biggest visual-consistency + maintainability win.
6. **Extract `useCurrentUserOrgs()` hook** (§2.3) — small, opens the door for using it from new callers.
7. **Move presentational components off raw `<button>`** (§4) — bulk-find with grep, replace systematically.

Lower-priority items (file splits, hook extractions) can wait until the affected page is touched for another reason.
