# Backend Service Map

One picture of the whole backend: every controller, its route prefix, the
services it drives, and the collections/stores behind them. All endpoints are
prefixed `/api` and documented live at `/swagger-ui/`.

Per-feature deep dives: [Deck Authoring](deck-authoring.md),
[Live Session](live-session.md), [Media & Gallery](media-gallery.md),
[Collaboration](collaboration.md), [Authentication](authentication.md).

## Controllers → services → stores

```mermaid
flowchart LR
    subgraph controllers["Controllers (/api)"]
        AUTH["AuthController /auth"]
        USER["UserController /users"]
        ORG["OrgController /orgs"]
        DECK["DeckController /decks"]
        COMMENT["CommentThreadController<br/>/decks/{}/slides/{}/comment-threads"]
        REVIEW["ReviewController /decks/{}/reviews"]
        THEME["ThemeController /themes"]
        GAL["GalleryController /galleries"]
        RIMG["RemoteImageController /media"]
        LSC["LiveSessionController /liveSessions"]
    end

    subgraph services["Services"]
        AS["AuthService"]
        TS["RedisTokenSessionService"]
        USVC["UserService"]
        DS["DeckService"]
        SR["SlideRankService"]
        CS["CommentThreadService"]
        DRS["DeckReviewService"]
        THS["ThemeService"]
        GS["GalleryService"]
        IIS["ImageIngestService"]
        RIS["RemoteImageService"]
        LLS["LiveSessionLobbyService"]
        LAS["LiveSessionAnswerService"]
        ORCH["LiveSessionOrchestrator"]
        S3["S3StorageService"]
        IUR["ImageUrlResolver"]
    end

    subgraph stores["Stores"]
        MONGO[("MongoDB")]
        REDIS[("Redis")]
        OBJ[("Garage / S3")]
        GOOG["Google OAuth"]
    end

    AUTH --> AS --> TS --> REDIS
    AS --> USVC
    AUTH -.-> GOOG
    USER --> USVC --> MONGO
    ORG --> USVC

    DECK --> DS --> MONGO
    DS --> SR
    DS --> USVC
    COMMENT --> CS --> MONGO
    COMMENT --> DS
    REVIEW --> DRS --> MONGO
    REVIEW --> DS
    THEME --> THS --> MONGO

    GAL --> GS --> MONGO
    GAL --> IIS --> S3 --> OBJ
    GS --> IUR --> OBJ
    RIMG --> RIS
    RIS -.-> IIS

    LSC --> LLS --> ORCH
    LSC --> LAS --> ORCH
    ORCH --> MONGO
    ORCH --> REDIS
    LLS --> DS
```

## Authorization model

```mermaid
flowchart TB
    REQ["request"] --> KIND{"route class"}
    KIND -->|public| PUB["/auth/me · /username-available · /logout<br/>/decks/public · /themes/built-in"]
    KIND -->|"ROLE_USER"| RU["/users · /galleries · /media"]
    KIND -->|"sign-in"| SI["/auth register/refresh · /orgs<br/>liveSessions/join · comments · reviews (write)"]
    KIND -->|"resource ACL"| ACL["Deck / Theme / Gallery / Comment / Review<br/>canBeViewedBy · EditedBy · ManagedBy"]
    KIND -->|"org membership"| OM["org-owned Deck / Theme / Gallery<br/>OrgRole OWNER/ADMIN/USER"]
    KIND -->|"host only"| HO["liveSessions start · end · cancel"]
    KIND -->|"self only"| SO["/users/me"]
```

## Collections & repositories

| Aggregate | Repository | Collection |
|---|---|---|
| User | `UserRepository` | `users` |
| Deck | `DeckRepository` | `decks` (slides embedded) |
| Theme | `ThemeRepository` | `themes` |
| Gallery | `GalleryRepository` | `galleries` |
| GalleryImage | `GalleryImageRepository` | `gallery_images` |
| AppImage | — | `app_images` |
| CommentThread | `CommentThreadRepository` | `comment_threads` |
| DeckReview | `DeckReviewRepository` | `deck_reviews` |
| DeckAnalytics | — | `deck_analytics` |
| LiveSession | `LiveSessionRepository` | `LiveSessions` |
| Participant | `ParticipantRepository` | `participants` |
| Answer | `AnswerRepository` | `answers` |
| RoundResult | — | `round_results` |

Volatile live-session state (locks, round state, tallies, answers, presence,
pub/sub) lives in **Redis** — see [Live Session](live-session.md#redis-stores-at-runtime).
