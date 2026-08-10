# System Overview

High-altitude view of Ambi: who uses it, what runs, and where state lives.
Zoom into a specific feature via the [diagrams index](README.md).

- Backend layering per feature: [Deck Authoring](deck-authoring.md), [Live Session](live-session.md), [Media & Gallery](media-gallery.md).
- Data shapes: [Domain Model (ERD)](domain-model.md).
- Deeper infra prose: [infrastructure.md](../infrastructure/infrastructure.md) and [ADR 001 — Observability](../decisions/001-observability-stack.md).

## Context — actors & systems

```mermaid
flowchart TB
    subgraph actors["People"]
        VIS["Visitor<br/>(anonymous)"]
        GUEST["Guest<br/>(ephemeral)"]
        HOST["Author / Host<br/>(registered)"]
        PART["Participant<br/>(guest or registered)"]
    end

    AMBI["Ambi<br/>Interactive presentation platform<br/>React 19 SPA + Spring Boot 4 API"]

    subgraph ext["External services"]
        IDP["Google / Discord / Microsoft OAuth"]
    end

    subgraph stores["State"]
        MONGO[("MongoDB<br/>durable aggregates")]
        REDIS[("Redis<br/>sessions · live state · pub/sub")]
        S3[("Garage / S3<br/>image objects")]
        QUEUE[["ElasticMQ / SQS<br/>image-variant jobs"]]
    end

    WORKER["Image-variant worker<br/>Python 3.13 · boto3 · Pillow"]

    VIS -->|browse public decks, sign in| AMBI
    GUEST -->|play, join sessions| AMBI
    HOST -->|author decks, host sessions| AMBI
    PART -->|join by room code, answer| AMBI

    AMBI -->|OAuth login| IDP
    AMBI --> MONGO
    AMBI --> REDIS
    AMBI --> S3
    AMBI -->|enqueue render job| QUEUE
    QUEUE --> WORKER
    WORKER -->|WebP tiers| S3
    WORKER -->|readiness callback| AMBI
```

## Containers — what talks to what

```mermaid
flowchart LR
    Browser["Browser<br/>React 19 + Vite (5173)<br/>Redux Toolkit + RTK Query"]

    subgraph backend["Spring Boot 4 · Java 26 (8080)"]
        REST["REST controllers<br/>/api/**"]
        WS["WebSocket / STOMP<br/>/ws · /topic/liveSession/{publicId}"]
        SVC["Service layer"]
        REPO["Spring Data repositories"]
        MEDIA["Media / S3 clients"]
    end

    Browser -->|"HTTPS · cookies (AMBI_AT/RT) · X-Request-Id"| REST
    Browser <-->|"STOMP over WS"| WS
    REST --> SVC
    WS --> SVC
    SVC --> REPO
    SVC --> MEDIA

    REPO --> MONGO[("MongoDB :27017")]
    SVC -->|"sessions, cache, locks, pub/sub"| REDIS[("Redis :6379")]
    WS -.->|"cross-instance fan-out"| REDIS
    MEDIA -->|"put/get, presign"| S3[("Garage S3 :3900")]
    MEDIA -->|"render job"| QUEUE[["ElasticMQ :9324"]]
    QUEUE --> WORKER["image-variant-worker<br/>Python 3.13 · Pillow"]
    WORKER -->|"WebP tiers"| S3
    WORKER -->|"POST /api/internal/image-variants"| REST
    REST -->|"OAuth code exchange"| IDP2["Google / Discord / Microsoft OAuth"]
```

### The stack in that picture

| Layer | Tools |
| --- | --- |
| Frontend | React 19 (React Compiler) · TypeScript strict · Vite · TanStack Router (file-based) · Redux Toolkit + RTK Query · CSS Modules + `tokens.css` · TipTap · `vite-plugin-svgr` |
| Backend | Java 26 · Spring Boot 4 · Maven (`./mvnw`) · Spring Data MongoDB · Redis · Spring Security + OAuth2 · SpringDoc OpenAPI · Lombok · AWS SDK v2 (S3 + SQS) |
| Image-variant worker | Python 3.13 · boto3 · Pillow — out of process, deployable as a poller container or a Lambda ([README](../../worker/README.md), [feature doc](../features/image-variants/README.md)) |

The API client, validation bounds, and enums are **generated** from the backend
OpenAPI schema — never hand-edited. Backend package `com.cephadex.ambi` is
feature-based (`auth/`, `billing/`, `common/`, `config/`, `media/`, `org/`,
`presentation/`, `session/`, `theme/`, `user/`), each with its own
`controller/`/`service/`/`dto/`/`enums/` — there are no flat layer packages.
Endpoints are prefixed `/api` and documented at
`http://localhost:8080/swagger-ui/`; CORS allows only `http://localhost:5173`,
with credentials. Conventions: [frontend-rules](../rules/frontend-rules.md),
[backend-rules](../rules/backend-rules.md),
[styling-rules](../rules/styling-rules.md).

Deployment is local-only today — see
[infrastructure.md](../infrastructure/infrastructure.md) for the container set
and [ADR 001](../decisions/001-observability-stack.md) for the logging/metrics
plan.
