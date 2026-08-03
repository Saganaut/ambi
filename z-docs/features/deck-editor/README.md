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

## Placement editors — Axis, Place-on-Image, Grid

Three slide kinds are "author a list of items, then place them somewhere":
`AXIS` (a 2D plane), `PLACE_ON_IMAGE` (a backing image), and `GRID` (a rows ×
columns matrix). All three are built to the same shape, so learning one
teaches the others.

### Shared placement kit

The pieces every one of them uses live in
`components/DeckEditor/SlideContent/_shared/placement/` and are re-exported
from the `_shared` barrel:

- `ItemBankRow` (`_shared/ItemBankRow/`, one level up from the placement folder since Ranking, Scales and Allocation list it too) — the one item row every bank lists: colored index pill, image thumbnail when the item has one, label field + popover menu, an optional trailing `meta` slot, a kind-specific trailing block (an "answer set" check, the scale tracker, the points input), and the drag grip. Its props are a discriminated union with one arm per bank kind — `allocation`, `grid`, `placement`, `ranking`, `scales` — over a shared base that carries `selected` / `onSelect` / `meta`. It owns the row's own chrome (surface, radius, elevation, the selected border, the dimmed dragging state) and nothing else. `SortableItemBankRow` is the draggable export every composer actually renders: it wraps the same row in `useSortable` and passes the grip/root refs down, because the rules of hooks forbid a component turning `useSortable` on and off.
- `usePointerPlacement` — the pointer gestures all three share: press-to-place, drag-to-move, tap-to-select, pointer capture, and a single commit on release. It is generic over what a press resolves to, supplied by the caller as `resolve(clientX, clientY)`.
- `usePlacementSurface` + `PlacementMarker` + `placementGeometry.ts` — `usePointerPlacement` resolved to normalized [0, 1] coordinates over a surface's box, for the free-placement surfaces (Axis, Place-on-Image). Grid resolves the same gestures to a discrete cell instead (`useGridCellPlacement`, below).
- `ToleranceField` — the ×100 / ÷100 percent wrapper around the shared `NumberInput`.
- `_shared/useSlideComposerState.ts` — the prompt mirror, `selectedItemId` (the armed row), and `openMenuId`, resynced during render when the bound slide changes.
- `_shared/AddItemCard/` — the dashed "Add …" row that closes an item list, the row-list counterpart of MCQ's `CanAddOptionCard`. Each editor renders it as the last child of its own list container, and swaps its label for the "Maximum N …" wording (plus `disabled`) once the list is at its cap.
- `_shared/_shared.module.css` — the two-column frame (`.editorRow`, `.editorColumnWide`, `.editorColumnNarrow`), card-header accessories, the item-list stack (`.itemList`), and the `ItemCard` chrome. `ItemBankRow` and `AddItemCard` bring their own modules instead, since their chrome is no longer `ItemCard`'s.

Item colors come from one resolver, `resolveDatumColor(item.color, index)`
(`shared/components/Charts/optionPalette.ts`): the item's stored color, else a
palette default by list position, with a darker second cycle past the palette's
six colors. The play-time boards use the same call, so a chip in the editor and
its counterpart on the board are the same color.

For the placement kinds (Axis, Grid, Ranking, Place-on-Image) the stored color
is always present, so the positional fallback never fires: `nextPaletteColor`
stamps the lowest free palette slot on an item as it is **created**, and
`useItemIdentityBackfill` (`features/deck/hooks/`) freezes the id and color of
legacy items into the content in one write the first time such a slide is
opened — a color-less item keeps the palette default its current position was
already rendering. Reordering a bank therefore renumbers it and nothing else:
the answer keys are id-keyed (Axis's `correctPositions`, Place-on-Image's
`correctPositions`, Grid's `correctCells`) and the colors travel with the
items. Drag-end events are reduced by
the shared `resolveDragEnd` / `BANK_DROPPABLE_ID` seam in
`shared/utils/dragDrop.ts`, shared with the live-session boards.

Kind-specific detail lives with each kind:
[Axis](../axis-slides/README.md) carries the kit's full inventory,
[Place-on-Image](../place-on-image/README.md) its own surface, and Grid is
below.

### Grid slides

`SlideContent/GridSlideContent/` mirrors Axis's two-column layout: a "Grid"
card holding the matrix (in-place editable axis labels, "+" affordances to grow
either axis, one droppable cell per row × column, and an "N of M placed"
counter in the header) beside an "Items" card holding one
`SortableItemBankRow` (`type="grid"`) per item.

- **The Items column IS the bank.** An item lives in that list whether or not it is placed; `correctCells` (item id → `"rowIndex,colIndex"`) carries an entry only for the placed ones, and a placed row shows its cell name as trailing meta plus the row's "answer set" check — an unplaced one shows neither, which is how the list reads "unplaced" without a word for it. There is no separate "unplaced items" tray, and adding an item (`useGridEditor`'s `addItem(cell?)`) no longer requires a cell.
- **Placement has two inputs.** Arm-then-click is the pointer-free path: click a row to arm that item, then press a cell's "Place here" button (disabled, with a muted "Select an item to place", while nothing is armed). Unplacing is the matrix's job — drag a chip off it; the row menu has no "Clear cell" entry. Press-drag is the pointer path, the same gesture the Axis plane uses: with an item armed, a press anywhere on the matrix carries a translucent ghost badge under the pointer, highlights the cell it is over, and places on release — releasing over no cell abandons the placement without writing. A placed chip (`GridCellChip` — the compact numbered token in a cell, matching its row's number and color) is pressed and dragged the same way: released over a cell it moves, released off the matrix or in a gap it is unplaced. A press that never travels is a tap that arms/disarms the chip's item.
- **Cells, not coordinates.** `useGridCellPlacement` composes the kit's `usePointerPlacement` with a grid-specific resolver: the matrix's header lanes and inter-cell gaps belong to no cell, so a press is hit-tested against the cells' own boxes (`gridCellHitTest.ts`, fed by the elements each cell registers) rather than normalized against the matrix's. A miss is a real answer — it is what cancels a fresh placement and unplaces a dragged chip. The Grid editor uses no dnd-kit droppables; dnd-kit remains only for reordering the item rows, and the `resolveDragEnd` / `BANK_DROPPABLE_ID` seam is now the live-session boards' alone.
- Grading is EXACT — every placement must match `correctCells` — so the footer nudges until every item has a cell, but never blocks. `scoreMode` has no authoring knob.

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

The five item-bank kinds (Axis, Grid, Ranking, Scales, Place-on-Image) then
compose `useItemBankEditor`
(`frontend/src/features/deck/hooks/useItemBankEditor.ts`) over that single
`useSlideEditor` — it owns add / remove / reorder and the per-row label, color
and image patches, plus the load-time identity backfill, while the kind hook
keeps its own answer-key ops. It mounts no editor of its own: the kind hook
passes in the instance the slide already owns, so every write still funnels
through one draft + debounce buffer. Structural writes go through the caller's
`toPatch`, which is how Ranking's `correctOrder` mirror stays in lockstep with
the bank on add, remove, reorder and backfill alike.

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
- Toolbar capabilities today: bold / underline / strike / link (inline URL editor, no `window.prompt`) / color (the DS `ColorPicker`, see [Color pickers](#color-pickers) below) / 4-step font size. Extensions in use: `@tiptap/starter-kit`, `@tiptap/extension-text-style` (TextStyle + Color + FontSize), `@tiptap/extensions` (Placeholder).
- No `window.alert` / `window.prompt` / `window.confirm` anywhere. In-editor sub-controls (links, colors, sizes) use inline popovers under the toolbar — follow that pattern for any future toolbar additions.
- Rich text is stored as an HTML string (`editor.getHTML()`). It is rendered read-only by `RichTextDisplay` (`frontend/src/shared/components/Forms/Input/RichTextDisplay/RichTextDisplay.tsx`), the single sink for every consumer (slide thumbnails, the live-session `SessionHeader`, etc.). Because the stored `body` is an untrusted string on the wire (seed data, a direct API write, an imported deck, or a `javascript:` href can all bypass the editor), `RichTextDisplay` sanitizes the string with **DOMPurify** (`frontend/src/shared/utils/sanitizeHtml.ts`) before injecting it via `dangerouslySetInnerHTML`. The allowlist mirrors the TipTap schema (formatting marks, lists, headings, links, and `color`/`font-size` style spans — a hook drops every other CSS property); scripts, event handlers, and unsafe URL schemes are stripped. Always render rich text through `RichTextDisplay` — never inject a `body` directly. This is the client half of the security report's [finding #2](../../security-report-2026-07-12.md). The server half is now in place too: `DeckService` runs `RichTextContent.body` through the backend `RichTextSanitizer` (OWASP Java HTML Sanitizer) on every slide add/update, so persisted markup is allowlist-clean at the storage boundary regardless of ingestion route. The two sanitizers share the same allowlist (formatting/lists/headings/links, `color`/`font-size` styles, `noopener`/`noreferrer` forced on links); the only intentional divergence is that the server forces the safe `rel` on *every* link while the client forces it only on links that carry a `target` — the server is stricter, which is safe for a defense-in-depth layer.

## Color pickers

Every DS color picker in the editor — the rich-text toolbar's text color, `EditSlidePanel`'s per-slide background color, and the option/item "custom color" modal (`SlideContent/_shared/OptionMenu/useCustomColorModal.tsx`) — is the DS `ColorPicker` (`frontend/src/shared/components/Forms/Input/ColorPicker/`), and all three share one app-wide "recently used" list.

- **Opacity is opt-out.** The custom view's opacity slider makes Apply emit `#rrggbbaa`, which the background-color endpoint rejects (`SetColorRequest` validates `#[0-9a-fA-F]{6}`) — a silently failed commit that reads as "the slider does nothing". Hosts backed by an opaque-only field pass `allowAlpha={false}`: the slider is dropped and every colour entering the editor (seed, typed hex, Recent/Theme swatch) is pinned to full opacity. `EditSlidePanel`'s background picker sets it; the text-colour and palette pickers keep alpha.
- `useRecentColors` (`frontend/src/shared/hooks/useRecentColors.ts`) owns that list; `ColorPicker`'s `recentlyUsedColorSwatch` prop is caller-owned, so each consumer reads `useRecentColors()` and passes it in, then calls `addRecentColor(color)` from its own `onChange`/Apply handler.
- **Persisted to `localStorage`** under the key `ambi-recent-colors` (naming follows `useTheme`'s `ambi-theme-spec`), so recents survive a reload. The list is newest-first, deduplicated by exact string match, and capped at 8. This is deliberately client-only/per-browser — a server-side, cross-device sync of recents was considered and rejected.
- Same-page cross-instance sync (e.g. the toolbar and the background-color picker updating together) goes through a module-level external store read via `useSyncExternalStore` — not Redux, since this is browser-persisted state outside the RTK Query cache (see [state-ownership.md](../../rules/frontend/state-ownership.md) for the slice/context/local decision tree this sits outside of). There is deliberately no cross-tab `storage` event listener; two open tabs don't sync live.
- Values read back from storage are validated with the `isColorValue` type guard (`ColorPicker/colorConversion.ts`); corrupt JSON degrades to an empty list, while individual non-color entries are dropped and the valid rest kept. A storage write failure (private browsing, quota exceeded) degrades to in-memory-only for the rest of the session — the picker keeps working, it just won't persist.

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
| `frontend/src/features/deck/hooks/useItemBankEditor.ts`                                                 | Shared item-bank engine (add/remove/reorder/patch + identity backfill) composed by the five bank kind hooks |
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
