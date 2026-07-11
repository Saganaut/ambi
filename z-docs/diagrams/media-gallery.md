# Media & Gallery

Image ingest, storage, and delivery. Originals plus five WebP renditions are
stored in Garage/S3 under a content-addressed prefix; MongoDB holds only S3
keys, and reads are hydrated into short-lived presigned URLs.

Key classes: `GalleryController`, `RemoteImageController`, `GalleryService`,
`ImageIngestService`, `S3StorageService`, `S3Config`, `ImageUrlResolver`,
`AppImageDeserializer`, `RemoteImageService`. Data shapes:
[Domain Model — Media](domain-model.md#media). Infra:
[infrastructure.md](../infrastructure/infrastructure.md).

## Upload & rendition pipeline

```mermaid
sequenceDiagram
    autonumber
    participant U as Author
    participant GC as GalleryController
    participant IS as ImageIngestService
    participant S3 as S3StorageService → Garage/S3
    participant GS as GalleryService
    participant M as MongoDB

    U->>GC: POST /api/galleries/{id}/images/upload (multipart, EDIT)
    GC->>IS: ingest(bytes, contentType, filename)
    IS->>IS: validate content-type + size cap
    IS->>IS: mint prefix gallery/{uuid}
    IS->>S3: put gallery/{uuid}/original
    loop tiers xs·sm·md·lg·xl (bounding-box, no upscale)
        IS->>IS: Scrimage resize → WebP
        IS->>S3: put gallery/{uuid}/{tier}.webp
    end
    Note over IS: AVIF stored as-is (no variants)
    IS-->>GC: AppImage (srcKey + variants map + metadata)
    GC->>GS: addImage (EDIT permission)
    GS->>M: save GalleryImage (embeds AppImage)
    GS-->>U: GalleryImage (keys hydrated → presigned URLs)
```

`ImageIngestService.ingest` also has a prefix-parameterized overload used by
non-gallery flows that need their own key namespace and ownership scoping:
live-session [Drawing](../features/drawing-slide/README.md#live-session--draw-and-submit)
answer uploads key their objects under `drawing/{sessionId}/{participantId}/{uuid}`
(sibling to `gallery/{uuid}`, minted by `LiveSessionAnswerService.storeDrawing`)
so answer validation can check a submitted image is one this participant
uploaded through this session, and a resubmit's delete can target exactly its
own objects. The 3-arg overload (gallery uploads, shown above) is just this
one with the prefix defaulted to `gallery/` + a fresh UUID.

## Read hydration — keys to presigned URLs

The S3 key is the source of truth; URLs are never persisted. On read, keys are
rewritten to presigned GET URLs (cached in Caffeine until near expiry). When the
client echoes a URL back on write, the deserializer inverts it to the key.

```mermaid
flowchart LR
    subgraph read["Read path"]
        M1[("Mongo: AppImage.srcKey + variants (S3 keys)")] --> UR["ImageUrlResolver.hydrate"]
        UR -->|"presign SigV4 (Caffeine cache, TTL)"| OUT["AppImage with presigned URLs"]
        OUT --> FE1["Browser renders"]
    end
    subgraph write["Write path (echo-back)"]
        FE2["Browser sends AppImage w/ presigned URL"] --> DES["AppImageDeserializer.keyFromUrl"]
        DES -->|"endpoint/bucket/key → key"| M2[("Mongo stores S3 key")]
    end
```

## Remote image proxy (SSRF-guarded)

Authors can paste an external URL; the server fetches it (never the browser),
guarding against SSRF before the bytes enter the ingest pipeline.

```mermaid
flowchart TB
    U["Author pastes URL"] --> RC["RemoteImageController<br/>GET /api/media/remote-image (ROLE_USER)"]
    RC --> RS["RemoteImageService.fetch"]
    RS --> G1{"scheme http/https?"}
    G1 -->|no| REJ["reject"]
    G1 -->|yes| G2{"all resolved IPs public?"}
    G2 -->|no| REJ
    G2 -->|yes| G3{"redirects ≤ max<br/>& each hop re-checked?"}
    G3 -->|no| REJ
    G3 -->|yes| G4{"content-type allowed<br/>& size ≤ cap?"}
    G4 -->|no| REJ
    G4 -->|yes| OK["RemoteImage(bytes, contentType)<br/>→ ImageIngestService"]
```

## Deletion

```mermaid
sequenceDiagram
    autonumber
    participant U as Author
    participant GS as GalleryService
    participant S3 as S3StorageService
    participant M as MongoDB
    U->>GS: DELETE /api/galleries/{id}/images/{imageId} (EDIT)
    GS->>GS: ImageKeys.allKeys(image) — original + all variants
    GS->>S3: delete(keys) — batch, idempotent
    GS->>M: delete GalleryImage document
    Note over M: copies embedded in decks/themes survive<br/>(content copied at selection time)
```

## S3 client configuration

```mermaid
flowchart LR
    P["S3Properties (ambi.s3)<br/>endpoint · region · bucket · keys · pathStyleAccess"] --> CFG["S3Config"]
    CFG --> C1["S3Client"]
    CFG --> C2["S3Presigner"]
    C1 --> DEV[("dev: Garage<br/>endpoint=localhost:3900<br/>pathStyle=true")]
    C1 --> PROD[("prod: AWS S3<br/>region endpoint · IAM creds")]
    C2 --> URLS["presigned GET URLs (ambi.media.presign-ttl)"]
```
