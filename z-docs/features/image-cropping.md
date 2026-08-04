# Image Cropping — Placement-Only Crops

**Status:** implementation in progress. **Specified:** 2026-08-04.

Cropping an image for a slide slot must stop minting gallery entries. **The
gallery holds originals; a crop is placement data owned by the deck**, uploaded
into the deck's own S3 namespace and freed by the deck's existing image
lifecycle.

Storage, ingest, presigning and the deck adoption model this builds on are
documented in [diagrams/media-gallery.md](../diagrams/media-gallery.md); this
doc covers only what changes.

## Problem

Cropping is entirely client-side. [`ImageCropEditor`](../../frontend/src/shared/components/Media/GalleryPicker/ImageCropEditor.tsx)
picks a pixel rect, [`getCroppedBlob`](../../frontend/src/shared/utils/imageEditing.ts)
rasterizes it on a canvas, and [`CropAndSaveStep`](../../frontend/src/shared/components/Media/GalleryPicker/CropAndSaveStep.tsx)
posts the result through the ordinary gallery upload route, so **every crop
mints a new `GalleryImage`, indistinguishable from a fresh upload**.

It is not an edge case. The Upload tab crops **mandatorily** — every file and
every pasted URL passes through the crop step, so the gallery never receives
the original at all — and slots whose shape is load-bearing pass
`cropGalleryPicks`, routing *gallery* picks through the same step and producing
a second entry derived from one the user already has. A ten-option MCQ built
from one gallery image therefore leaves eleven gallery entries. Nothing in the
model distinguishes them: [`AppImage`](../../backend/src/main/java/com/cephadex/ambi/media/AppImage.java)
records no provenance, and there is no reference counting anywhere.

## Decision — placement-only crops

A crop is not a library item; it is the bytes one slot displays.

1. **Crops never create gallery entries.** The gallery holds originals only.
2. **Crop bytes are uploaded deck-scoped.** A new endpoint ingests the cropped file (original + the five WebP tiers) directly under a `deck/{deckId}/{uuid}` prefix and returns an `AppImage` **without creating any `GalleryImage`**.
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

## New API surface

```text
POST /api/decks/{deckId}/images/upload
  consumes: multipart/form-data
  parts:    file        (required)  the cropped image bytes
  params:   altText     (optional)  stamped onto the returned AppImage
  returns:  200 AppImage (presigned URLs, as every image read)
```

- Authorization is **deck EDIT** — `DeckService.getEditable(deckId, principal)`, the same gate as every other deck mutation. The failure modes are the existing `DECK_NOT_FOUND` / `DECK_EDIT_FORBIDDEN` / `VALIDATION_FAILED`; any genuinely new condition needs its row in [`error-codes.md`](../rules/error-codes.md) in the same commit.
- Bytes go through `ImageIngestService.ingest(bytes, contentType, filename, prefix)` — the prefix-parameterized overload live-session drawings already use — with `prefix = ImageKeys.newDeckImagePrefix(deckId)`. Same content-type allow-list, same size cap, same five WebP tiers.
- **No `GalleryImage` is created and no `Gallery` is touched.** That is the whole point: the same ingest, a different owner.
- The response is a bare `AppImage`, not a wrapper — there is no library row to describe.
- It lives on `DeckController` because the deck id is both the authorization subject and the key namespace. Unlike the raw-bytes routes it returns typed JSON, so it is **not** `@Hidden` — it belongs in OpenAPI and gets a generated RTK Query hook.

`ImageKeys`, `ImageIngestService`, `DeckImages` and `DeckImageLifecycleService`
are used as they stand.

## Flows

**(a) Upload tab, new file.** The original is posted to
`POST /api/galleries/{id}/images/upload` first, producing one `GalleryImage`
holding the *uncropped* file — the only gallery write in the flow. The crop
editor then opens at the slot's aspect; `getCroppedBlob` rasterizes the rect and
posts it to the deck route. Provenance (source `GalleryImage` id + pixel rect)
is stamped client-side onto the returned image. Ordering is deliberate: the
gallery upload runs first so provenance can name a real id, and a failure there
stops the flow without losing the author's framing.

**(b) Upload tab, pasted URL.** Identical to (a) with one hop in front:
`fetchRemoteImage` proxies the URL through the SSRF-guarded
`GET /api/media/remote-image`. A pasted URL is stored as owned bytes, never
kept as a fragile external reference.

**(c) Gallery pick on a cropping slot.** The original bytes are fetched
same-origin via `GET /api/galleries/{id}/images/{imageId}/file` (the presigned
URL is cross-origin and would taint the canvas; the remote-image proxy rejects
the storage endpoint by design). One deck-scoped upload, **no gallery write at
all** — the original is already in the library. Ten options cropped from one
gallery image now leave one gallery entry, not eleven.

**(d) Gallery pick on a non-cropping slot.** Unchanged — the `AppImage` is
embedded as-is and copy-on-select adoption copies the objects into
`deck/{deckId}/{uuid}` on save.

**(e) Re-crop.** The editor reads `metadata.crop`. If it names a gallery image
the caller can still read, the source bytes come from the file route and the
editor opens on the **original** with the previous rect restored — so
re-cropping widens the frame rather than compounding a crop of a crop. If
provenance is absent or the source is gone, it falls back to the placement's
own bytes: degraded but never broken. Either way the result is a new
deck-scoped upload, and the superseded key is absent from `afterKeys` so
`cleanupRemoved` deletes it.

## Lifecycle & orphan handling

- **Cancelled-after-crop uploads are orphaned.** Bytes are ingested before the author confirms the slide save, so closing the editor or a failed deck save leaves unreferenced objects under `deck/{deckId}/`. They are invisible to the user and swept when the deck is deleted, but until then they cost storage. **Accepted for v1** — the same trade-off the existing adoption path makes, and the alternative is a two-phase upload protocol for a leak bounded by how often authors abandon a crop. A future reconciliation sweep (list the prefix, diff against `DeckImages.keys(deck)`, delete above an age threshold) can close it. Not built.
- **Deleting the source gallery image breaks provenance only.** The placement owns its own bytes and keeps rendering; only the "reopen the original" affordance degrades to flow (e)'s fallback.
- **Key sets, not counts.** `cleanupRemoved` diffs *sets* of keys, so two slots in one deck sharing a key (a duplicated slide) do not delete each other's bytes.
- **Cross-deck copies still adopt.** Copying a slide into another deck moves the key outside that deck's prefix, so ordinary adoption copies it. Provenance travels with the metadata and still resolves, since it names a gallery image, not a deck object.

## Provenance schema

Recorded on the crop's `AppImage.metadata` — already a `Map<String, Object>`
carrying `width`, `height` and `originalContentType`, round-tripped by
`AppImageSerializer`/`AppImageDeserializer`:

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
- **Advisory and best-effort.** Nothing renders from it and nothing validates it. It is absent on pre-change placements, stale if the source is replaced, and client-supplied on echo-back — treat a mismatch as "no provenance" and fall back, never as an error. Forging it grants nothing: the file route authorizes the read on its own.

## GalleryPicker crop options

The shared `useGalleryPicker` → `GalleryPicker` → `UploadTab` →
`ImageCropEditor` chain exposes three independent knobs to a caller:

- **`cropWidth` / `cropHeight`** — fixes the Upload tab's crop box to that ratio (default 16:9 when a caller gives neither). Slots that render onto a square surface — the slide-option and item thumbnails, Place-on-Image's backing image, Drawing's prompt and answer images — pass `1, 1`.
- **`cropGalleryPicks`** — without it, a Gallery-tab pick is inserted as-is, so an existing image's own shape can land in a fixed-shape slot. With it, every Gallery-tab pick is routed through the crop editor first. Under this design that crop becomes deck-scoped bytes rather than a new gallery entry.
- **`cropAspect: "source"`** — the crop box takes the uploaded image's own aspect ratio instead, learned via `react-easy-crop`'s `onMediaLoaded`, so at zoom 1 the whole image is kept and nothing is clipped unless the author zooms in deliberately. It is what a caller with **no fixed frame to fill** passes; callers whose slot has a load-bearing shape use `cropWidth`/`cropHeight` instead.

## Non-deck picker contexts

The picker is opened from three surfaces with no deck to scope to. All three
keep the old behaviour — their crop still becomes a gallery entry:

| Surface | How it opens the picker | v1 behaviour |
|---|---|---|
| **Theme editor** — `ThemeEditor` renders `GalleryPicker` inline for `ThemeSpec.backgroundImage` / `logoImage` | no crop props → 16:9 upload crop, `cropGalleryPicks` off | Unchanged; documented limitation |
| **Avatar picker** — `AvatarPicker` reuses `GalleryTab` + `UploadTab` directly, via `useAvatarPicker` from the Account page | `UploadTab` with `aspect={1}`; gallery picks pass straight through | Unchanged; documented limitation |
| **Account → Gallery** — `GallerySection` opens `useGalleryPicker` purely to add to the library | 16:9 upload crop that **clips the stored image** | **Improved for free** — the new Upload flow ingests the original, and the crop step has no placement to serve here, so it is skipped |

`ThemeSpec.backgroundImage`/`logoImage` and `Avatar.image` sit **outside** the
deck adoption model — they embed the gallery `AppImage` and share its S3 keys.
Giving their crops a scoped namespace means first giving those aggregates an
adoption + cleanup lifecycle, a strictly larger change on surfaces where the
pollution is bounded anyway. The picker's crop target is therefore a
**caller-supplied capability, not a global mode**: only callers that pass a
deck id get placement-only crops.

## Frontend changes

- **`CropAndSaveStep` gains a target** instead of hardcoding `useUploadImageMutation` — deck-scoped or gallery. The encode/upload guard spanning both phases and the object-URL ownership contract are unchanged.
- **`GalleryPicker` / `useGalleryPicker` carry the deck id** through `OpenPickerOptions`, alongside the existing crop knobs. The three surfaces above pass nothing and keep the gallery target.
- **`UploadTab` does the dual upload** when a deck target is present: gallery ingest of the source file first, then hand the crop step the source plus the resulting `GalleryImage` id so provenance can be stamped. With no deck target it does exactly one ingest.
- **Account → Gallery skips the crop step**, storing the original.
- **Re-crop reads provenance** before choosing which bytes to open, per flow (e).
- **Codegen.** The new endpoint lands in the deck API slice via `npm run generate`; generated artifacts are never hand-edited.

## Out of scope

- **Content-hash dedup of identical uploads** — orthogonal (it is about the gallery deduplicating itself, not about crops polluting it).
- **Adoption lifecycles for themes and avatars** — a prerequisite for extending placement-only crops to those surfaces.
- **A general orphan sweeper** for the cancelled-after-crop window; see [Lifecycle](#lifecycle--orphan-handling).

When this lands, fold the new route and the crop path into
[media-gallery.md](../diagrams/media-gallery.md).
