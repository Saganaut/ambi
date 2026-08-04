# Image Cropping — Placement-Only Crops

**Status:** shipped. **Specified:** 2026-08-04. **Implemented:** 2026-08-04
(backend 826140dc, frontend 3a6cda3a).

Cropping an image for a slide slot no longer mints gallery entries. **The
gallery holds originals; a crop is placement data owned by the deck**, uploaded
into the deck's own S3 namespace and freed by the deck's existing image
lifecycle.

Storage, ingest, presigning and the deck adoption model this builds on are
documented in [diagrams/media-gallery.md](../diagrams/media-gallery.md); this
doc covers only what changed.

## Problem

Cropping used to be entirely client-side. [`ImageCropEditor`](../../frontend/src/shared/components/Media/GalleryPicker/ImageCropEditor.tsx)
picked a pixel rect, [`getCroppedBlob`](../../frontend/src/shared/utils/imageEditing.ts)
rasterized it on a canvas, and [`CropAndSaveStep`](../../frontend/src/shared/components/Media/GalleryPicker/CropAndSaveStep.tsx)
posted the result through the ordinary gallery upload route, so **every crop
minted a new `GalleryImage`, indistinguishable from a fresh upload**.

It was not an edge case. The Upload tab cropped **mandatorily** — every file
and every pasted URL passed through the crop step, so the gallery never
received the original at all — and slots whose shape was load-bearing passed
`cropGalleryPicks`, routing *gallery* picks through the same step and
producing a second entry derived from one the user already had. A ten-option
MCQ built from one gallery image therefore left eleven gallery entries.
Nothing in the model distinguished them: [`AppImage`](../../backend/src/main/java/com/cephadex/ambi/media/AppImage.java)
recorded no provenance, and there was no reference counting anywhere.

## Decision — placement-only crops

A crop is not a library item; it is the bytes one slot displays.

1. **Crops never create gallery entries.** The gallery holds originals only.
2. **Crop bytes are uploaded deck-scoped.** An endpoint ingests the cropped file (original + the five WebP tiers) directly under a `deck/{deckId}/{uuid}` prefix and returns an `AppImage` **without creating any `GalleryImage`**.
3. **The deck already owns it, so the existing lifecycle applies unchanged.** [`DeckImageLifecycleService.adoptImage`](../../backend/src/main/java/com/cephadex/ambi/presentation/deck/DeckImageLifecycleService.java) skips keys already under `deck/{deckId}/` (`ImageKeys.isOwnedByDeck`), so no copy happens; `cleanupRemoved` frees the objects when the slot is cleared or replaced; `deleteAllImages` sweeps them when the deck is deleted.
4. **The Upload tab still enriches the gallery** — with the *original*. One genuinely new image, one gallery entry.
5. **Provenance is recorded on the crop's `AppImage.metadata`** so re-cropping reopens the editor on the original rather than on already-cropped pixels.

This reuses an ownership model that already exists — deck adoption solved "the
deck's bytes must outlive the gallery image", and a deck-scoped crop is simply
an image born on the far side of that boundary. No new lifecycle, no reference
counting, no new sweeper, and no change to any render surface, since the stored
bytes *are* the crop.

Two alternatives were rejected. **A render-time crop rect on `AppImage`** would
break the pre-generated WebP variants (whole-image renditions that would no
longer match the displayed crop) and force rect-aware logic into every render
surface, including CSS `background-image` slots that cannot express a rect at
all. **Derived-but-hidden gallery entries** would still accumulate unbounded
rows and S3 objects per deck edit, and hiding them creates a new orphan problem
needing exactly the reference counting this design avoids.

## API surface

```text
POST /api/decks/{deckId}/images/upload
  consumes: multipart/form-data
  parts:    file        (required)  the cropped image bytes
  params:   altText     (optional)  stamped onto the returned AppImage
  returns:  201 AppImage (presigned URLs, as every image read)
```

- Authorization is **deck EDIT** — `DeckService.getEditable(deckId, principal)`, the same gate as every other deck mutation. The failure modes are the existing `DECK_NOT_FOUND` / `DECK_EDIT_FORBIDDEN` / `VALIDATION_FAILED`; any genuinely new condition needs its row in [`error-codes.md`](../rules/error-codes.md) in the same commit.
- Bytes go through `ImageIngestService.ingest(bytes, contentType, filename, prefix)` — the prefix-parameterized overload live-session drawings already use — with `prefix = ImageKeys.newDeckImagePrefix(deckId)`. Same content-type allow-list, same size cap, same five WebP tiers.
- **No `GalleryImage` is created and no `Gallery` is touched.** That is the whole point: the same ingest, a different owner.
- The response is a bare `AppImage`, not a wrapper — there is no library row to describe.
- It lives on `DeckController` (`DeckController.uploadDeckImage`) because the deck id is both the authorization subject and the key namespace. Unlike the raw-bytes routes it returns typed JSON, so it is **not** `@Hidden` — it is in OpenAPI, and the frontend consumes it through the generated `useUploadDeckImageMutation` hook.

`ImageKeys`, `ImageIngestService`, `DeckImages` and `DeckImageLifecycleService`
are used as they stand.

## Flows

**(a) Upload tab, new file.** The crop editor opens immediately on the local
object URL — no network call yet. When the author confirms a crop, the
original is posted to `POST /api/galleries/{id}/images/upload` first,
producing one `GalleryImage` holding the *uncropped* file — the only gallery
write in the flow. `getCroppedBlob` then rasterizes the confirmed rect and
posts it to the deck route. Provenance (source `GalleryImage` id + pixel rect)
is stamped client-side onto the returned image via `withCropProvenance`.
Ordering is deliberate: the gallery upload runs first so provenance can name a
real id, and a failure there stops the flow without losing the author's
framing. The gallery write is cached per source (`UploadTab`'s
`storedOriginal` ref), so confirming, cancelling back to "Use original", and
confirming again never stores the same original twice.

**(b) Upload tab, pasted URL.** Identical to (a) with one hop in front:
`fetchRemoteImage` proxies the URL through the SSRF-guarded
`GET /api/media/remote-image`. A pasted URL is stored as owned bytes, never
kept as a fragile external reference.

**(c) Gallery pick on a cropping slot.** Whether a Gallery-tab pick goes
through the crop editor depends on the slot's `crop.mode` (see
[GalleryPicker crop options](#gallerypicker-crop-options) below): `"required"`
routes every pick through it automatically; `"optional"` leaves Insert as a
direct pick and adds a second "Crop & insert" action that opts in. Either way,
the original bytes are fetched same-origin via
`GET /api/galleries/{id}/images/{imageId}/file` (the presigned URL is
cross-origin and would taint the canvas; the remote-image proxy rejects the
storage endpoint by design). One deck-scoped upload, **no gallery write at
all** — the original is already in the library. Ten options cropped from one
gallery image now leave one gallery entry, not eleven.

**(d) Gallery pick on a non-cropping slot.** Unchanged — the `AppImage` is
embedded as-is and copy-on-select adoption copies the objects into
`deck/{deckId}/{uuid}` on save.

**(e) Re-crop ("Adjust crop").** The picker reads `metadata.crop` off the
slot's `current` image. The action only appears when the slot's crop mode
isn't `"off"` **and** the picker can resolve a same-origin source for it:
either the provenance names a gallery image (fetched via the `/file` route
and reopened on the **original** with the previous rect restored, so
re-cropping widens the frame rather than compounding a crop of a crop), or —
for a placement holding an external image with no crop provenance at all —
the image is external and its bytes come from the remote-image proxy instead,
letting the author frame it for the first time. **This is a deliberate
deviation from this doc's original design**, which planned a "falls back to
the placement's own bytes" degraded mode for when provenance is absent or
stale. There is no same-origin read for a bare `deck/{deckId}/…` object — the
only same-origin byte routes are the gallery `/file` route and the
remote-image proxy — so a placement with neither provenance nor an external
source (a plain gallery pick, or an upload made with crop mode `"off"`) has no
"Adjust crop" action at all, rather than a working button that reopens
already-cropped pixels. Either way the result is a new deck-scoped upload, and
the superseded key is absent from `afterKeys` so `cleanupRemoved` deletes it.

## Lifecycle & orphan handling

- **Cancelled-after-crop uploads are orphaned.** Bytes are ingested before the author confirms the slide save, so closing the editor or a failed deck save leaves unreferenced objects under `deck/{deckId}/`. They are invisible to the user and swept when the deck is deleted, but until then they cost storage. **Accepted for v1** — the same trade-off the existing adoption path makes, and the alternative is a two-phase upload protocol for a leak bounded by how often authors abandon a crop. A future reconciliation sweep (list the prefix, diff against `DeckImages.keys(deck)`, delete above an age threshold) can close it. Not built.
- **Deleting the source gallery image breaks provenance only.** The placement owns its own bytes and keeps rendering; only the "Adjust crop" affordance disappears, per flow (e).
- **Key sets, not counts.** `cleanupRemoved` diffs *sets* of keys, so two slots in one deck sharing a key (a duplicated slide) do not delete each other's bytes.
- **Cross-deck copies still adopt.** Copying a slide into another deck moves the key outside that deck's prefix, so ordinary adoption copies it. Provenance travels with the metadata and still resolves, since it names a gallery image, not a deck object.

## Provenance schema

Recorded on the crop's `AppImage.metadata` — already a `Map<String, Object>`
carrying `width`, `height` and `originalContentType`, round-tripped by
`AppImageSerializer`/`AppImageDeserializer`. The frontend reads and writes it
through `withCropProvenance`/`readCropProvenance` in
[`imageEditing.ts`](../../frontend/src/shared/utils/imageEditing.ts):

```json
{
  "crop": {
    "sourceGalleryId": "6650a1…",
    "sourceImageId": "6650a2…",
    "x": 120, "y": 40, "width": 800, "height": 800
  }
}
```

- `sourceGalleryId` + `sourceImageId` address the original through the existing `/{id}/images/{imageId}/file` route, which enforces its own VIEW permission.
- `x`/`y`/`width`/`height` are the **source-image pixel rect** (`PixelArea`, the shape `getCroppedBlob` already consumes), not normalized fractions.
- **Every key is a literal, dot-free identifier.** Mongo rejects dots in persisted map keys, which has bitten this codebase before.
- **Advisory and best-effort.** Nothing renders from it and nothing validates it. It is absent on pre-change placements, stale if the source is replaced, and client-supplied on echo-back — a mismatch or malformed value reads back as "no provenance" (`readCropProvenance` returns `null`), never an error. Forging it grants nothing: the file route authorizes the read on its own.

## GalleryPicker crop options

`useGalleryPicker(deckId)` → `GalleryPicker` → `UploadTab` / `GalleryTab` →
`ImageCropEditor` is the shared chain every image slot opens through. A caller
gets two independent knobs, both defined in
[`cropConfig.ts`](../../frontend/src/shared/components/Media/GalleryPicker/cropConfig.ts):

- **`crop.mode`** — `"off"`, `"optional"` (the default) or `"required"`.
  - `"off"`: no crop step anywhere. An upload stores the original as the pick; a Gallery-tab pick is inserted as-is.
  - `"optional"`: cropping is offered, never forced. The Gallery tab keeps Insert (direct pick) and adds "Crop & insert"; the Upload tab's crop step carries a "Use original" escape that stores the uncropped file instead.
  - `"required"`: the slot's shape is load-bearing (square option/item thumbnails, avatars, Drawing's prompt/answer images, Place-on-Image's backing image), so every pick — upload or gallery — passes through the crop editor with no way past it.
- **`crop.aspect`** — a `width / height` ratio, or `"source"` to keep the uploaded image's own aspect (learned via `react-easy-crop`'s `onMediaLoaded`, so at zoom 1 the whole image is kept and nothing is clipped unless the author zooms in deliberately). Callers with a load-bearing shape pass a fixed ratio (`1` for square slots, `16 / 9` for widescreen ones); callers with no fixed frame to fill — a slide cover image — pass `"source"`. Omitting `crop` entirely defaults to `{ mode: "optional", aspect: 16 / 9 }`.

The crop **target** is not part of this config — it is the `deckId` the
picker was opened with (`useGalleryPicker(deckId)`), because it is a property
of the surface, not of the slot. Every deck-editor image slot binds it once
where the hook is called; surfaces with no deck (the theme editor, the avatar
picker, Account → Gallery) omit it, and their crops keep landing in the
gallery as before. `OpenPickerOptions.current` — the `AppImage` the slot
already holds, if any — prefills the Upload tab's paste-URL field for an
external reference and, when it carries crop provenance, unlocks flow (e)'s
"Adjust crop" action; it replaces the old standalone `initialUrl` prop.

## Non-deck picker contexts

The picker is opened from three surfaces with no deck to scope to. All three
keep the old behaviour — their crop still becomes a gallery entry:

| Surface | How it opens the picker | Behaviour |
|---|---|---|
| **Theme editor** — `ThemeEditor` renders `GalleryPicker` inline for `ThemeSpec.backgroundImage` / `logoImage` | no `crop` prop → default `{ mode: "optional", aspect: 16/9 }`, no `deckId` | Unchanged; documented limitation |
| **Avatar picker** — `AvatarPicker` reuses `GalleryTab` + `UploadTab` directly, via `useAvatarPicker` from the Account page | `UploadTab` with `crop={{ mode: "required", aspect: 1 }}`, no `deckId`; gallery picks pass straight through (`GalleryTab` alone has no crop step) | Unchanged; documented limitation |
| **Account → Gallery** — `GallerySection` opens `useGalleryPicker()` (no deck id) purely to add to the library | `crop: { mode: "off" }` | **Improved** — the upload flow stores the original untouched; there is no placement to crop for, so the step is skipped entirely rather than clipping the stored image |

`ThemeSpec.backgroundImage`/`logoImage` and `Avatar.image` sit **outside** the
deck adoption model — they embed the gallery `AppImage` and share its S3 keys.
Giving their crops a scoped namespace means first giving those aggregates an
adoption + cleanup lifecycle, a strictly larger change on surfaces where the
pollution is bounded anyway. The picker's crop target is therefore a
**caller-supplied capability, not a global mode**: only callers that pass a
deck id get placement-only crops.

## Frontend changes

- **One `crop={{ mode, aspect }}` config replaces the old scatter of `cropWidth` / `cropHeight` / `cropAspect` / `cropGalleryPicks` props.** See [GalleryPicker crop options](#gallerypicker-crop-options).
- **`GalleryPicker` / `useGalleryPicker` carry the deck id** through `useGalleryPicker(deckId)`, alongside `OpenPickerOptions.current` and `crop`. The three non-deck surfaces pass no deck id and keep the gallery target.
- **`CropAndSaveStep` takes a target** (`deckId` or `galleryId`) instead of hardcoding `useUploadImageMutation`, dispatching to `useUploadDeckImageMutation` when a deck is present. The encode/upload guard spanning both phases and the object-URL ownership contract are unchanged.
- **`UploadTab` does the dual upload** when a deck target is present: on confirm, it stores the source file to the gallery first (cached, so it is never stored twice), then hands the crop step's upload the deck target so provenance can be stamped. With no deck target it does exactly one ingest, into the gallery.
- **Account → Gallery skips the crop step** (`crop.mode = "off"`), storing the original.
- **`GalleryPicker`'s "Adjust crop" reads provenance** before choosing which bytes to open, per flow (e), and is hidden rather than degraded when no same-origin source resolves.
- **`useAsyncAction`** (`frontend/src/shared/hooks/useAsyncAction.ts`) backs the picker's several async flows (crop upload, re-crop fetch, use-original) with a re-entrancy guard against double-click/keyboard-activation races that a plain `useState` busy flag can't provide, since it only reaches the DOM a render later.
- **Codegen.** The new endpoint's generated hook (`useUploadDeckImageMutation`) lives in the deck API slice, produced by `npm run generate`; generated artifacts are never hand-edited.

## Out of scope

- **Content-hash dedup of identical uploads** — orthogonal (it is about the gallery deduplicating itself, not about crops polluting it).
- **Adoption lifecycles for themes and avatars** — a prerequisite for extending placement-only crops to those surfaces.
- **A general orphan sweeper** for the cancelled-after-crop window; see [Lifecycle](#lifecycle--orphan-handling).

See [diagrams/media-gallery.md](../diagrams/media-gallery.md#placement-only-ingest)
for how the new route and the crop path fit into the ingest/adoption pipeline.
