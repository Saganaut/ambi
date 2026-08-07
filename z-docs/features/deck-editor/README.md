# Deck Editor

The authoring dashboard. Both `/decks/$deckId/edit` and `/decks/$deckId/view`
mount `views/DeckViewPage/DeckViewPage`, a thin wrapper around
`views/DeckEditor/DeckEditor.tsx` — the three-column shell (slide rail | active
slide | inspector) plus the editor navbar with its inline-editable deck title.

## Component layout

All under `frontend/src/features/deck/`:

- `components/DeckEditor/LeftSidebar/LeftSidebarContent.tsx` — the slide rail. Reads the deck's slides via RTK Query (`listDeckSlides`), drag-to-reorder (optimistic + a `moveSlide` mutation). "New Slide" opens `NewSlideModal`.
- `components/DeckEditor/NewSlideModal/NewSlideModal.tsx` — two sections, `"Interactive"` and `"Presentation"`, of `SlideTypeGraphic` tiles. Not every `SlideType` is offered: `TITLE` is retired and `FOLLOW_UP` is created only via a parent slide's "Add follow-up slide" action.
- `components/DeckEditor/LeftSidebar/SlideThumbnail.tsx` — thumbnail tile with a right-click menu (delete, add follow-up). Carries `id={slide.id}` so the create flow can `scrollIntoView`; a slide with an attached follow-up renders as one draggable unit (parent + indented child tile).
- `components/DeckEditor/SlideDisplay/SlideDisplay.tsx` — dispatches on `slide.content.contentType`; each per-type editor is lazy-loaded.
- `components/DeckEditor/SlideContent/` — one folder per `SlideType`, plus `_shared/` for cross-type building blocks. 17 types total (see `store/deckEnums.gen.ts`).

## The Slide model

The authoring unit is a **Slide**, not an "element" — there is no top-level
type field. A slide carries its kind solely on `content.contentType` (the
`SlideContent` discriminated union, one arm per `SlideType`). `SlideResponse`
also carries fields outside `content`: `title`, `section`, `speakerNotes`,
`participantInstructions`, `settings` (per-slide `pointSettings`/
`answerSettings` overrides), `backgroundImage`/`hideBackground`/
`backgroundColor` (see [Slide background](#slide-background--three-independent-layers)),
`coverImage`, and `parentId`/`childId` for a follow-up pair.

## Editor commit pattern

Field edits go through `useSlideEditor` (`hooks/useSlideEditor.ts`), which sits
on `useSlide` (the slide collection + the full-slide PUT). Read its doc comment
for the mechanics; the load-bearing facts are:

- `useSlideEditor<T>(deckId, slideId, contentType)` narrows the cached slide to kind `T` via a runtime guard, so a mismatched slide reads back `undefined` rather than being force-cast. Omit `contentType` for the metadata-only surface.
- It accumulates a `useRef` draft of the not-yet-committed patch (reset on `slideId` change) and commits through `useDebouncedCommit` (`shared/hooks/useDebouncedCommit.ts` — also used by `useSlideSettings` and `useDeckSettingsMutate`): `schedule` buffers and coalesces, `flush()` fires immediately (bind to `onBlur` or before a structural change), unmount auto-flushes.
- Image and per-slide settings edits (`backgroundImage`, `coverImage`, `backgroundColor`, `pointSettings`, `answerSettings`) are deliberately **outside** this patch — they have their own mutations, so a content edit can never clobber them.

The five item-bank kinds (Axis, Grid, Ranking, Scales, Place-on-Image) compose
`useItemBankEditor` (`hooks/useItemBankEditor.ts`) over that **one**
`useSlideEditor` instance — the bank mounts no editor of its own, so every
write funnels through a single draft + debounce buffer. It owns add / remove /
reorder plus the per-row label, color and image patches and the load-time
identity backfill; structural writes go out through the caller's `toPatch`,
which is how Ranking's `correctOrder` mirror stays in lockstep.

## Shared placement kit

Axis, Place-on-Image and Grid are all "author a list of items, then place them
somewhere". The pieces they share live in `SlideContent/_shared/placement/`
(re-exported from the `_shared` barrel) — **this is the kit's canonical
inventory; the per-kind docs point here**:

| Piece | What it is |
|---|---|
| `ItemBankRow` (`_shared/ItemBankRow/`) | The one item row every bank lists: index pill, thumbnail, label field + popover menu, optional trailing `meta`, kind-specific trailing block, drag grip. Props are a discriminated union with one arm per bank kind — `allocation`, `placement`, `ranking`, `scales`. `SortableItemBankRow` is the draggable export composers actually render. |
| `usePointerPlacement` | The shared gestures: press-to-place, drag-to-move, tap-to-select, pointer capture, one commit on release. Generic over what a press resolves to. |
| `usePlacementSurface` + `PlacementMarker` + `placementGeometry.ts` | That gesture resolved to normalized `[0, 1]` coordinates over a surface box, parameterized by `invertY`. Grid resolves to a discrete cell instead (`useGridCellPlacement`). |
| `ToleranceField` | The ×100 / ÷100 percent wrapper around the shared `NumberInput`. |
| `_shared/ItemField/` | The label-input-as-popover-trigger, `FloatingPopover` positioning, and `OptionMenuContent` body every bank row's menu runs on. |
| `_shared/useSlideDraft.ts` | Prompt mirror, `selectedItemId` (the armed row), `openMenuId` — resynced during render when the bound slide changes. |
| `_shared/AddItemCard/` | The dashed "Add …" row closing an item list; swaps to "Maximum N …" + `disabled` at the cap. |
| `_shared/_shared.module.css` | The two-column frame (`.editorRow`, `.editorColumnWide`, `.editorColumnNarrow`), card-header accessories, `.itemList`, `ItemCard` chrome. |

Item colors come from one resolver, `resolveDatumColor(item.color, index)`
(`shared/components/Charts/optionPalette.ts`) — the stored color, else a
palette default by list position. The live boards call the same resolver, so a
chip in the editor and its counterpart on the board match.

For the placement kinds the stored color is always present, so the positional
fallback never fires: `nextPaletteColor` stamps the lowest free palette slot at
item **creation**, and `useItemIdentityBackfill` freezes id + color into the
content on first open of a legacy slide. Reordering a bank therefore renumbers
it and nothing else — the answer keys are id-keyed (`correctPositions`,
`correctCells`) and colors travel with the items. Drag-end is reduced by the
shared `resolveDragEnd` / `BANK_DROPPABLE_ID` seam in `shared/utils/dragDrop.ts`.

Kind-specific detail lives with each kind: [Axis](../axis-slides/README.md),
[Place-on-Image](../place-on-image/README.md), and Grid below.

### Grid slides

`SlideContent/GridSlideContent/` mirrors Axis's two-column layout: a "Grid"
card (editable axis labels, "+" affordances to grow either axis, one cell per
row × column, an "N of M placed" header counter) beside an "Items" card of
`SortableItemBankRow`s — which pass `type="PLACEMENT"`, the same arm Axis and
Place-on-Image use.

- **The Items column IS the bank.** An item lives there whether or not it is placed; `correctCells` (item id → `"rowIndex,colIndex"`) carries an entry only for the placed ones. There is no separate unplaced tray, and `addItem(cell?)` no longer requires a cell.
- **Two placement inputs.** Arm a row then press a cell's "Place here" (the pointer-free path), or press-drag from an armed row across the matrix and release over a cell. A placed `GridCellChip` drags the same way; released off the matrix it un-places.
- **Cells, not coordinates.** `useGridCellPlacement` composes `usePointerPlacement` with a hit test against the cells' own boxes (`gridCellHitTest.ts`), since header lanes and inter-cell gaps belong to no cell. A miss is a real answer — it cancels a fresh placement and un-places a dragged chip. Grid uses no dnd-kit droppables; dnd-kit remains only for row reordering.
- Grading is EXACT — every placement must match `correctCells` — so the footer nudges until every item has a cell, but never blocks. `scoreMode` has no authoring knob.

## Mutation → query cache sync

`shared/store/apiEnhancements.ts` is a side-effect-imported barrel (from
`store.ts`) that side-imports one module per feature surface, each layering
`onQueryStarted` handlers onto the generated `deckApi` mutations via
`enhanceEndpoints` — never edit `deckApi.gen.ts` directly:

- `@deck/store/enhancements/deck.ts` — deck-level mutations reconcile `getDeck`.
- `@deck/store/enhancements/slide.ts` — slide mutations reconcile the **separate** `listDeckSlides` cache, the single source of truth for a deck's slide collection. Slide mutations never touch `getDeck`.
- `@deck/store/enhancements/promote.ts` — the six "apply to deck" mutations (below), each patching both caches in one `onQueryStarted`.
- `@deck/store/enhancements/comment.ts` — discussion/comment cache sync.

Every handler has the same shape: optimistically patch in `onQueryStarted`,
fold the mutation's own response back in on resolve (the server owns audit ids,
`@Version`, and the LexoRank `sortOrder`), undo the patch on reject. No manual
refetch or tag invalidation.

## Deck create

`hooks/useCreateDeck.ts` mints a UUID client-side (`crypto.randomUUID()`),
fires an idempotent `PUT /api/decks/{id}`, and returns the id synchronously
plus a `persisted` promise callers can sequence writes off.
`createDeckAndGoToEditor()` navigates to `/decks/${deckId}/edit` immediately —
the editor's own queries populate the cache when it mounts. The same
client-minted-id pattern applies to new slides and their nested collections, so
optimistic UI works throughout.

## Rich text editing

Formatted-text fields use **TipTap** through the project's `RichTextInput`
(`shared/components/Forms/Input/RichTextInput/`), which wraps `useEditor` +
`<EditorContent>` and a focus-triggered floating toolbar into one
form-input-shaped component. Toolbar: bold / underline / strike / link (inline
URL editor) / color (the DS `ColorPicker`) / 4-step font size. No
`window.alert`/`prompt`/`confirm` anywhere — in-editor sub-controls use inline
popovers.

Rich text is stored as an HTML string and rendered read-only by
`RichTextDisplay`, the single sink for every consumer. Because the stored body
is untrusted on the wire, `RichTextDisplay` sanitizes with DOMPurify
(`shared/utils/sanitizeHtml.ts`) before `dangerouslySetInnerHTML` — always
render rich text through it. `DeckService` runs the same allowlist server-side
via `RichTextSanitizer` on every slide add/update, so persisted markup is clean
at the storage boundary regardless of ingestion route (the server half of
[security finding #2](../../security/open-findings.md)).

## Color pickers

Every picker in the editor — the rich-text toolbar's text color,
`EditSlidePanel`'s per-slide background color, and the option/item custom-color
surface (`SlideContent/_shared/OptionMenu/CustomColorPanel.tsx`, a panel inside
the popover rather than a modal) — is the DS `ColorPicker`
(`shared/components/Forms/Input/ColorPicker/`), and all share one app-wide
"recently used" list via `useRecentColors` (`localStorage` key
`ambi-recent-colors`, newest-first, capped at 8, per-browser by design).

- **Opacity is opt-out, and getting it wrong fails silently.** The custom view's opacity slider makes Apply emit `#rrggbbaa`, which the background-color endpoint rejects (`SetColorRequest` validates `#[0-9a-fA-F]{6}`) — a failed commit that reads as "the slider does nothing". Hosts backed by an opaque-only field pass `allowAlpha={false}`: the slider is dropped and every colour entering the editor is pinned to full opacity. `EditSlidePanel`'s background picker sets it; the text-colour and palette pickers keep alpha.

## Fullscreen mode

App-level fullscreen state lives in `LayoutProvider`
(`shared/context/LayoutProvider.tsx`), read via `useFullScreen()` →
`{ isFullScreen, enterFullScreen, exitFullScreen, toggleFullScreen }`. Each
surface wires its own trigger; exiting is global (ESC handler + a floating
top-right exit button rendered by the provider). There is no global CSS hook —
components that need to react read `isFullScreen` and toggle their own class.
The browser Fullscreen API is deliberately not used: this is app-level layout
only.

## Image picking

Image fields (slide cover, slide/deck background, per-option and per-item
images) go through the real gallery picker. `useGalleryPicker`
(`shared/hooks/useGalleryPicker.tsx`) opens the modal and resolves with the
chosen `AppImage`; `ImagePicker.tsx` and `CoverImagePicker.tsx` wrap it for
their slots. Crop behaviour per slot is documented in
[image-cropping](../image-cropping.md#gallerypicker-crop-options). Lorem Picsum
is only a decorative fallback where nothing has been picked.

## Settings hierarchy

Slides override a subset of deck-level defaults. Resolution order:

1. **Hardcoded defaults** — baked into the frontend when no server value exists.
2. **Deck defaults** — `Deck.settings` (`DeckSettings`): `pointSettings`, `answerSettings`, `audienceSettings`, `inviteSettings`.
3. **Per-slide overrides** — `Slide.settings`: `pointSettings` and `answerSettings` only. A null sub-field falls through; a null wrapper equals both being null.

`AudienceSettings` and `InviteSettings` are deck-only. Resolution helpers live
on `Settings.SlideSettings` (`resolvePoints`, `resolveAnswerSettings`).

### Apply to deck

"Apply to deck" promotes the current slide's value to the deck default and
clears every slide's override for that field. **Six endpoints**, each a single
atomic MongoDB update returning the updated `DeckResponse`:

| Endpoint | Effect |
|---|---|
| `PUT /api/decks/{id}/point-settings/promote` | Set deck `settings.pointSettings`; unset it on all slides |
| `PUT /api/decks/{id}/answer-settings/promote` | Set deck `settings.answerSettings`; unset it on all slides |
| `PUT /api/decks/{id}/background-image/promote` | Set deck `background_image`; unset **both** `background_image` and `hide_background` on all slides |
| `DELETE /api/decks/{id}/background-image/promote` | Clear the deck image and the same two per-slide overrides |
| `PUT /api/decks/{id}/background-color/promote` | Set deck `background_color`; unset it on all slides (leaves `hide_background` alone) |
| `DELETE /api/decks/{id}/background-color/promote` | Clear the deck color and the same per-slide override |

The PUT/DELETE pairs exist because *clearing* is as much a deck-level decision
as setting. Persistence goes through the private
`DeckRepositoryImpl.promoteFieldToDeck(deckId, deckPath, slidesPath, value)` —
one `$set`+`$unset` without bumping the deck's `@Version`. The background-image
promotes issue their own update instead of delegating, because they span two
per-slide fields.

The plain `PUT`s (`/point-settings`, `/answer-settings`, `/background-image`,
`/background-color`) update only the deck value and leave slide overrides
intact.

## Slide background — three independent layers

A slide's rendered background composes back-to-front from the resolved
**background color**, the resolved **background image**, and — unrelated to
either — the **cover image**, which is the slide's own content image, not part
of the background stack at all.

### Background image — three states

A deck has one default `background_image`; a slide can override it. Because
`null` alone can't distinguish "inherit" from "show nothing", a slide carries a
separate `hide_background` boolean:

| Slide state | `background_image` | `hide_background` | Renders |
|---|---|---|---|
| **Own image** | set | (ignored) | the slide's image |
| **Inherit** (default) | null | `false` | the deck's image |
| **Hidden** | null | `true` | nothing |

An explicit image always wins, so setting one normalizes `hide_background` to
`false`. The three slide-level endpoints map to the three states:
`PUT .../background-image` (own image), `DELETE .../background-image` (reset to
deck), `PUT .../background-image/hide` (suppress the deck default). In
`EditSlidePanel` the picker covers own-vs-reset and a "Hide background on this
slide" toggle — shown only when the slide has no own image and the deck has one
— switches Inherit ↔ Hidden.

### Background color — independent layer

`background_color` (hex `"#RRGGBB"`) resolves the same way but with only **two**
states: there is no suppress flag for color. It composes *behind* the image and
shares the image's `hide_background` flag (hiding the background hides both),
but setting or clearing a color never touches that flag. Endpoints:
`PUT`/`DELETE /api/decks/{id}/slides/{slideId}/background-color`, plus the
deck-level `PUT`/`DELETE` and the promotes above.

### Cover image — unrelated field

`cover_image` is the slide's own content image slot — a separate `AppImage`
field with no deck default and no promote/inherit semantics. Managed via
`PUT`/`DELETE /api/decks/{id}/slides/{slideId}/cover-image` and, on the
frontend, `CoverImagePicker.tsx`.

## Hooks cleanup backlog

Open naming and overlap issues across the deck hook layer:
[hooks-cleanup.md](hooks-cleanup.md).
