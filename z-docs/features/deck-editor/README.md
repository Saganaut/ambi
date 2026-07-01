# Deck Editor

The authoring dashboard at `/decks/$deckId/view`. Three-column layout: slide rail | active slide | inspector.

> The element/answer data model is being reworked as part of the backend
> rewrite — kind enums, field names, and endpoint shapes below will change. The
> frontend patterns (commit flow, cache sync, fullscreen, rich text) are
> independent of that and still apply.

## Component layout

All under `frontend/src/components/DeckEditor/`:

- `DeckEditor.tsx` — three-column shell + editor navbar with an inline-editable deck title (commits via `updateDeck` on blur/Enter).
- `LeftSidebar.tsx` — the slide rail. Pulls deck elements live via RTK Query, supports drag-to-reorder (optimistic + a `moveElement` mutation). The "New Slide" button opens a modal containing `NewSlideModal`.
- `NewSlideModal.tsx` — modal body listing each element kind via the `SlideTypeGraphics` icons. Click → close modal → add element. Modal uses the shared `useModal` context (`frontend/src/context/useModal.tsx`).
- `SlideThumbnail.tsx` — thumbnail tile with right-click dropdown (delete for now). Carries an HTML `id={elementId}` so the create flow can `getElementById(...).scrollIntoView(...)`; also self-scrolls into view when it becomes the active slide.
- `SlideDisplay.tsx` — dispatches to the correct content editor based on `element.kind`.
- `SlideContentTypes/` — one kind-specific editor per element kind. Shared CSS in `SlideContentTypes.module.css`.

## Editor commit pattern

Field edits in any slide-content editor follow the same path:

1. Local `useState` mirror of the server value. Re-sync only when `element.id` changes (slide switch), using the "set state during render when prev differs" pattern — no `setState`-in-`useEffect`.
2. `useDebouncedCommit(commitFn, 500)` (from `frontend/src/hooks/useDebouncedCommit.ts`) buffers writes. `schedule(patch)` debounces, `flush()` runs immediately (on blur), `cancel()` drops. Unmount auto-flushes so slide-switches don't lose in-flight edits.
3. Structural changes (add/remove option, toggle correct, etc.) `flush()` any pending text edit first, then `commit()` synchronously.
4. The boilerplate is centralised in `SlideContentTypes/useElementEditor.ts`: each editor calls `useElementEditor<KindType>(isKindType)` to get `{ element, schedule, flush, commit, syncedFromId, markSynced }`.

## Mutation → query cache sync

`frontend/src/store/apiEnhancements.ts` is a side-effect-imported file (imported from `store.ts`) that layers `onQueryStarted` handlers onto the auto-generated mutations (`addElement`, `moveElement`, `deleteElement`, `updateElement`, `updateDeck`). Each handler upserts the mutation response into the `getDeck` cache so subscribed components re-render without a manual refetch or tag config. Always go through `enhanceEndpoints` for this — don't edit `AmbiApi.ts`.

## Optimistic deck create

`/my-decks/create` (a TanStack Router file route) mints a UUID, seeds an empty deck into the `getDeck` cache via `Ambi.util.upsertQueryData`, navigates to `/decks/$deckId/view` immediately (replace), and fires `POST /api/decks` with that same `id` in the background. The same pattern applies for new elements: the frontend generates the option/slide/item UUID up front so optimistic UI works. The backend must accept a client-supplied id and treat the create call as idempotent.

## Rich text editing

- The deck/slide authoring UI uses **TipTap** (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm`) for any formatted-text field — slide bodies, question explanations, host notes, etc.
- When a field needs more than a plain string (bold, italic, lists, headings), use the project's `RichTextInput` (`components/Common/Input/RichTextInput.tsx`), which wraps `useEditor` + `<EditorContent>` and the supporting TipTap extensions in a single form-input-shaped component with a focus-triggered floating toolbar.
- Toolbar capabilities today: bold / underline / strike / link (inline URL editor, no `window.prompt`) / 6-swatch color / 4-step font size. Extensions in use: `@tiptap/starter-kit`, `@tiptap/extension-text-style` (TextStyle + Color + FontSize), `@tiptap/extensions` (Placeholder).
- No `window.alert` / `window.prompt` / `window.confirm` anywhere. In-editor sub-controls (links, colors, sizes) use inline popovers under the toolbar — follow that pattern for any future toolbar additions.

## Fullscreen mode

App-level fullscreen state lives in `LayoutProvider` (`frontend/src/context/LayoutProvider.tsx`) and is read via `useFullScreen()` (`frontend/src/context/useFullScreen.tsx`). The hook returns `{ isFullScreen, enterFullScreen, exitFullScreen, toggleFullScreen }`.

- **Triggering**: wire `enterFullScreen` / `toggleFullScreen` to whatever UI you want (button, menu, keybinding). There's no per-page convention — each surface adds its own trigger.
- **Exiting**: handled globally. `LayoutProvider` listens for the ESC key while fullscreen is active and renders a floating `ArrowsPointingInIcon` button fixed top-right (styled in `LayoutProvider.module.css`). Pages don't need to render their own exit control.
- **Styling**: there is **no global CSS hook** (e.g. no `body.fullscreen` selector). Components that need to react to fullscreen — collapse the nav, expand a canvas, hide a sidebar — read `isFullScreen` from the hook and toggle a class on themselves in their own stylesheet. Example: `NavBar.tsx` adds `styles.isCollapsed` when fullscreen, and `NavBar.module.css` defines `.isCollapsed { display: none }`.
- The browser Fullscreen API (`element.requestFullscreen()`) is intentionally **not** used — this is app-level layout only, so ESC behavior, mobile Safari, and gesture-trust caveats don't apply.

## Image placeholders (Lorem Picsum)

Until the media-library picker ships, image fields render a **Lorem Picsum** placeholder seeded on the element/option id (`https://picsum.photos/seed/${id}/...`). Each editor also exposes a raw URL input so authors with a hosted URL can paste it. When the library lands, replace the URL field + `picsum.photos` placeholder with the real picker — search for `TODO: Get more specs` / `placeholderImageUrl` to find every site.

## Settings hierarchy

Slides can override a subset of deck-level defaults. The resolution order is:

1. **Hardcoded defaults** — the values baked into the frontend when no server value exists.
2. **Deck defaults** — `Deck.settings` (`DeckSettings`): `pointSettings`, `answerSettings`, `audienceSettings`, `inviteSettings`.
3. **Per-slide overrides** — `Slide.settings` (`SlideSettings`): `pointSettings` and `answerSettings` only. A null sub-field falls through to the deck default; null `settings` wrapper is equivalent to both sub-fields being null.

`AudienceSettings` and `InviteSettings` are deck-only — slides cannot override them.

Resolution helpers live in `Settings.SlideSettings`:

- `resolvePoints(deckDefaults)` — returns the slide's `pointSettings` if present, else the deck default.
- `resolveAnswerSettings(deckDefaults)` — symmetric; returns the slide's `answerSettings` if present, else the deck default.

### Apply to deck

"Apply to deck" is a one-click action in the inspector that promotes the current slide's value to the deck default and clears every slide's override for that field, so all slides immediately inherit the new default.

**Backend — three endpoints, each a single atomic MongoDB update:**

| Endpoint | Body | Effect |
|---|---|---|
| `PUT /api/decks/{id}/point-settings/promote` | `SetPointSettingsRequest` | Sets `settings.pointSettings` on the deck; unsets `slides.$[].settings.pointSettings` on all slides |
| `PUT /api/decks/{id}/answer-settings/promote` | `SetAnswerSettingsRequest` | Sets `settings.answerSettings` on the deck; unsets `slides.$[].settings.answerSettings` on all slides |
| `PUT /api/decks/{id}/background-image/promote` | `SetImageRequest` | Sets `background_image` on the deck; unsets **both** `slides.$[].background_image` and `slides.$[].hide_background` on all slides |

All return a `DeckResponse` with the updated deck. The frontend must separately invalidate its per-slide cache after calling these endpoints.

The shared persistence logic lives in `DeckRepositoryImpl.promoteFieldToDeck(deckId, deckPath, slidesPath, value)` (private), which issues a single `$set`+`$unset` update without touching the deck's `@Version`; `promoteSettingsToDeck` delegates to it. `promoteBackgroundImageToDeck` issues the same kind of update directly rather than delegating, because the background spans two per-slide fields (the image override **and** the `hide_background` suppress flag — see below) and both must be unset so every slide falls through to the new deck default.

The plain `PUT` endpoints (`/point-settings`, `/answer-settings`, `/background-image`) only update the deck value, leaving slide overrides intact — use those for editing the deck default independently of any slide.

### Slide background — three states

A deck has one default `background_image`; a slide can override it. Because `null` alone can't distinguish "inherit the deck" from "show nothing", a slide carries a separate `hide_background` boolean alongside its optional `background_image`. The pair resolves in three states (see `resolveSlideBackground` on the frontend and `Slide` on the backend):

| Slide state | `background_image` | `hide_background` | Renders |
|---|---|---|---|
| **Own image** | set | (ignored) | the slide's image |
| **Inherit** (default) | null | `false` | the deck's `background_image` |
| **Hidden** | null | `true` | nothing — the deck default is suppressed |

An explicit image always wins, so setting one normalizes `hide_background` to `false`. The three slide-level endpoints map to the three states:

| Endpoint | Effect |
|---|---|
| `PUT /api/decks/{id}/slides/{slideId}/background-image` | Own image (clears the suppress flag) |
| `DELETE /api/decks/{id}/slides/{slideId}/background-image` | **Reset to deck** — drop the image and the flag, so the slide inherits |
| `PUT /api/decks/{id}/slides/{slideId}/background-image/hide` | **Remove background** — no image, deck default suppressed |

In the inspector (`EditSlidePanel`), the image picker covers "own image" vs "reset to deck", and a "Hide background on this slide" toggle (shown only when the slide has no own image and the deck *has* a background) switches between Inherit and Hidden.

## Hooks cleanup backlog

Outstanding naming inconsistencies and overlap issues across the deck hook layer:
see [hooks-cleanup.md](hooks-cleanup.md).

## Key files

| File                                                                       | Purpose                                                          |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `frontend/src/components/DeckEditor/DeckEditor.tsx`                        | Top-level layout (navbar + 3-col canvas)                         |
| `frontend/src/components/DeckEditor/LeftSidebar.tsx`                       | Slide rail: add-via-picker, drag-reorder, live deck.elements     |
| `frontend/src/components/DeckEditor/NewSlideModal.tsx`                     | Modal body with element-kind tiles                               |
| `frontend/src/components/DeckEditor/SlideThumbnail.tsx`                    | Slide tile (right-click menu, scrolls into view on select)       |
| `frontend/src/components/DeckEditor/SlideDisplay.tsx`                      | Routes to the right `<KindSlideContent>` by `element.kind`       |
| `frontend/src/components/DeckEditor/SlideContentTypes/useElementEditor.ts` | Shared deck-query + debounced commit hook                        |
| `frontend/src/components/DeckEditor/useDeckEditor.ts`                      | Sidebar state: drag end, add element, build defaults             |
| `frontend/src/hooks/useDebouncedCommit.ts`                                 | Generic schedule / flush / cancel debouncer                      |
| `frontend/src/context/ModalProvider.tsx` / `useModal.tsx`                  | App-wide modal: `openModal({ title, content })` / `closeModal()` |
| `frontend/src/context/LayoutProvider.tsx` / `useFullScreen.tsx`            | Fullscreen state + global ESC handler + floating exit button     |
| `frontend/src/components/Common/Input/RichTextInput.tsx`                   | TipTap-backed input with focus toolbar + inline link editor      |
| `frontend/src/store/apiEnhancements.ts`                                    | `onQueryStarted` cache-sync for element/deck mutations           |
| `frontend/src/routes/my-decks/create.tsx`                                  | Optimistic deck-create: UUID + cache seed + navigate             |
