# Image Variants

How an uploaded image gets its five WebP renditions, and how reads stay honest while it doesn't
have them yet. The decision and its alternatives are in
[ADR 004](../../decisions/004-async-image-variants.md); the surrounding media pipeline (keys,
presigning, deletion, deck adoption) is in [diagrams/media-gallery](../../diagrams/media-gallery.md).

Backend code: `media/variants/`. Worker: `worker/`.

## The problem this solves

A stored `AppImage` carries a `variants` map of tier → S3 key, and `AppImageDeserializer` rebuilds
all five canonical keys from `srcKey` alone — so a client can never persist an expiring presigned
URL. That means the map is a **key layout, not an inventory**: it says where each rendition would
live, not that any of them exists. With generation moved off the request, something has to tell a
reader which of those keys are real, and it cannot be the map itself (an `AppImage` is embedded and
copied between deck, slide, theme, and gallery documents — there is no one place to update when a
tier lands).

## The pending-set model

```text
pending_image_variants   _id = keyRoot          gallery/{uuid} · deck/{deckId}/{uuid} · drawing/…/{uuid}
                         requested_tiers        what was enqueued
                         ready_tiers            unioned by the worker callback
                         content_type · terminal · attempts · created_at · updated_at
```

A row exists **only while some tier is missing**, and is deleted the moment `ready_tiers` covers
`requested_tiers`. So:

- **Row present** → only `ready_tiers` are real; every other tier is filtered out before presigning.
- **No row** → every canonical tier is real. True for a legacy image, a completed one, and a
  fully-copied deck adoption alike.

### Absence is permanent

The row is written **before** its key root can be observed by any reader. Both minting sites order
it that way: `ImageIngestService.ingest` opens the row before the original's PUT, and
`DeckImageLifecycleService.adoptImage` opens it before the rewritten `AppImage` escapes. So "no row"
can never later become "some tier is missing" — the answer is monotone, which is what lets
`ImageVariantReadiness` cache absence forever and re-read only the pending answers
(`ambi.media.variants.pending-cache-ttl`, default 10s; the instance that handles a completion
callback invalidates its own entry immediately).

Two consequences worth stating outright:

- **There is no TTL index on the collection**, and there must not be. Expiring a permanently failed
  row would flip its image from "the original is all we have" to "all five tiers are real", and
  every rendition URL would 404.
- **Opening the row is fatal to an upload; failing to enqueue the job is not.** A lost job leaves
  the image serving its original until a repair sweep re-publishes. A lost row would advertise five
  renditions that do not exist. `ambi.media.variants.enabled=false` gates the enqueue only, never
  the row.

## Read filtering

`ImageUrlResolver` drops unready tiers in one private helper, used by `hydrate` (the serializer
path, so every JSON response) and by `displayKey` — and therefore `displayUrl`. `displayKey` matters
independently: it feeds `OpaqueImageUrls` and the live-session board views, which never run the
`AppImage` serializer. When no tier survives the filter, the untouched original is the rendition:
larger than the caller asked for, but always present.

```mermaid
sequenceDiagram
    autonumber
    participant IS as ImageIngestService
    participant M as MongoDB
    participant S3 as Garage/S3
    participant Q as Queue
    participant W as Worker
    participant IC as InternalImageVariantController

    IS->>IS: validate + decode (dimensions; AVIF skips)
    IS->>M: openPending(keyRoot, all tiers, contentType)
    IS->>S3: put {keyRoot}/original
    IS->>Q: ImageVariantJobMessage (failure → WARN, row stays)
    Note over IS: returns the canonical variants map immediately
    W->>Q: receive
    W->>S3: get original → render → put {keyRoot}/{tier}.webp
    W->>IC: POST /api/internal/image-variants (readyTiers)
    IC->>M: union ready_tiers; delete the row once complete
```

## Contracts

### Job message (queue body, JSON)

`ImageVariantJobMessage`, schema `version: 1` — the worker rejects anything else rather than
guessing. Field names are the wire format; renaming one breaks both sides.

```json
{ "version": 1,
  "keyRoot": "gallery/9f2c…",
  "srcKey": "gallery/9f2c…/original",
  "bucket": "ambi-images",
  "contentType": "image/jpeg",
  "tiers": [{"tier":"XS","maxEdge":64},{"tier":"SM","maxEdge":200},
            {"tier":"MD","maxEdge":480},{"tier":"LG","maxEdge":960},
            {"tier":"XL","maxEdge":1600}],
  "requestedAt": "2026-08-10T12:00:00Z" }
```

Two deliberate omissions. **Variant keys** are absent: the worker derives
`{keyRoot}/{tier-lowercase}.webp`, the same rule `ImageKeys` applies here, and a test on each side
pins that string. **Bounds travel in the message** so `ambi.media.variants.tier-bounds` stays the
only place they exist — the worker holds no copy. There is no callback URL (worker config owns it)
and no attempt counter (the worker reads its own delivery count).

### Completion callback

`POST /api/internal/image-variants`, header `X-Ambi-Worker-Secret`, body
`{ "keyRoot": …, "readyTiers": ["XS","SM"], "terminal": false, "attempt": 1 }` → `204`.

| Outcome | Response |
| --- | --- |
| Applied | `204` |
| Unknown key root (row already completed and deleted) | `204` — redelivery is normal, not an error |
| Missing or wrong secret | `401 WORKER_AUTH_FAILED` |
| Malformed body | `400 VALIDATION_FAILED` |

**Ordering invariant the worker owns:** every variant object is PUT *before* the callback that names
its tier. Reports union rather than replace, so a partial or redelivered report never retracts a
tier.

The route sits under `/api/internal/**` rather than `/api/<feature-plural>` so `SecurityConfig` can
permit and CSRF-exempt every machine-to-machine route with one matcher; it is `@Hidden`, so no
client hook is generated for a route no browser may call. Authorization is the shared secret alone
(`WorkerCallbackAuthenticator`, constant-time compare, refuses to start on an unset or
shorter-than-32-character `ambi.media.variants.callback-secret`) — a background worker has no
session.

## Failure modes

| What fails | What happens |
| --- | --- |
| Enqueue (queue down) | Upload succeeds; row stays pending; image serves its original until a repair sweep re-publishes |
| Row write (Mongo down) | Upload fails before the PUT — nothing is stored and nothing is advertised |
| Worker cannot decode | Reports `readyTiers: []`, `terminal: true`; the row persists forever and the original serves forever |
| Worker dies mid-render | Message is redelivered; already-stored tiers are re-reported harmlessly |
| Callback lost | Row stays pending, tiers stay hidden even though the objects exist; the repair sweep re-publishes and the re-report closes it |
| Adoption copy comes up short | Only the tiers that copied are recorded; the rest open a row and a job under the new prefix |
| Source original missing on adoption | Row is opened (tiers stay hidden) but no job is published — there is nothing to render from |

Deleting an image's objects drops its row too, best-effort (`ImageVariantCleanup`), from every
delete site: gallery image and gallery delete, deck placement removal, deck delete, and a replaced
live-session drawing. A leaked row is harmless in itself — nothing can read the image it describes —
but it would give a repair sweep work to do for bytes that are gone.

## AWS mapping

ElasticMQ is the local stand-in for SQS and speaks the same wire protocol, so the producer changes
nothing between environments beyond `ambi.sqs.endpoint`. The worker ships as one image with two
entry points: a long-polling loop for the compose stack, and an SQS-event handler for Lambda. On
Lambda the endpoint overrides are simply unset and boto3 resolves real AWS; credentials fall back to
the execution role. The dead-letter queue and its redrive procedure are the operational surface —
see [running-the-project](../../runbooks/running-the-project.md).
