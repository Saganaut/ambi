# Deck Editor

The authoring dashboard at `/decks/$deckId/edit` (`/decks/$deckId/view` renders
the same editor today — both routes point at `DeckViewPage`). Three-column
layout: slide rail | active slide | inspector.

## Component layout

All under `frontend/src/features/deck/`:

- `views/DeckEditor/DeckEditor.tsx` — three-column shell + editor navbar with an inline-editable deck title (commits via `updateDeck` on blur/Enter).
- `components/DeckEditor/LeftSidebar/LeftSidebarContent.tsx` — the slide rail. Pulls the deck's slides live via RTK Query (`listDeckSlides`), supports drag-to-reorder (optimistic + a `moveSlide` mutation). The "New Slide" button opens a modal containing `NewSlideModal`.
- `components/DeckEditor/NewSlideModal/NewSlideModal.tsx` — modal body listing each `SlideType` via the `SlideTypeGraphics` icons, split into "Interactive Slides" (scorable) and "Presentation Slides" (CONTENT/INSTRUCTION/MEDIA) tiles. Click → close modal → `addSlide`.
- `components/DeckEditor/LeftSidebar/SlideThumbnail.tsx` — thumbnail tile with right-click dropdown (delete, add follow-up). Carries an HTML `id={slide.id}` so the create flow can `getElementById(...).scrollIntoView(...)`; also self-scrolls into view when it becomes the active slide. A slide with an attached follow-up renders as one draggable unit (parent + indented follow-up tile).
- `components/DeckEditor/SlideDisplay/SlideDisplay.tsx` — dispatches to the correct content editor based on `slide.content.contentType`. Each per-type editor is lazy-loaded so only the active slide's chunk downloads.
- `components/DeckEditor/SlideContent/` — one folder per `SlideType`, plus a `_shared/` folder for cross-type building blocks (option controls, item fields, image-backing editor, etc.). 17 types total: `ALLOCATION`, `AXIS`, `CONTENT`, `DRAWING`, `FOLLOW_UP`, `GRID`, `INSTRUCTION`, `MATCHING`, `MCQ`, `MEDIA`, `NUMBER`, `PLACE_ON_IMAGE`, `Q_AND_A`, `RANKING`, `SCALES`, `TEXT`, `TITLE` (see `frontend/src/features/deck/store/deckEnums.gen.ts`).

## The Slide model

The primary authoring unit is a **Slide**, not an "element" — there is no
top-level type/kind field. A slide carries its kind solely on
`content.contentType` (the `SlideContent` discriminated union, one arm per
`SlideType`). `SlideResponse` also carries slide-level fields that live outside
`content`: `title`, `section`, `speakerNotes`, `participantInstructions`,
`settings` (per-slide `pointSettings`/`answerSettings` overrides),
`backgroundImage`/`hideBackground`/`backgroundColor` (see
[Slide background](#slide-background--three-independent-layers) below),
`coverImage`, and `parentId`/`childId` for a follow-up pair.

## Editor commit pattern

Field edits in any slide-content editor go through `useSlideEditor`
(`frontend/src/features/deck/hooks/useSlideEditor.ts`), which sits on top of
`useSlide` (owns the slide collection + the full-slide PUT):

1. `useSlideEditor<T extends SlideType>(deckId, slideId, contentType)` narrows the live cached slide to kind `T` via a runtime guard on `content.contentType` (a mismatched slide reads back `undefined` rather than being force-cast). Omit `contentType` for the type-agnostic, metadata-only surface.
2. It returns `{ slide, updateMetadata, updateSlideContent, flush }`. `updateMetadata` patches slide-level fields (title, section, speakerNotes, participantInstructions); `updateSlideContent` shallow-merges a patch onto `content` (or takes a function of the freshest pending content, for collection edits like appending an option that need to compound within one debounce window).
3. Internally it keeps a `useRef` draft (not `useState`) of the accumulated, not-yet-committed patch, so rapid edits across several fields coalesce into a single PUT. The draft resets whenever the active `slideId` changes, so edits never bleed from one slide to the next.
4. Writes are debounced through `useDebouncedCommit` (`frontend/src/shared/hooks/useDebouncedCommit.ts`, `frontend/src/features/deck/hooks/useSlideEditor.ts`'s only consumer of it): `schedule(patch)` buffers and coalesces, `flush()` runs immediately (bind to `onBlur` or before a structural change), unmount auto-flushes so slide-switches don't lose in-flight edits.
5. Image and per-slide settings edits (`backgroundImage`, `coverImage`, `backgroundColor`, `pointSettings`, `answerSettings`) are intentionally **not** part of this patch — they go through their own dedicated mutations (see below) so a content edit can never clobber them.

Each per-type editor instantiates the hook monomorphically, e.g.
`useSlideEditor<"MCQ">(deckId, slideId, "MCQ")`.

## Mutation → query cache sync

`frontend/src/shared/store/apiEnhancements.ts` is a side-effect-imported
barrel (imported from `store.ts`) that side-imports one module per feature
surface, each of which layers `onQueryStarted` handlers onto the
auto-generated `deckApi` mutations via `enhanceEndpoints` — never edit the
generated `deckApi.gen.ts` directly:

- `@deck/store/enhancements/deck.ts` — deck-level mutations (`updateDeck`, visibility, shares, tags, deck-level settings, `deleteDeck`) reconcile the `getDeck` cache.
- `@deck/store/enhancements/slide.ts` — slide mutations (`addSlide`, `updateSlide`, `removeSlide`, `moveSlide`, `addFollowUpSlide`, and the per-slide cover/background/settings endpoints) reconcile the **separate** `listDeckSlides` cache, which is the single source of truth for a deck's slide collection — the editor renders purely by that array's order. Only deck-level mutations touch `getDeck`; slide mutations never do.
- `@deck/store/enhancements/promote.ts` — the four "apply to deck" promote mutations (see [Apply to deck](#apply-to-deck) below), each of which patches both `getDeck` and `listDeckSlides` in one `onQueryStarted`.
- `@deck/store/enhancements/comment.ts` — discussion/comment cache sync.

Every handler follows the same shape: optimistically patch the relevant
cache in `onQueryStarted`, then fold the mutation's own response back in once
it resolves (the server owns audit ids, `@Version`, and the LexoRank
`sortOrder` key) — no manual refetch or tag invalidation. On reject, the
optimistic patch is undone.

## Deck create

`frontend/src/features/deck/hooks/useCreateDeck.ts` mints a UUID client-side
(`crypto.randomUUID()`), fires an idempotent `PUT /api/decks/{id}` via
`createDeckMutation({ id })` (the deck is born "Untitled Deck" server-side),
and returns the id synchronously plus a `persisted` promise a caller can
sequence follow-up writes off. `createDeckAndGoToEditor()` additionally
navigates to `/decks/${deckId}/edit` right away — there is no
`/my-decks/create` route and no `Ambi.util.upsertQueryData` cache seed; the
editor's own `getDeck`/`listDeckSlides` queries populate the cache when it
mounts. The same client-minted-id pattern applies to new slides and their
nested collections (options/items) so optimistic UI works throughout; the
backend accepts a client-supplied id and treats the create call as
idempotent.

## Rich text editing

- The deck/slide authoring UI uses **TipTap** (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm`) for any formatted-text field — slide bodies, question explanations, host notes, etc.
- When a field needs more than a plain string (bold, italic, lists, headings), use the project's `RichTextInput` (`frontend/src/shared/components/Forms/Input/RichTextInput/RichTextInput.tsx`), which wraps `useEditor` + `<EditorContent>` and the supporting TipTap extensions in a single form-input-shaped component with a focus-triggered floating toolbar.
- Toolbar capabilities today: bold / underline / strike / link (inline URL editor, no `window.prompt`) / 6-swatch color / 4-step font size. Extensions in use: `@tiptap/starter-kit`, `@tiptap/extension-text-style` (TextStyle + Color + FontSize), `@tiptap/extensions` (Placeholder).
- No `window.alert` / `window.prompt` / `window.confirm` anywhere. In-editor sub-controls (links, colors, sizes) use inline popovers under the toolbar — follow that pattern for any future toolbar additions.
- Rich text is stored as an HTML string (`editor.getHTML()`). It is rendered read-only by `RichTextDisplay` (`frontend/src/shared/components/Forms/Input/RichTextDisplay/RichTextDisplay.tsx`), the single sink for every consumer (slide thumbnails, the live-session `SessionHeader`, etc.). Because the stored `body` is an untrusted string on the wire (seed data, a direct API write, an imported deck, or a `javascript:` href can all bypass the editor), `RichTextDisplay` sanitizes the string with **DOMPurify** (`frontend/src/shared/utils/sanitizeHtml.ts`) before injecting it via `dangerouslySetInnerHTML`. The allowlist mirrors the TipTap schema (formatting marks, lists, headings, links, and `color`/`font-size` style spans — a hook drops every other CSS property); scripts, event handlers, and unsafe URL schemes are stripped. Always render rich text through `RichTextDisplay` — never inject a `body` directly. This is the client half of the security report's [finding #2](../../security-report-2026-07-12.md); server-side sanitization of `RichTextContent.body` on write remains a separate follow-up.

## Fullscreen mode

App-level fullscreen state lives in `LayoutProvider` (`frontend/src/shared/context/LayoutProvider.tsx`) and is read via `useFullScreen()` (`frontend/src/shared/hooks/useFullScreen.tsx`). The hook returns `{ isFullScreen, enterFullScreen, exitFullScreen, toggleFullScreen }`.

- **Triggering**: wire `enterFullScreen` / `toggleFullScreen` to whatever UI you want (button, menu, keybinding). There's no per-page convention — each surface adds its own trigger.
- **Exiting**: handled globally. `LayoutProvider` listens for the ESC key while fullscreen is active and renders a floating exit button fixed top-right (styled in `LayoutProvider.module.css`). Pages don't need to render their own exit control.
- **Styling**: there is **no global CSS hook** (e.g. no `body.fullscreen` selector). Components that need to react to fullscreen — collapse the nav, expand a canvas, hide a sidebar — read `isFullScreen` from the hook and toggle a class on themselves in their own stylesheet.
- The browser Fullscreen API (`element.requestFullscreen()`) is intentionally **not** used — this is app-level layout only, so ESC behavior, mobile Safari, and gesture-trust caveats don't apply.

## Image picking

Image fields (slide cover image, slide/deck background image, per-option
and per-item images) go through the real gallery/media picker, not a
placeholder. `useGalleryPicker` (`frontend/src/shared/hooks/useGalleryPicker.tsx`)
opens the picker modal and resolves with the chosen `AppImage`; the deck
editor's `ImagePicker.tsx` (`frontend/src/features/deck/components/DeckEditor/RightSidebar/shared/ImagePicker.tsx`)
and `CoverImagePicker.tsx` wrap it for their respective slots. The gallery
feature itself lives under `frontend/src/features/gallery/`. Lorem Picsum
(`https://picsum.photos/seed/${id}/...`) is now only a **decorative
fallback** shown where no image has been picked yet — it is not a stand-in
for a missing feature.

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

**Backend — four endpoints, each a single atomic MongoDB update:**

| Endpoint | Body | Effect |
|---|---|---|
| `PUT /api/decks/{id}/point-settings/promote` | `SetPointSettingsRequest` | Sets `settings.pointSettings` on the deck; unsets `slides.$[].settings.pointSettings` on all slides |
| `PUT /api/decks/{id}/answer-settings/promote` | `SetAnswerSettingsRequest` | Sets `settings.answerSettings` on the deck; unsets `slides.$[].settings.answerSettings` on all slides |
| `PUT /api/decks/{id}/background-image/promote` | `SetImageRequest` | Sets `background_image` on the deck; unsets **both** `slides.$[].background_image` and `slides.$[].hide_background` on all slides |
| `PUT /api/decks/{id}/background-color/promote` | `SetColorRequest` | Sets `background_color` on the deck; unsets `slides.$[].background_color` on all slides (leaves `hide_background` untouched) |

All return a `DeckResponse` with the updated deck. The frontend's
`promote.ts` cache-sync enhancer (see above) patches both `getDeck` and
`listDeckSlides` from the same response, so no separate slide refetch is
needed.

The shared persistence logic lives in `DeckRepositoryImpl.promoteFieldToDeck(deckId, deckPath, slidesPath, value)` (private), which issues a single `$set`+`$unset` update without touching the deck's `@Version`; `promoteSettingsToDeck` and `promoteBackgroundColorToDeck` both delegate to it, since each only touches one per-slide field. `promoteBackgroundImageToDeck` issues the same kind of update directly rather than delegating, because the background image spans two per-slide fields (the image override **and** the `hide_background` suppress flag — see below) and both must be unset so every slide falls through to the new deck default.

The plain `PUT` endpoints (`/point-settings`, `/answer-settings`, `/background-image`, `/background-color`) only update the deck value, leaving slide overrides intact — use those for editing the deck default independently of any slide.

### Slide background — three independent layers

A slide's rendered background composes from three independent pieces, from
back to front: the resolved **background color**, the resolved **background
image**, and (unrelated to either) the **cover image**, which is the
slide's own content image (e.g. an MCQ's illustrative photo), not part of
the background stack at all.

#### Background image — three states

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

#### Background color — independent layer

A slide/deck also carries an independent `background_color` (hex
`"#RRGGBB"`), resolved the same way as the image (`resolveSlideBackgroundColor`
on the frontend, `Slide`/`Deck` on the backend: a non-null slide color wins,
else fall through to the deck default) but with only **two** states, not
three — there's no separate suppress flag for color. The color composes
*behind* the background image and shares the same `hide_background` flag
(hiding the background hides both layers together), but setting or clearing
a color never touches `hide_background` itself. Endpoints:
`PUT`/`DELETE /api/decks/{id}/slides/{slideId}/background-color` (own color /
reset to deck), plus the deck-level `PUT`/`DELETE /api/decks/{id}/background-color`
and the promote endpoint above.

#### Cover image — unrelated field

`cover_image` is the slide's own content image slot (e.g. an MCQ's
illustrative photo, a title slide's hero image) — a separate `AppImage`
field with no deck-level default and no promote/inherit semantics. Managed
via `PUT`/`DELETE /api/decks/{id}/slides/{slideId}/cover-image` and, on the
frontend, `CoverImagePicker.tsx`.

## Hooks cleanup backlog

Outstanding naming inconsistencies and overlap issues across the deck hook layer:
see [hooks-cleanup.md](hooks-cleanup.md).

## Key files

| File                                                                                                    | Purpose                                                                 |
| --------------------------------------------------------------------------------------------------------| ------------------------------------------------------------------------|
| `frontend/src/features/deck/views/DeckEditor/DeckEditor.tsx`                                            | Top-level layout (navbar + 3-col canvas)                               |
| `frontend/src/features/deck/components/DeckEditor/LeftSidebar/LeftSidebarContent.tsx`                   | Slide rail: add-via-picker, drag-reorder, live `listDeckSlides`         |
| `frontend/src/features/deck/components/DeckEditor/NewSlideModal/NewSlideModal.tsx`                      | Modal body with slide-type tiles                                       |
| `frontend/src/features/deck/components/DeckEditor/LeftSidebar/SlideThumbnail.tsx`                       | Slide tile (right-click menu, scrolls into view on select)             |
| `frontend/src/features/deck/components/DeckEditor/SlideDisplay/SlideDisplay.tsx`                        | Routes to the right `<KindSlideContent>` by `slide.content.contentType`|
| `frontend/src/features/deck/hooks/useSlideEditor.ts`                                                    | Generic per-type slide editing hook: `{ slide, updateMetadata, updateSlideContent, flush }` |
| `frontend/src/features/deck/hooks/useDeckEditor.ts`                                                     | Sidebar state: drag end, add/remove/reorder slide, build defaults      |
| `frontend/src/features/deck/hooks/useCreateDeck.ts`                                                     | Deck create: UUID + `createDeckMutation` + navigate to editor          |
| `frontend/src/shared/hooks/useDebouncedCommit.ts`                                                       | Generic schedule / flush / cancel debouncer                            |
| `frontend/src/shared/context/ModalProvider.tsx`, `frontend/src/shared/hooks/useModal.tsx`               | App-wide modal: `openModal({ title, content })` / `closeModal()`       |
| `frontend/src/shared/context/LayoutProvider.tsx`, `frontend/src/shared/hooks/useFullScreen.tsx`         | Fullscreen state + global ESC handler + floating exit button           |
| `frontend/src/shared/components/Forms/Input/RichTextInput/RichTextInput.tsx`                            | TipTap-backed input with focus toolbar + inline link editor            |
| `frontend/src/shared/store/apiEnhancements.ts`                                                          | Barrel side-importing the per-feature `onQueryStarted` cache-sync rules |
| `frontend/src/features/deck/store/enhancements/slide.ts`                                                | Cache sync for `addSlide`/`updateSlide`/`removeSlide`/`moveSlide`/… against `listDeckSlides` |
| `frontend/src/features/deck/store/enhancements/deck.ts`                                                 | Cache sync for deck-level mutations against `getDeck`                  |
| `frontend/src/features/deck/store/enhancements/promote.ts`                                              | Cache sync for the four "apply to deck" promote mutations              |
| `frontend/src/shared/hooks/useGalleryPicker.tsx`                                                        | Opens the gallery/media picker modal, resolves with the chosen image   |
