# Collaboration — Comments & Reviews

Two feedback surfaces on a deck: **comment threads** anchored to a slide, and
**star reviews** of the whole deck. Both snapshot the author's profile at write
time and overlay the current profile on read, and both gate reads on deck VIEW.

Key classes: `CommentThreadController`, `CommentThreadService`,
`ReviewController`, `DeckReviewService`, `DeckService`. Data shapes:
[Domain Model — Content](domain-model.md#content--decks-slides-theming-feedback).

## Comment thread model

```mermaid
flowchart TB
    DECK["Deck"] --> ST["Slide"]
    ST --> CT["CommentThread<br/>deckId · slideId · status OPEN/RESOLVED"]
    CT --> C1["Comment (top-level)<br/>author snapshot · body"]
    C1 --> C2["Comment (reply)<br/>parentCommentId → C1.id"]
    C1 --> C3["Comment (reply)"]
    note1["soft-delete: deleted=true, body redacted"]:::n -.-> C2
    classDef n fill:#f6f6f6,stroke:#bbb,color:#333
```

## Comment lifecycle

```mermaid
sequenceDiagram
    autonumber
    participant U as User (signed-in)
    participant CC as CommentThreadController
    participant CS as CommentThreadService
    participant DS as DeckService
    participant M as MongoDB

    U->>CC: POST .../comment-threads {body}
    CC->>DS: check deck VIEW
    CC->>CS: createThread (author snapshot at write)
    CS->>M: insert CommentThread + first Comment
    CC-->>U: thread

    U->>CC: POST .../{threadId}/comments
    CC->>CS: addComment (appendComment @Modifying)
    CS->>M: push Comment

    U->>CC: PATCH .../comments/{commentId} (author only)
    CC->>CS: editComment → edited=true

    U->>CC: DELETE .../comments/{commentId} (author only)
    CC->>CS: deleteComment → deleted=true, body redacted

    U->>CC: PATCH .../{threadId} {status}
    CC->>CS: setStatus OPEN ↔ RESOLVED
```

## Review rating flow

One review per (deck, user) via a compound unique index; self-review is barred.
Writing a review recomputes the deck's denormalized rating summary.

```mermaid
sequenceDiagram
    autonumber
    participant U as User (not deck editor)
    participant RC as ReviewController
    participant RS as DeckReviewService
    participant RR as DeckReviewRepository
    participant DS as DeckService
    participant M as MongoDB

    U->>RC: PUT /api/decks/{deckId}/reviews {stars 1..5, body}
    RC->>RS: rateDeck (check VIEW · reject self-review 403)
    RS->>RR: save (upsert on deckId+userId)
    RS->>DS: setRatingStats (recompute avg + count)
    DS->>M: update Deck.stats
    RC-->>U: review

    U->>RC: GET /api/decks/{deckId}/reviews/summary
    RC->>RS: getSummary
    RS->>RR: aggregate (avg, count, 1★..5★ distribution)
    RR-->>U: RatingSummary

    U->>RC: DELETE /api/decks/{deckId}/reviews/mine
    RC->>RS: deleteMyReview (idempotent)
    RS->>DS: setRatingStats (recompute)
```

## Read overlay — snapshot vs live profile

```mermaid
flowchart LR
    W["Write time<br/>store Author snapshot<br/>(userId, displayName, avatar)"] --> DB[("Mongo: Comment / DeckReview")]
    DB --> R["Read time"]
    R --> OV["overlay current User profile<br/>(fresh displayName/avatar by userId)"]
    OV --> OUT["response DTO"]
```
