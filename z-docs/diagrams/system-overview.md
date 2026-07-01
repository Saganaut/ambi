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

    AMBI["Ambi<br/>Competitive brain-games platform<br/>React 19 SPA + Spring Boot 4 API"]

    subgraph ext["External services"]
        GOOG["Google OAuth 2.0"]
    end

    subgraph stores["State"]
        MONGO[("MongoDB<br/>durable aggregates")]
        REDIS[("Redis<br/>sessions · live state · pub/sub")]
        S3[("Garage / S3<br/>image objects")]
    end

    VIS -->|browse public decks, sign in| AMBI
    GUEST -->|play, join sessions| AMBI
    HOST -->|author decks, host sessions| AMBI
    PART -->|join by room code, answer| AMBI

    AMBI -->|OAuth login| GOOG
    AMBI --> MONGO
    AMBI --> REDIS
    AMBI --> S3
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
    REST -->|"OAuth code exchange"| GOOG["Google OAuth"]
```

## Deployment topology

Local dev today; AWS is the planned production target (see
[infrastructure.md](../infrastructure/infrastructure.md)).

```mermaid
flowchart TB
    subgraph local["Local dev (docker compose)"]
        direction LR
        FE1["Vite dev server :5173"]
        BE1["Spring Boot :8080"]
        subgraph containers["compose.yaml"]
            M1[("mongo:7.0 :27017")]
            R1[("redis-stack :6379 · UI :8001")]
            G1[("garage v1 :3900/:3903")]
            MX["mongo-express :8081"]
            LS["localstack :4566<br/>cloudwatch + logs"]
        end
        FE1 --> BE1 --> M1 & R1 & G1
        BE1 -.->|metrics/logs| LS
    end

    subgraph aws["Planned production (AWS)"]
        direction LR
        ALB["ALB + nginx (TLS)"]
        EC2["EC2 · Spring Boot"]
        SQS["SQS → Lambda workers<br/>EXTRACT · PROCESS · IMAGE"]
        SNS["SNS notify"]
        ATLAS[("MongoDB Atlas")]
        EC["ElastiCache Redis"]
        S3P[("AWS S3")]
        CW["CloudWatch + Sentry"]
        ALB --> EC2 --> ATLAS & EC & S3P
        EC2 --> SQS --> SNS
        EC2 -.-> CW
    end

    local -.->|"lift & shift"| aws
```

## Observability path

Vendor-agnostic foundation is implemented; error-tracking vendors (Sentry) are
deferred. See [ADR 001](../decisions/001-observability-stack.md).

```mermaid
flowchart LR
    FE["Frontend<br/>stamps X-Request-Id"] --> BE
    BE["Backend<br/>MdcLoggingFilter<br/>requestId → traceId → userId"]
    BE -->|"JSON logs to stdout"| LOGS["CloudWatch Logs<br/>(LocalStack in dev)"]
    BE -->|"Actuator + Micrometer"| METRICS["CloudWatch Metrics"]
    BE -->|"RFC 9457 ProblemDetail"| ERR["Error responses<br/>(traceId echoed)"]
    ERR -.->|deferred| SENTRY["Sentry (per-layer DSN)"]
    LOGS --> INSIGHTS["Logs Insights / alarms"]
    METRICS --> INSIGHTS
```
