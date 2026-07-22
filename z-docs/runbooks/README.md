# Runbooks

Operational procedures: how to do a specific task in this project from a cold start. One file per procedure, named for the action (`seed-prod.md`, `rotate-google-client-secret.md`, `recover-mongo.md`).

## Index

- [Using Mongo Express](using-mongo-express.md) — browse collections, inspect documents, verify seed data, drop collections for a clean re-seed.
- [Using RedisInsight](using-redis-insight.md) — inspect session keys, check guest TTLs, monitor pub/sub, run raw Redis commands, flush data for a clean state.
- [Using the observability stack](using-the-observability-stack.md) — emit correlated logs front & back, run prod JSON logging locally, follow the `X-Request-Id`→`traceId` thread, exercise LocalStack CloudWatch.
- [Dev login & app screenshots](dev-login-and-screenshots.md) — log in as the DEV-only `devuser` via `POST /api/dev/login` (no frontend route), capture headless screenshots, or authenticate your own browser for manual clicking.
- [Using the Trello board](using-the-trello-board.md) — track work on the Ambi Dev board via the Trello REST API: credential setup, list/label structure, and create/move/comment/archive card commands.

## What belongs here

- Step-by-step procedures with concrete commands.
- Recovery / incident-response checklists.
- Anything you'd want to grab quickly at 2 a.m. without rederiving.

Conventions are not runbooks — those go in [Rules](../rules/README.md). One-time design decisions go in [Decisions](../decisions/README.md).
