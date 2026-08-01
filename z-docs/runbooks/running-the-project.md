# Running the project

The everyday local dev loop: bring up infrastructure, run both servers, and keep generated
artifacts / sample data / screenshots in sync as you work.

## 1. Start infrastructure

```bash
docker compose up -d
```

Brings up MongoDB (`:27017`), Redis (`:6379`), and Garage S3 (`:3900`). Required before the backend
will boot. See [Environment Variables](../infrastructure/environment-variables.md) for the values
the backend needs (S3/OAuth credentials, etc.) and [Gotchas](../infrastructure/gotchas.md) for
known rough edges.

## 2. Start the backend

```bash
cd backend && ./mvnw spring-boot:run
```

- App: <http://localhost:8080>
- Swagger UI: `/swagger-ui/`
- OpenAPI spec: `/v3/api-docs`

## 3. Start the frontend

```bash
cd frontend && npm install && npm run dev
```

- App: <http://localhost:5173>

## 4. Regenerate frontend codegen artifacts

After backend changes (the backend must be running):

```bash
cd frontend
npm run generate          # API client + validation constants + enums
```

All of these are committed and **must not be hand-edited**. How the codegen single source of truth
works — and the individual `generate-api` / `generate-validation` / `generate-enums` scripts — is
documented in [generated-artifacts](../rules/frontend/generated-artifacts.md).

## 5. Seed sample data

```bash
./scripts/seed-sample-data.sh
```

Loads the LOTR sample dataset. Idempotent per collection per user and never destructive — but stop
any running backend first.

## 6. One-off data migrations

A schema change that the current model can no longer read gets a one-shot `ApplicationRunner` under
`backend/src/main/java/com/cephadex/ambi/config/`, activated by its own `*.run=true` property and
fronted by a script in `scripts/`. Each runs once, rewrites documents in place, exits, and is
idempotent — re-running matches nothing.

```bash
./scripts/migrate-place-on-image.sh --dry-run   # log the affected counts, write nothing
./scripts/migrate-place-on-image.sh             # rewrite
```

`migrate-place-on-image.sh` rewrites legacy `PLACE_ON_IMAGE` slide content from the old
`content.correctTargets` list into the current `items` + `correctPositions` + `tolerance` shape, in
both the `decks` collection and the deck snapshots embedded in `LiveSessions`. Like the seeder it
binds a random port, so it can run alongside a backend on 8080. Always take a dry run first.

## 7. Screenshot verification

Capture screenshots of the running app (including behind-login pages) to verify UI work:

```bash
cd frontend && npm run screenshot
```

One-time setup: `npx playwright install chromium`. The script uses the DEV-only
`POST /api/dev/login` endpoint to reach behind-login pages without real OAuth; PNGs land in
`frontend/.screenshots/` (git-ignored). Requires infra plus both servers up.

See [Testing & CI → Screenshot verification](../infrastructure/testing-and-ci.md#screenshot-verification-dev-only)
for the design/implementation background, and the
[Dev login & app screenshots](dev-login-and-screenshots.md) runbook for the full walkthrough
(manual browser login, curl-based API testing, notes & gotchas).
