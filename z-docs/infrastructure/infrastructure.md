# Infrastructure

The local development stack: what runs where, and on which ports. Production
deployment is not designed yet; the queue and the image-variant worker below are
the only pieces with a production shape (SQS + a container/Lambda), and they run
against local stand-ins here.

## Local stack

```mermaid
flowchart TB
    Browser(["Browser"])
    Vite["React 19 + Vite<br/>:5173"]
    SpringBoot["Spring Boot 4 / Java 26<br/>:8080"]

    subgraph Docker["docker compose"]
        MongoDB[("MongoDB :27017")]
        Redis[("Redis Stack :6379")]
        Garage["Garage S3-compat :3900"]
        Mx["mongo-express :8081"]
        Ls["LocalStack :4566"]
        Emq["ElasticMQ :9324 / :9325"]
        Worker["image-variant-worker<br/>Python 3.13 · Pillow"]
    end

    IdP(["Google / Discord / Microsoft OAuth"])

    Browser --> Vite
    Vite -- "REST + STOMP/WS" --> SpringBoot
    SpringBoot --> MongoDB
    SpringBoot --> Redis
    SpringBoot --> Garage
    SpringBoot --> IdP
    SpringBoot -- "render job" --> Emq
    Emq --> Worker
    Worker -- "WebP tiers" --> Garage
    Worker -- "POST /api/internal/image-variants" --> SpringBoot
    Mx -.-> MongoDB
```

The backend keeps durable aggregates in MongoDB, all volatile live-session state
plus auth sessions in Redis, and image objects in Garage. Media ingest and
storage are `media/storage/ImageIngestService` and
`media/storage/S3StorageService`; live play is the `session/` package. See
[Backend Service Map](../diagrams/backend-services.md).

Image renditions are the one asynchronous path: ingest stores the original and
enqueues a job, and the out-of-process worker renders the WebP tiers and reports
back. Contracts and failure modes are owned by
[Image variants](../features/image-variants/README.md).

## Docker Compose services

| Service | Image | Ports | Role |
| --- | --- | --- | --- |
| `mongodb` | `mongo:7.0` | 27017 | Primary database |
| `redis` | `redis/redis-stack-server` | 6379 | Sessions, cache, live-session state, pub/sub |
| `redisinsight` | `redis/redisinsight:latest` | 8001 → 5540 | Redis admin UI — the `-server` image ships none, so it runs as its own service |
| `garage` | `dxflrs/garage:v1.0.1` | 3900 / 3903 | Local S3-compatible object storage |
| `mongo-express` | `mongo-express:latest` | 8081 | MongoDB admin UI — [runbook](../runbooks/using-mongo-express.md) |
| `localstack` | `localstack/localstack:4` | 4566 | Local AWS emulation, scoped to `cloudwatch,logs` |
| `elasticmq` | `softwaremill/elasticmq-native:1.6.11` | 9324 / 9325 | SQS stand-in for image-variant render jobs; queues + DLQ declared in `elasticmq.conf`, stats UI on 9325 |
| `image-variant-worker` | built from `worker/` (target `poller`) | — | Long-polls the queue, renders WebP tiers into Garage, reports readiness back — [README](../../worker/README.md) |

Spring does **not** auto-start these (`spring.docker.compose.enabled=false`) —
bring them up yourself. Startup, seeding and the rest of the everyday loop live
in the [Running the project](../runbooks/running-the-project.md) runbook;
credentials in [Environment Variables](environment-variables.md).

## Health & observability

The health surface is Spring Actuator's `/actuator/health` (the only Actuator
endpoint exposed, and the only permitted-unauthenticated one besides auth,
OAuth, swagger and `/ws`). There is no `/api/health`.

Everything else about logging and metrics — what is implemented (`MdcLoggingFilter`
`X-Request-Id`→`traceId`→`userId` correlation, the RFC 9457 error path, the
frontend logger) and what is deferred (structured JSON logging, Actuator metrics,
CloudWatch delivery, Sentry) — is owned by
[ADR 001 — Observability & logging stack](../decisions/001-observability-stack.md)
and the [observability runbook](../runbooks/using-the-observability-stack.md).
Don't restate it here.
