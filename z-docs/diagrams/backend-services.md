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
        OIMG["OpaqueImageController /media"]
        LSC["LiveSessionController /liveSessions"]
        DEV["DevAuthController /dev<br/>@Profile(DEV) only"]
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
        OIU["OpaqueImageUrls"]
        DIL["DeckImageLifecycleService"]
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
    DS --> DIL --> S3
    DS --> IIS --> S3
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
    OIMG --> OIU --> S3
    DEV --> AS

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

Two stages: the `SecurityConfig` filter chain decides *what level of principal*
may reach a route, then the service layer decides *whether this principal may
touch this resource*. The chain has exactly four buckets — the matchers below
are the whole list, in order, and everything not matched falls to
`.anyRequest().hasRole("USER")`.

```mermaid
flowchart TB
    REQ["request"] --> CHAIN["SecurityConfig filter chain"]
    CHAIN -->|permitAll| PUB["/api/auth/me · /username-available<br/>/guest · /refresh · /logout<br/>/oauth2/** · /login/oauth2/**<br/>/actuator/health/** · swagger · /ws/**"]
    CHAIN -->|"hasRole(PRE_REGISTRATION)"| PREG["POST /api/auth/register"]
    CHAIN -->|"hasRole(GUEST) — player floor"| GST["POST /liveSessions/join · /{id}/answers<br/>/votes · /drawings · /leave<br/>/reconnect · /heartbeat<br/>GET /api/media/opaque-image"]
    CHAIN -->|"anyRequest().hasRole(USER)"| RU["everything else — decks · slides · themes<br/>galleries · orgs · users · comments · reviews<br/>live-session host commands"]

    RU --> SVC["service-layer checks"]
    SVC --> ACL["resource ACL<br/>canBeViewedBy · EditedBy · ManagedBy"]
    SVC --> OM["org membership<br/>OrgRole OWNER/ADMIN/USER"]
    SVC --> HO["host only — start · end · cancel · round control"]
    SVC --> SO["self only — /users/me"]
```

**There are no anonymous read routes.** `GET /api/decks/public` and
`GET /api/themes/built-in` require a registered user like everything else — they
are public in *visibility*, not in *authentication*. `hasRole("GUEST")` is a
minimum level, not an exact one: `AuthorityResolver` grants a cumulative
`ROLE_<LEVEL>`, so registered users satisfy it too while visitors and
pre-registration principals don't. Under the `DEV` profile only, an ordered
`/api/dev/**` chain (`DevSecurityConfig`) permits all and skips CSRF.

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
pub/sub) lives in **Redis** — see [Live Session](live-session.md#redis-keys).
