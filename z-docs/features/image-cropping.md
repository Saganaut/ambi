# Image Cropping — Placement-Only Crops

**Status:** Specified, not implemented. **Date:** 2026-08-04.

Cropping an image for a slide slot must stop minting gallery entries. This doc
specifies the target design: **the gallery holds originals; a crop is placement
data owned by the deck**, uploaded into the deck's own S3 namespace and freed by
the deck's existing image lifecycle.

Storage, ingest, presigning and the deck adoption model this builds on are
documented in [diagrams/media-gallery.md](../diagrams/media-gallery.md); this
doc only specifies what changes.

---

## Problem

Cropping is entirely client-side. [`ImageCropEditor`](../../frontend/src/shared/components/Media/GalleryPicker/ImageCropEditor.tsx)
picks a pixel rect, [`getCroppedBlob`](../../frontend/src/shared/utils/imageEditing.ts)
rasterizes it on a canvas, and [`CropAndSaveStep`](../../frontend/src/shared/components/Media/GalleryPicker/CropAndSaveStep.tsx)
posts the result through the ordinary gallery upload route
(`POST /api/galleries/{id}/images/upload` → [`GalleryController.uploadImage`](../../backend/src/main/java/com/cephadex/ambi/media/gallery/GalleryController.java)
→ `ImageIngestService.ingest` → `GalleryService.addImage`).

So **every crop mints a new `GalleryImage`, indistinguishable from a fresh
upload**. It is not an edge case:

- the Upload tab crops **mandatorily** — every file and every pasted URL passes
  through the crop step, so the gallery never receives the original at all;
- slots whose shape is load-bearing pass `cropGalleryPicks`, which routes
  **gallery** picks through the same step — a second entry derived from an entry
  the user already has. Today that is every square item slot (MCQ, Allocation,
  Ranking, Scales, Grid, Axis, Matching options via
  [`OptionField`](../../frontend/src/features/deck/components/DeckEditor/SlideContent/_shared/OptionControls/OptionField.tsx) /
  [`ItemField`](../../frontend/src/features/deck/components/DeckEditor/SlideContent/_shared/ItemField/ItemField.tsx) /
  [`PhraseOrImageCard`](../../frontend/src/features/deck/components/DeckEditor/SlideContent/_shared/PhraseOrImageCard/PhraseOrImageCard.tsx),
  plus [Drawing](../../frontend/src/features/deck/components/DeckEditor/SlideContent/DrawingSlideContent/DrawingSlideContent.tsx)
  prompt/answer images and [Place-on-Image](../../frontend/src/features/deck/components/DeckEditor/SlideContent/PlaceOnImageSlideContent/PlaceOnImageSlideContent.tsx)
  backings). Cover, background and media slots don't crop gallery picks.

A ten-option MCQ built from one gallery image therefore leaves eleven gallery
entries. The gallery — a browsing surface, a picker, and the thing the Account
page manages — fills with square derivatives of pictures the user already had.

Nothing in the model distinguishes them: [`AppImage`](../../backend/src/main/java/com/cephadex/ambi/media/AppImage.java)
records no provenance, and there is no reference counting anywhere.

## Decision

**Option A — placement-only crops.** A crop is not a library item; it is the
bytes one slot displays.

1. **Crops never create gallery entries.** The gallery holds originals only.
2. **Crop bytes are uploaded deck-scoped.** A new endpoint ingests the cropped
   file (original + the five WebP tiers) directly under a `deck/{deckId}/{uuid}`
   prefix and returns an `AppImage` **without creating any `GalleryImage`**.
3. **The deck already owns it, so the existing lifecycle applies unchanged.**
   [`DeckImageLifecycleService.adoptImage`](../../backend/src/main/java/com/cephadex/ambi/presentation/deck/DeckImageLifecycleService.java)
   skips keys already under `deck/{deckId}/` (`ImageKeys.isOwnedByDeck`), so no
   copy happens; `cleanupRemoved` frees the objects when the slot is cleared or
   replaced; `deleteAllImages` sweeps them when the deck is deleted.
4. **The Upload tab still enriches the gallery** — with the *original*. One
   genuinely new image, one gallery entry.
5. **Provenance is recorded on the crop's `AppImage.metadata`** so re-cropping
   reopens the editor on the *original* rather than on already-cropped pixels.

### Why this shape

- **It reuses an ownership model that already exists.** Deck adoption solved
  "the deck's bytes must outlive the gallery image"; a deck-scoped crop is
  simply an image born on the far side of that boundary. No new lifecycle, no
  reference counting, no new sweeper.
- **Rendering is unchanged.** The stored bytes *are* the crop, so the variant
  tiers match what is displayed, and every render surface keeps consuming a
  plain `AppImage`.
- **The gallery regains its meaning.** It is the user's library of source
  images, which is what both the picker's Gallery tab and Account → Gallery
  present it as.

### Rejected alternatives

- **(B) Render-time crop rect on `AppImage`.** Store `{x,y,width,height}` and
  let each consumer crop on display. Rejected: the pre-generated WebP variants
  are whole-image renditions, so they would no longer match the displayed crop
  (a thumbnail tier would have to be re-derived or abandoned), and *every*
  render surface — editor, presenter board, participant devices, results
  charts, CSS `background-image` slots that can't express a rect at all — would
  need rect-aware logic. Maximal blast radius for a storage saving we don't need.
- **(C) Derived-but-hidden gallery entries.** Keep minting `GalleryImage` rows
  but flag them `derived` and filter them out of listings. Rejected: the
  duplicates still accumulate (unbounded rows and S3 objects per deck edit),
  and hiding them creates a new orphan problem — nothing owns a hidden row once
  its placement is gone, so it needs exactly the reference counting this design
  avoids, plus a reconciliation job to enforce it.

## New API surface

One new route on the deck aggregate:

```text
POST /api/decks/{deckId}/images/upload
  consumes: multipart/form-data
  parts:    file        (required)  the cropped image bytes
  params:   altText     (optional)  stamped onto the returned AppImage
  returns:  200 AppImage (presigned URLs, as every image read)
```

Behaviour:

- Authorization is **deck EDIT** — `DeckService.getEditable(deckId, principal)`,
  the same gate as every other deck mutation. No new error codes: the failure
  modes are the existing `DECK_NOT_FOUND` / `DECK_EDIT_FORBIDDEN`
  ([`ForbiddenException`](../rules/error-codes.md)) and `VALIDATION_FAILED` from
  ingest validation. Should implementation surface a genuinely new condition,
  its row goes into [`z-docs/rules/error-codes.md`](../rules/error-codes.md)
  **in the same commit** — project rule, not optional.
- The bytes go through `ImageIngestService.ingest(bytes, contentType, filename,
  prefix)` — the existing prefix-parameterized overload that live-session
  drawings already use — with `prefix = ImageKeys.newDeckImagePrefix(deckId)`.
  Same content-type allow-list, same size cap, same five WebP tiers.
- **No `GalleryImage` is created and no `Gallery` is touched.** That is the
  whole point of the route: the same ingest, a different owner.
- The response is a bare `AppImage`, not a wrapper — there is no library row to
  describe. The frontend embeds it in the slide slot and saves the slide
  normally.
- It lives on `DeckController` (`/api/decks/{id}/…`) rather than on the media
  package because the deck id is the authorization subject *and* the key
  namespace. Unlike the raw-bytes routes it returns a typed JSON resource, so it
  is **not** `@Hidden` — it belongs in OpenAPI and gets a generated RTK Query
  hook like `useUploadImageMutation` does.

Nothing else changes on the backend. `ImageKeys`, `ImageIngestService`,
`DeckImages` and `DeckImageLifecycleService` are used as they stand.

## Flows

### (a) Upload tab — new file

1. The author picks a file; the browser makes an object URL (no upload yet).
2. **Original → gallery.** The file is posted to
   `POST /api/galleries/{id}/images/upload` exactly as today, producing one
   `GalleryImage` holding the *uncropped* original. This is the only gallery
   write in the flow.
3. The crop editor opens at the slot's aspect; the author frames it.
4. **Crop → deck.** `getCroppedBlob` rasterizes the rect and the result is
   posted to `POST /api/decks/{deckId}/images/upload`, returning an `AppImage`
   already under `deck/{deckId}/`.
5. Provenance (the source `GalleryImage` id + the pixel rect) is stamped into
   the returned image's metadata client-side and travels with it.
6. `onPick(image)` hands it to the slot; the deck's normal save embeds it.
   Adoption is a no-op (already deck-owned); `cleanupRemoved` frees whatever the
   slot previously held.

Ordering is deliberate: the gallery upload runs **first**, so the crop's
provenance can name a real `GalleryImage` id. A failure there is reported and
the flow stops — the author has not lost their framing.

### (b) Upload tab — pasted external URL

Identical to (a) with one extra hop in front: `fetchRemoteImage` proxies the URL
through the SSRF-guarded `GET /api/media/remote-image` to get bytes into the
browser. From there the same two ingests run — original to the gallery, crop to
the deck. A pasted URL is still stored as owned bytes, never kept as a fragile
external reference.

### (c) Gallery pick on a cropping slot (`cropGalleryPicks`)

1. The author selects an existing gallery image. Its original bytes are fetched
   same-origin via `GET /api/galleries/{id}/images/{imageId}/file` (the
   presigned URL is cross-origin and would taint the canvas; the remote-image
   proxy rejects the storage endpoint by design).
2. The crop editor opens; the author frames it.
3. **Crop → deck only.** One `POST /api/decks/{deckId}/images/upload`. No
   gallery write at all — the original is already in the library, which is the
   entire reason this path existed.
4. Provenance names the picked `GalleryImage`; the slot gets the new `AppImage`.

Ten options cropped from one gallery image now leave **one** gallery entry, not
eleven.

### (d) Gallery pick on a non-cropping slot

Unchanged. The picked `AppImage` is embedded as-is and the existing
copy-on-select adoption copies the gallery objects into `deck/{deckId}/{uuid}`
on save. No crop, no upload, no provenance (the placement *is* the original).

### (e) Re-crop an already-cropped placement

1. The editor reads `metadata.crop` off the embedded `AppImage`.
2. If it names a gallery image the caller can still read, the source bytes come
   from `GET /api/galleries/{id}/images/{imageId}/file` and the editor opens on
   the **original**, restoring the previous rect as the starting crop box — so
   re-cropping widens the frame rather than compounding a crop of a crop.
3. If provenance is absent or the source is gone (deleted, or a placement
   authored before this change), fall back to the placement's own bytes: fetch
   them from the deck-scoped object and crop the cropped pixels. Degraded but
   never broken.
4. Either way the result is a **new** deck-scoped upload. On save, the previous
   placement key is in `beforeKeys` and not in `afterKeys`, so `cleanupRemoved`
   deletes it — the superseded crop does not linger.

## Lifecycle & orphan handling

The deck lifecycle covers everything **once a placement is saved**. Two windows
deserve honesty:

- **Cancelled-after-crop uploads are orphaned.** The bytes are ingested before
  the author confirms the slide save, so closing the editor, hitting Escape, or
  a failed deck save leaves objects under `deck/{deckId}/` that nothing
  references. They are invisible to the user (no gallery row, no placement) and
  they are swept when the deck is deleted, but until then they cost storage.
  **Accepted for v1.** It is the same trade-off the existing adoption path
  already makes — copies happen before the save so that a failure only orphans
  deck-prefix objects — and the alternative (staging bytes somewhere and
  promoting them on save) buys a two-phase upload protocol for a leak bounded by
  how often authors abandon a crop. A future reconciliation sweep can close it:
  list `deck/{deckId}/` prefixes, diff against `DeckImages.keys(deck)`, delete
  the difference above an age threshold. **Not built.**
- **Deleting the source gallery image breaks provenance only.** The placement
  owns its own bytes, so it keeps rendering; only the "reopen the original"
  affordance degrades to flow (e)'s fallback. This is the property deck adoption
  was introduced for, and the crop path inherits it for free.

Two lifecycle details worth stating because they are easy to get wrong:

- **Key sets, not counts.** `cleanupRemoved` diffs *sets* of keys, so two slots
  in one deck sharing a key (a duplicated slide) do not delete each other's
  bytes — the key is still in `afterKeys`.
- **Cross-deck copies still adopt.** Copying a slide into another deck moves the
  key outside that deck's prefix, so ordinary adoption copies it. Provenance
  travels with the metadata and still resolves, since it names a gallery image,
  not a deck object.

## Provenance schema

Recorded on the crop's `AppImage.metadata` — already a `Map<String, Object>`
carrying `width`, `height` and `originalContentType`, and already round-tripped
by [`AppImageSerializer`](../../backend/src/main/java/com/cephadex/ambi/media/storage/AppImageSerializer.java)
/ [`AppImageDeserializer`](../../backend/src/main/java/com/cephadex/ambi/media/storage/AppImageDeserializer.java):

```json
{
  "width": 800,
  "height": 800,
  "originalContentType": "image/webp",
  "crop": {
    "sourceGalleryId": "6650a1…",
    "sourceImageId": "6650a2…",
    "x": 120,
    "y": 40,
    "width": 800,
    "height": 800
  }
}
```

- `sourceGalleryId` + `sourceImageId` address the original through the existing
  `/{id}/images/{imageId}/file` route, which enforces its own VIEW permission.
- `x`/`y`/`width`/`height` are the **source-image pixel rect** (`PixelArea`, the
  shape `getCroppedBlob` already consumes), not normalized fractions — it is the
  editor's native currency and needs no source dimensions to interpret.
- **Every key is a literal, dot-free identifier.** Mongo rejects dots in
  persisted map keys, which has bitten this codebase before; nothing here is
  user-supplied, so keep it that way.
- **Advisory and best-effort.** Nothing renders from it and nothing validates
  it. It is absent on pre-change placements, stale if the source is replaced,
  and client-supplied on echo-back — so treat a mismatch as "no provenance" and
  fall back, never as an error. Forging it grants nothing: the file route
  authorizes the read on its own.

## Non-deck picker contexts

The picker is opened from three surfaces with no deck to scope to. Findings from
the working tree:

| Surface | How it opens the picker | Crop today | v1 behaviour |
| --- | --- | --- | --- |
| **Theme editor** — [`ThemeEditor`](../../frontend/src/shared/components/Theme/ThemeModal/ThemeEditor.tsx) (line ~222) renders `GalleryPicker` **inline** (the ModalProvider hosts one dialog) for `ThemeSpec.backgroundImage` / `logoImage` | No crop props at all → Upload tab crops at the default 16:9; `cropGalleryPicks` off | Mandatory on upload; gallery picks embed as-is | **Unchanged** — crop result still becomes a gallery entry. Documented limitation. |
| **Avatar picker** — [`AvatarPicker`](../../frontend/src/shared/components/Media/AvatarPicker/AvatarPicker.tsx) reuses `GalleryTab` + `UploadTab` directly (not `GalleryPicker`), opened via [`useAvatarPicker`](../../frontend/src/shared/hooks/useAvatarPicker.tsx) from the Account page | `UploadTab` with `aspect={1}`; the Gallery tab picks straight through | Mandatory square crop on upload only | **Unchanged** — crop result still becomes a gallery entry. Documented limitation. |
| **Account → Gallery** — [`GallerySection`](../../frontend/src/features/account/views/AccountPage/GallerySection.tsx) opens [`useGalleryPicker`](../../frontend/src/shared/hooks/useGalleryPicker.tsx) with only a title, purely to add to the library (its `onPick` writes nothing) | Upload tab crops at the default 16:9 | Mandatory, and it **clips the stored image to 16:9** | **Improved for free.** The new Upload flow always ingests the *original* into the gallery, so this surface gets the uncropped image it always wanted. The crop step has no placement to serve here and should be skipped. |

Why theme and avatar keep the old behaviour rather than getting their own
scoped namespace: `ThemeSpec.backgroundImage`/`logoImage` and `Avatar.image` are
explicitly **outside** the deck adoption model — they embed the gallery
`AppImage` and share its S3 keys, so deleting the gallery image blanks them
(see [media-gallery.md](../diagrams/media-gallery.md#deletion)). Giving crops a
`theme/{themeId}/` or `user/{userId}/` namespace means first giving those
aggregates an adoption + cleanup lifecycle — a strictly larger change than this
one, on surfaces where the pollution is bounded anyway (a theme has two image
slots; a user has one avatar, changed rarely). Deck authoring is where the
duplicates multiply, so that is where the fix lands.

Consequently the picker's crop target is a **caller-supplied capability, not a
global mode**: only callers that pass a deck id get placement-only crops.

## Frontend changes summary

Spec level only — no code here.

- **`CropAndSaveStep` gains a target.** Today it hardcodes
  `useUploadImageMutation`. It takes a target instead — deck-scoped (upload to
  `POST /api/decks/{deckId}/images/upload`, return the `AppImage`) or gallery
  (today's behaviour, for the theme/avatar surfaces). Everything else about the
  step — the encode/upload guard spanning both phases, the object-URL ownership
  contract — is unchanged.
- **`GalleryPicker` / `useGalleryPicker` carry the deck id** through
  `OpenPickerOptions`, alongside the existing `cropWidth`/`cropHeight`/
  `cropAspect`/`cropGalleryPicks`. The deck-editor call sites already have it in
  scope; the three surfaces above pass nothing and keep the gallery target.
- **`UploadTab` does the dual upload** when a deck target is present: gallery
  ingest of the source file first, then hand the crop step the source plus the
  resulting `GalleryImage` id so provenance can be stamped. With no deck target
  it does exactly one ingest, as now.
- **Account → Gallery skips the crop step**, storing the original.
- **Re-crop reads provenance** — the existing "change image" affordances resolve
  `metadata.crop` before choosing which bytes to open, per flow (e), and restore
  the stored rect as the initial crop box.
- **Codegen.** The new endpoint lands in the deck API slice via
  `npm run generate`; the generated artifacts are never hand-edited.

## Out of scope

- **Content-hash dedup of identical uploads.** Uploading the same file twice
  still makes two gallery entries. Orthogonal to this change (it is about the
  *gallery* deduplicating itself, not about crops polluting it) and worth doing
  on its own terms later.
- **Adoption lifecycles for themes and avatars.** Named above; a prerequisite
  for extending placement-only crops to those surfaces.
- **Retro-active cleanup of existing crop-duplicates.** Galleries already
  contain derivative entries, and nothing distinguishes them from real uploads —
  no provenance was recorded when they were made. A future migration could
  heuristically flag candidates (identical aspect to a known slot shape,
  byte-size and creation-time proximity to another entry) and offer them for
  review, but it must never delete unattended. Not part of this change.
- **A general orphan sweeper** for the cancelled-after-crop window; see
  [Lifecycle](#lifecycle--orphan-handling).

## Implementation checklist

1. Backend: `POST /api/decks/{deckId}/images/upload` on `DeckController` →
   `DeckService` (EDIT gate) → `ImageIngestService.ingest(…, newDeckImagePrefix)`;
   tests covering the permission gate, the key prefix, and that no
   `GalleryImage` is written.
2. `npm run generate` for the new endpoint's hook.
3. Frontend: target-aware `CropAndSaveStep`; deck id threaded through
   `useGalleryPicker` → `GalleryPicker` → `UploadTab`.
4. Frontend: dual upload on the Upload tab; provenance stamping.
5. Frontend: gallery-pick-with-crop drops its gallery write.
6. Frontend: re-crop resolves provenance, with the fallback path.
7. Account → Gallery: no crop step.
8. Update [media-gallery.md](../diagrams/media-gallery.md) with the new route
   and the crop path once it lands.
