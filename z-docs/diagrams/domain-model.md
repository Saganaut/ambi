# Domain Model (ERD)

The MongoDB persistence model. Aggregate roots are separate `@Document`
collections; value objects and child entities are **embedded**. References
across aggregate boundaries are by id (no DB-level joins).

Blocks show the fields other aggregates or the API depend on, not every field.
Legend: `PK` primary key · `ref` cross-aggregate reference by id · `emb`
embedded. The deck/slide/answer content model is still under rework — see
[deck-editor](../features/deck-editor/README.md) and
[follow-up-slides](../features/follow-up-slides/README.md).

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
        string themeId "ref, nullable; or reserved id ambi-light/ambi-dark"
        enum visibility "PRIVATE, UNLISTED, ORG, PUBLIC"
        enum publishStatus "DRAFT, PUBLISHED, ARCHIVED"
        Ownership ownership "emb: USER|ORG"
        string organizationId "ref, indexed"
        AppImage coverImage "emb"
        AppImage backgroundImage "emb"
        string backgroundColor "#RRGGBB, own promote endpoint"
        DeckSettings settings "emb"
        DeckStats stats "emb, denormalized"
        long version "optimistic lock"
    }
    SLIDE {
        string id "client-minted UUID"
        string title
        SlideContent content "emb, sealed (17 kinds)"
        string sortOrder "LexoRank"
        string parentId "follow-up link"
        string childId "follow-up link"
        AppImage coverImage "emb"
        AppImage backgroundImage "emb"
        string backgroundColor "override; null inherits deck"
        boolean hideBackground "suppress inherited image"
        SlideSettings settings "emb overrides"
        enum difficulty "EASY..IMPOSSIBLE"
        string explanation "+ speakerNotes, participantInstructions, section"
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
        boolean builtIn "the 6 seeded VSCode/terminal presets only"
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
        Instant computedAt
        long totalSessions
        long uniquePlayers
        long ratingCount
        Double ratingAverage
        map ratingDistribution "star (1..5) -> count"
    }
```

`DeckAnalytics` is a ~30-field precomputed record (play counts, score and
duration distributions, per-slide difficulty stats, hardest/easiest slide ids);
only the fields other aggregates read are shown. `ratingDistribution` really is a
`Map<Integer,Integer>` — integer keys, so the dot problem below doesn't apply.

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
        AnswerPayload payload "emb, sealed (14 kinds)"
        Instant submittedAt
    }
    ROUND_RESULT {
        RoundResultId id PK "sessionId + slideId"
        int numberOfParticipants
        int numberOfCorrectAnswers
        string correctOption
        TallyEntry[] optionTally "list of (choice, count) — NOT a map"
        double[] responseTimes
        Instant closedAt
    }
    PARTICIPANT_OUTCOME {
        string participantId "ref"
        string choice
        boolean correct
        int points
        long responseTimeMs
    }
```

> `optionTally` is a **list of `TallyEntry(choice, count)` records, not a map** —
> deliberately. Choice strings are used verbatim as keys and can contain a `.`
> (a NUMBER round keys on `"42.5"`, a free-text round on `"Mr. Smith"`), and
> MongoDB forbids dots in field names, so a map fails to persist the whole
> document. `RoundResult.optionCounts()` rebuilds the map view the reveal events
> expose. Do not "simplify" this back to a `Map`.

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
`Avatar`. Only the deck/slide case owns independent bytes — see
[Deck image ownership](media-gallery.md#deck-image-ownership-copy-on-select).

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
    ScorableContent <|.. AxisContent
    ScorableContent <|.. PlaceOnImageContent
    ScorableContent <|.. MatchingContent
    ScorableContent <|.. AllocationContent
    ScorableContent <|.. DrawingContent
    ScorableContent <|.. FollowUpContent

    NonScorableContent <|.. TitleContent
    NonScorableContent <|.. RichTextContent
    NonScorableContent <|.. MediaContent
    NonScorableContent <|.. InstructionContent
    NonScorableContent <|.. QAndAContent
```

`AnswerPayload` is a flat sealed interface of 14: `Mcq`, `Number`, `Text`,
`Ranking`, `Scales`, `QAndAAnswer`, `QAndAQuestions`, `Matching`, `Grid`, `Axis`,
`PlaceOnImage`, `Allocation`, `Drawing`, `FollowUp`.

Q&A is the one payload with two kinds: `QAndAAnswer` is the submitted wire shape
(one free-text question); the orchestrator appends it into `QAndAQuestions`, the
stored per-participant aggregate, keeping one `Answer` document per participant.
Submitting `QAndAQuestions` directly is rejected at validation.
