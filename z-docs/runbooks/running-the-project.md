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

## 2. Infrastructure

```bash
docker compose up -d
```

Starts MongoDB (`:27017`), Redis (`:6379`), RedisInsight (`:8001`), Garage S3 (`:3900`),
Mongo Express (`:8081`), and LocalStack (`:4566`). See
[Environment Variables](../infrastructure/environment-variables.md) and
[Gotchas](../infrastructure/gotchas.md).

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

## 8. Inspecting the data

Mongo: <http://localhost:8081> — see [Using Mongo Express](using-mongo-express.md).

Redis (no GUI in this stack):

```bash
docker exec -it ambi-redis redis-cli -a password
KEYS spring:session:*                 # Spring Session keys
TTL spring:session:sessions:<id>      # confirm guest TTLs count down
FLUSHALL                              # dev only — invalidates every session
```

## 9. Screenshot verification

Capture screenshots of the running app (including behind-login pages) to verify UI work:

```bash
cd frontend && npm run screenshot
```

One-time setup: `npx playwright install chromium`. The script uses the DEV-only
`POST /api/dev/login` endpoint to reach behind-login pages without real OAuth; PNGs land in
`frontend/.screenshots/` (git-ignored). Requires infra plus both servers up.

Full walkthrough: [Dev login & app screenshots](dev-login-and-screenshots.md).
