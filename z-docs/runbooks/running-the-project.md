# Running the project

The everyday local dev loop: bring up infrastructure, run both servers, and keep generated
artifacts / sample data / screenshots in sync as you work.

## 1. Start everything (the normal way)

```bash
./scripts/ambi.sh          # run from the repo root; Ctrl+C stops everything
```

Brings up Docker, the Vite frontend, and the backend (with `dev.env` exported) in one terminal.
`-f` / `--file-logs` is currently a no-op — see [Using the observability stack](using-the-observability-stack.md).

The steps below are the same thing by hand, for when you only want one piece.

## 1b. Stop everything

Ctrl+C in the `ambi.sh` terminal is the normal path — it also handles the terminal window being
closed (SIGHUP), reaps the app processes before stopping the containers, and escalates to
SIGKILL for anything that ignores SIGTERM.

For anything `ambi.sh` can't reach, or when you didn't start the stack from a terminal you still
have:

```bash
./scripts/ambi-stop.sh                    # reap app processes + stop containers
./scripts/ambi-stop.sh --keep-containers  # leave Mongo/Redis/Garage up
```

It matches by **listening port and command line, not by parent process**, so it clears
backends nobody owns any more. Matching is anchored on this checkout's absolute paths, so a
second clone and editor-owned processes (`oxlint --lsp`, the `tsgo` watcher) are left alone.

### Symptom: a stale backend still holds `:8080`

A backend started detached — `nohup ./mvnw spring-boot:run &`, a background agent shell, a
closed terminal — outlives whatever launched it and keeps the port. It looks like a hung app:
requests time out (the containers are gone, so Mongo calls block until server-selection
timeout) but the port is bound and the browser keeps idle connections open to it.

Two JVMs are involved: `spring-boot:run` forks the app JVM, so the Maven process is the parent
and the process holding `:8080` is its child. Killing only the wrapper leaves the port held.

```bash
ss -tlnp | grep -E '8080|5173'      # who holds the dev ports
./scripts/ambi-stop.sh              # clears it regardless of parentage
```

## 2. Infrastructure

```bash
docker compose up -d
```

Starts MongoDB (`:27017`), Redis (`:6379`), RedisInsight (`:8001`), Garage S3 (`:3900`),
Mongo Express (`:8081`), LocalStack (`:4566`), ElasticMQ (`:9324` / `:9325`), and the
image-variant worker. See
[Environment Variables](../infrastructure/environment-variables.md) and
[Gotchas](../infrastructure/gotchas.md).

The worker is the only service built from source, so it needs an explicit build after any
change under `worker/`:

```bash
docker compose up -d --build image-variant-worker
docker compose logs -f image-variant-worker
```

It calls the backend back on `host.docker.internal:8080`, so it only completes jobs while a
backend is running on the host. Details: [worker README](../../worker/README.md).

## 3. Backend

```bash
set -a; source dev.env; set +a
cd backend && ./mvnw spring-boot:run
```

**Sourcing `dev.env` is mandatory.** There is no in-app dotenv loader — without it `S3_ACCESS_KEY`
/ `S3_SECRET_KEY` default to empty (`application.properties`), the app still boots, and every
image/gallery path then fails at runtime looking like an application bug.

- App: <http://localhost:8080>
- Swagger UI: `/swagger-ui/`
- OpenAPI spec: `/v3/api-docs`

## 4. Frontend

```bash
cd frontend && npm install && npm run dev
```

- App: <http://localhost:5173>

## 5. Regenerate frontend codegen artifacts

After backend changes (the backend must be running):

```bash
cd frontend
npm run generate          # API client + validation constants + enums
```

> **Known abort:** `generate-api` currently dies on the dev-auth-controller tag (it emits a
> `features/undefined` devApi). When that happens, run the three scripts individually —
> `npm run generate-api`, `npm run generate-validation`, `npm run generate-enums` — and discard
> the stray devApi output.

All generated files are committed and **must not be hand-edited** — see
[generated-artifacts](../rules/frontend/generated-artifacts.md).

## 6. Seed sample data

```bash
./scripts/seed-sample-data.sh
```

Loads the LOTR sample dataset. Idempotent per collection per user and never destructive — but stop
any running backend first.

## 7. One-off data migrations

Schema changes the current model can no longer read get a one-shot `ApplicationRunner` under
`backend/.../config/`, fronted by a script in `scripts/`. Each binds a random port (so it can run
alongside a backend on 8080), rewrites documents in place, and is idempotent. **Always
`--dry-run` first.**

| Script | Rewrites |
| --- | --- |
| `scripts/migrate-place-on-image.sh` | Legacy `PLACE_ON_IMAGE` `content.correctTargets` → `items` + `correctPositions` + `tolerance`, in `decks` and in `LiveSessions` deck snapshots. |
| `scripts/migrate-deck-images.sh` | Gives pre-existing decks their own S3 image copies — the one-off counterpart of [copy-on-select adoption](../diagrams/media-gallery.md#deck-image-ownership-copy-on-select). `decks` only. |
| `scripts/migrate-participant-session-id.sh` | Backfills `participants.session_id` from each `LiveSessions.roster` array, then `$unset`s the array — membership now hangs off the participant document (see [membership](../diagrams/live-session.md#membership)). |
| `scripts/migrate-participant-admitted-at.sh` | Backfills `participants.admitted_at` from each document's `joined_at` — the roster now counts only admitted documents. **Run before booting the new backend**, or pre-existing participants are invisible to every roster read. |

## 8. Inspecting the data

Mongo: <http://localhost:8081> — see [Using Mongo Express](using-mongo-express.md).

Redis (no GUI in this stack):

```bash
docker exec -it ambi-redis redis-cli -a password
KEYS spring:session:*                 # Spring Session keys
TTL spring:session:sessions:<id>      # confirm guest TTLs count down
FLUSHALL                              # dev only — invalidates every session
```

### The render queue (ElasticMQ)

Queue depths at a glance: <http://localhost:9325/statistics/queues> (the stats UI). Anything
deeper goes through the SQS API — the AWS CLI is not part of this stack, so run it from a
throwaway container:

```bash
alias sqs='docker run --rm --network host \
  -e AWS_ACCESS_KEY_ID=x -e AWS_SECRET_ACCESS_KEY=x -e AWS_DEFAULT_REGION=elasticmq \
  amazon/aws-cli --endpoint-url http://localhost:9324 sqs'

Q=http://localhost:9324/000000000000/ambi-image-variants

sqs get-queue-url --queue-name ambi-image-variants
sqs get-queue-attributes --queue-url $Q --attribute-names All   # depth + RedrivePolicy
sqs receive-message --queue-url $Q --visibility-timeout 0        # peek without consuming
sqs purge-queue --queue-url $Q
```

`get-queue-url` reports `http://localhost:9324/...` regardless of who asks, because that is
`node-address` in `elasticmq.conf` — which is exactly why both the backend and the worker are
configured with an explicit queue URL and never call it. Stop the worker first
(`docker compose stop image-variant-worker`) if you want messages to sit still while you look.

**DLQ redrive.** A job that fails five receives lands in `ambi-image-variants-dlq`. Fix the
cause, then move them back:

```bash
sqs start-message-move-task \
  --source-arn arn:aws:sqs:elasticmq:000000000000:ambi-image-variants-dlq \
  --destination-arn arn:aws:sqs:elasticmq:000000000000:ambi-image-variants
```

A message the worker cannot parse is *left on the queue*, not deleted, so it redrives itself into
the DLQ after five attempts rather than being lost. Purge it once you have the body.

## 9. Screenshot verification

Capture screenshots of the running app (including behind-login pages) to verify UI work:

```bash
cd frontend && npm run screenshot
```

One-time setup: `npx playwright install chromium`. The script uses the DEV-only
`POST /api/dev/login` endpoint to reach behind-login pages without real OAuth; PNGs land in
`frontend/.screenshots/` (git-ignored). Requires infra plus both servers up.

Full walkthrough: [Dev login & app screenshots](dev-login-and-screenshots.md).
