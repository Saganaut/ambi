# Domain Model (ERD)

The MongoDB persistence model. Aggregate roots are separate `@Document`
collections; value objects and child entities are **embedded**. References
across aggregate boundaries are by id (no DB-level joins).

> The deck/slide/answer content model is under active rework as part of the
> backend rewrite — kind enums and field names may shift. See
> [deck-editor](../features/deck-editor/README.md) and
> [follow-up-slides](../features/follow-up-slides/README.md).

Legend: `PK` primary key · `FK`/`ref` cross-aggregate reference by id ·
`emb` embedded document · relationship crow's-foot shows cardinality.

## Identity, access & billing

```mermaid
erDiagram
    USER ||--o| GALLERY : "owns (1 personal)"
    USER ||--o{ DECK : creates
    USER ||--o{ THEME : creates
    USER ||--o{ DECK_REVIEW : writes
    USER ||--|| MEMBERSHIP : "has (emb)"
    USER ||--o{ ORG_MEMBERSHIP : "roles (emb)"

    USER {
        string id PK
        string publicId "unique"
        string username "unique, non-guest"
        string emailAddress "unique"
        string displayName
        enum userLevel "GUEST..SUPER_ADMIN"
        Instant guestExpiresAt "TTL for guests"
        AuthInfo auth "emb: provider + externalId"
        Avatar avatar "emb"
        UserPreferences preferences "emb"
        boolean closed
    }
    MEMBERSHIP {
        BillingState billing "emb: tier, status, provider"
        string sourceOrganizationId "ref, nullable"
        int monthlyInteractiveSessionCount
        int monthlyInteractiveSessionLimit
    }
    ORG_MEMBERSHIP {
        string orgId "ref (no Org document exists)"
        enum orgRole "OWNER, ADMIN, USER"
    }
```

> There is **no `Organization` document** — orgs exist only as ids referenced by
> `Ownership` and `OrgMembership`. `/api/orgs/mine` projects `User.orgRoles`.

## Content — decks, slides, theming, feedback

```mermaid
erDiagram
    DECK ||--o{ SLIDE : "embeds (aggregate root)"
    DECK ||--o| THEME : "themeId ref"
    DECK ||--o{ COMMENT_THREAD : "deckId ref"
    DECK ||--o{ DECK_REVIEW : "deckId ref"
    DECK ||--o| DECK_ANALYTICS : "id == deckId"
    DECK ||--o{ DECK : "parentDeckId (fork)"
    DECK ||--o{ DECK_ACCESS_GRANT : "acl (emb)"
    COMMENT_THREAD ||--o{ COMMENT : "embeds (tree)"
    THEME ||--|| THEME_SPEC : "spec (emb)"

    DECK {
        string id PK "client-minted UUID"
        string publicId "unique, sharing"
        string name
        string themeId "ref, nullable"
        enum visibility "PRIVATE, UNLISTED, ORG, PUBLIC"
        enum publishStatus "DRAFT, PUBLISHED, ARCHIVED"
        Ownership ownership "emb: USER|ORG"
        string organizationId "ref, indexed"
        AppImage coverImage "emb"
        AppImage backgroundImage "emb"
        DeckSettings settings "emb"
        DeckStats stats "emb, denormalized"
        long version "optimistic lock"
    }
    SLIDE {
        string id "client-minted UUID"
        string title
        SlideContent content "emb, sealed (14 kinds)"
        string sortOrder "LexoRank"
        string parentId "follow-up link"
        string childId "follow-up link"
        SlideSettings settings "emb overrides"
        enum difficulty "EASY..IMPOSSIBLE"
    }
    DECK_ACCESS_GRANT {
        string userId "ref"
        enum role "VIEWER, EDITOR"
    }
    COMMENT_THREAD {
        string id PK
        string deckId "ref, indexed"
        string slideId "ref"
        enum status "OPEN, RESOLVED"
    }
    COMMENT {
        string id "NanoID"
        string body
        string parentCommentId "reply tree"
        Author author "emb snapshot"
        boolean edited
        boolean deleted
    }
    DECK_REVIEW {
        string id PK
        string deckId "ref, unique(deckId,userId)"
        string userId "reviewer publicId"
        int stars "1..5"
        Author author "emb snapshot"
    }
    THEME {
        string id PK
        boolean builtIn
        Ownership ownership "emb"
        ThemeSpec spec "emb"
    }
    THEME_SPEC {
        enum appearance "LIGHT, DARK"
        Palette palette "emb, 16 color roles"
        AppImage backgroundImage "emb"
        AppImage logoImage "emb"
    }
    DECK_ANALYTICS {
        string id PK "== deck id"
        double ratingAverage
        long ratingCount
        SlideStats slides "emb list"
    }
```

## Live session — runtime play

Durable Mongo aggregates below; the **volatile round state lives in Redis**
(see [Live Session](live-session.md)).

```mermaid
erDiagram
    LIVE_SESSION ||--o{ PARTICIPANT : "roster + host ref"
    LIVE_SESSION ||--o{ ANSWER : "sessionId ref"
    LIVE_SESSION ||--o{ ROUND_RESULT : "sessionId ref"
    LIVE_SESSION ||--|| DECK : "frozen snapshot (emb)"
    PARTICIPANT ||--o{ ANSWER : "participantId ref"
    ROUND_RESULT ||--o{ PARTICIPANT_OUTCOME : "perParticipant (emb)"
    USER ||--o{ PARTICIPANT : "userId (stripped while live)"

    LIVE_SESSION {
        string id PK
        string publicId "unique, WS topic"
        string roomCode "unique, join code"
        enum status "LOBBY, IN_PROGRESS, FINISHED, CANCELLED"
        enum phase "SUBMIT..REVEAL_RESULTS"
        string hostParticipantId "ref"
        Deck deck "emb snapshot"
    }
    PARTICIPANT {
        string participantId PK
        string userId "ref, stripped live"
        string displayName
        enum connectionStatus "ONLINE, DISCONNECTED, IDLE, RECONNECTING"
        ParticipantScore score "emb: points, streak"
        boolean banned
    }
    ANSWER {
        string id PK
        string sessionId "ref"
        string participantId "ref"
        string slideId "ref"
        AnswerPayload payload "emb, sealed (13 kinds)"
        Instant submittedAt
    }
    ROUND_RESULT {
        RoundResultId id PK "sessionId + slideId"
        int numberOfParticipants
        int numberOfCorrectAnswers
        string correctOption
        map optionCounts "tally"
    }
    PARTICIPANT_OUTCOME {
        string participantId "ref"
        string choice
        boolean correct
        int points
        double responseTimeMs
    }
```

## Media

```mermaid
erDiagram
    GALLERY ||--o{ GALLERY_IMAGE : "galleryId ref"
    GALLERY_IMAGE ||--|| APP_IMAGE : "image (emb)"

    GALLERY {
        string id PK
        string name "default 'My Gallery'"
        Ownership ownership "emb: USER|ORG, unique"
        string organizationId "ref, indexed"
        long version "optimistic lock"
    }
    GALLERY_IMAGE {
        string id PK
        string galleryId "ref, indexed"
        string name
        AppImage image "emb"
    }
    APP_IMAGE {
        string id PK
        boolean external "external URL vs S3"
        string srcKey "S3 key of original"
        string externalSrc "full URL when external"
        map variants "size -> S3 key (webp tiers)"
        Placement placement "emb, optional grid"
        string altText
    }
```

`AppImage` is also embedded directly into `Deck`, `Slide`, `Theme`, and
`Avatar` — the image bytes/keys are copied in when selected, so deleting a
gallery image does not remove copies already placed in a deck.

## Polymorphic content hierarchies

Both slide content and answer payloads are Jackson-polymorphic **sealed**
interfaces (discriminator persisted as `_class` / `type`). Each scorable slide
kind has a matching answer kind.

```mermaid
classDiagram
    direction LR
    class SlideContent {
        <<sealed interface>>
        +contentType
    }
    class ScorableContent { <<interface>> }
    class NonScorableContent { <<interface>> }
    SlideContent <|-- ScorableContent
    SlideContent <|-- NonScorableContent

    ScorableContent <|.. McqContent
    ScorableContent <|.. NumberContent
    ScorableContent <|.. TextContent
    ScorableContent <|.. RankingContent
    ScorableContent <|.. ScalesContent
    ScorableContent <|.. GridContent
    ScorableContent <|.. PlaceOnImageContent
    ScorableContent <|.. MatchingContent
    ScorableContent <|.. AllocationContent
    ScorableContent <|.. DrawingContent

    NonScorableContent <|.. TitleContent
    NonScorableContent <|.. MediaContent
    NonScorableContent <|.. QAndAContent
    NonScorableContent <|.. FollowUpContent
```

```mermaid
classDiagram
    direction LR
    class AnswerPayload {
        <<sealed interface>>
        +answerType
    }
    AnswerPayload <|.. McqAnswer
    AnswerPayload <|.. NumberAnswer
    AnswerPayload <|.. TextAnswer
    AnswerPayload <|.. RankingAnswer
    AnswerPayload <|.. ScalesAnswer
    AnswerPayload <|.. QAndAAnswer
    AnswerPayload <|.. QAndAQuestions
    AnswerPayload <|.. MatchingAnswer
    AnswerPayload <|.. GridAnswer
    AnswerPayload <|.. PlaceOnImageAnswer
    AnswerPayload <|.. AllocationAnswer
    AnswerPayload <|.. DrawingAnswer
    AnswerPayload <|.. FollowUpAnswer
```

Q&A is the one payload with two kinds: `QAndAAnswer` is the wire shape a
participant submits (one free-text question); the orchestrator appends it
server-side into `QAndAQuestions`, the stored per-participant aggregate (a
player may ask several questions in a round, but the answer model keeps one
`Answer` document per participant). A client submitting `QAndAQuestions`
directly is rejected at validation.
