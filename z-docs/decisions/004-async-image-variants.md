# 004 — Async image-variant generation

**Status:** Accepted
**Date:** 2026-08-10

## Context

Image ingest resized every upload into five WebP renditions inline, inside the HTTP request:
Scrimage decoded the bytes, produced five sizes, and issued six S3 PUTs before the response
returned. That put seconds of CPU-bound work on a request thread, made a large upload feel broken,
and put a JVM image codec on the critical path of a user action. AVIF, which Scrimage cannot
decode, was special-cased into "no renditions at all" — a permanent quality gap.

Moving the work off the request means an image exists before its renditions do. The stored
`AppImage` carries a `variants` map, and `AppImageDeserializer` reconstructs all five canonical keys
from `srcKey` alone, so that map cannot be used as the record of what is actually in the bucket:
a copied image would inherit five keys it never owned. Something else has to answer "which of these
are real?".

## Decision

Ingest stores the original and enqueues a job; a separate worker renders the tiers and reports back.
Four calls make it up:

- **A queue and an out-of-process worker.** Ingest's only remaining work is validation, one decode
  for dimensions, and one PUT.
- **Readiness is answered at read time from a `pending_image_variants` row**, not by persisting a
  truthful variants map. A row exists only while some tier is missing and is deleted the moment the
  set is complete, so *absence of a row* means every canonical key is real. The row is written
  before the key root can be observed by any reader, which makes absence monotone — and therefore
  permanently cacheable.
- **ElasticMQ for local development**, not LocalStack's SQS.
- **Python + Pillow for the worker**, not a second JVM service, and it never touches MongoDB — it
  reads and writes S3 and reports over HTTP.

## Consequences

- Uploads return in the time of one PUT, and every format the worker can decode — AVIF included —
  gets renditions. The special case disappears.
- An image serves its untouched original for the seconds between upload and render. That is a
  visible cost (an oversized byte payload on a first view) and the deliberate trade: correct and
  bigger beats a URL that 404s.
- A permanently failed render leaves its row forever, which is why there is **no TTL index** on the
  collection — reaping a stuck row would flip the image to "all five tiers are real" and 404 every
  rendition URL. The stuck rows are the repair sweep's work list.
- Every read path has to remember to filter. Concentrating it in `ImageUrlResolver` (used by both
  hydration and the `displayKey` tier-walk) keeps that to one place, but a future read path that
  bypasses the resolver would silently regress.
- Two runtimes and a queue to operate, plus a DLQ to watch.

Details, contracts, and failure modes: [features/image-variants](../features/image-variants/README.md).

## Alternatives considered

- **Persist a truthful variants map and keep readers naive.** Rejected: `AppImage` is an *embedded*
  value copied between deck, slide, theme, and gallery documents. A tier landing later would have to
  find and update every copy, and the deserializer would have to stop reconstructing canonical keys —
  which is the thing that stops clients persisting expiring presigned URLs.
- **A TTL index on the pending rows.** Rejected for the reason above: expiry means "all ready", and
  a permanently failed image would go from serving its original to serving 404s.
- **Keep generating inline but off the request thread** (`@Async` in the same JVM). Rejected: it
  moves the latency but keeps the image codec, the CPU burst, and the AVIF gap inside the API
  process, and gives no redelivery or dead-letter story when a render dies.
- **LocalStack SQS for local dev.** Rejected: queue features sit behind the Pro license, whereas
  ElasticMQ is a purpose-built SQS implementation with real dead-letter and redrive behaviour.
  LocalStack stays in the stack for CloudWatch/logs.
- **A JVM worker.** Rejected: it would reintroduce the Scrimage/AVIF decode gap that motivated the
  change, where Pillow decodes AVIF, GIF, PNG, JPEG, and WebP out of the box.
- **Give the worker MongoDB access** so it could close its own rows. Rejected: it would make an
  external process a writer of our domain state. The HTTP callback keeps the schema on one side of
  the boundary and gives the row exactly one writer.
