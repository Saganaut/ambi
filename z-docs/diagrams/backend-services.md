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
        OAUTH2["Spring Security oauth2Login<br/>/oauth2/** · /login/oauth2/**"]
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
        GOSH["OAuth2SuccessHandler"]
        USVC["UserService"]
        ORR["OrgRoleResolver"]
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
        LHS["LiveSessionHostService"]
        LPS["LiveSessionPresenceService"]
        LSS["LiveSessionSnapshotService"]
        ORCH["LiveSessionOrchestrator"]
        SCHED["DeadlineScheduler<br/>@Scheduled poll, leader-elected"]
        S3["S3StorageService"]
        IUR["ImageUrlResolver"]
    end

    subgraph stores["Stores"]
        MONGO[("MongoDB")]
        REDIS[("Redis")]
        OBJ[("Garage / S3")]
        IDP["Google / Discord / Microsoft OAuth"]
    end

    AUTH --> AS --> TS --> REDIS
    AS --> USVC
    OAUTH2 -.-> IDP
    OAUTH2 --> GOSH --> TS
    GOSH --> USVC
    USER --> USVC --> MONGO
    ORG --> USVC

    DECK --> DS --> MONGO
    DS --> SR
    DS --> ORR --> USVC
    COMMENT --> CS --> MONGO
    COMMENT --> DS
    REVIEW --> DRS --> MONGO
    REVIEW --> DS
    THEME --> THS --> MONGO

    GAL --> GS --> MONGO
    GAL --> IIS --> S3 --> OBJ
    GS --> S3
    IUR --> OBJ
    RIMG --> RIS

    LSC --> LLS --> ORCH
    LSC --> LAS --> ORCH
    LSC --> LHS --> ORCH
    LSC --> LPS --> ORCH
    LSC --> LSS --> ORCH
    ORCH --> MONGO
    ORCH --> REDIS
    LLS --> DS
    SCHED -->|leader-only: drain deadline ZSET, dispatch| ORCH
    SCHED --> REDIS
```

## Authorization model

```mermaid
flowchart TB
    REQ["request"] --> KIND{"route class"}
    KIND -->|public| PUB["/auth/me · /username-available · /logout<br/>/auth/guest · /auth/refresh<br/>/decks/public · /themes/built-in"]
    KIND -->|"ROLE_USER"| RU["/users · /galleries · /media"]
    KIND -->|"ROLE_PRE_REGISTRATION"| PREG["/auth/register"]
    KIND -->|"sign-in"| SI["/orgs · liveSessions/join<br/>comments · reviews (write)"]
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
| RoundResult | `RoundResultRepository` (package-private) | `round_results` |

Volatile live-session state (locks, round state, tallies, answers, presence,
pub/sub) lives in **Redis** — see [Live Session](live-session.md#redis-stores-at-runtime).
