# Gotchas

Non-obvious behaviours that trip people up. Feature-specific gotchas live in their feature docs.

- The per-feature `*Api.gen.ts` clients are regenerated from `http://localhost:8080/v3/api-docs` — the backend must be running when you run codegen.
- `spring.docker.compose.enabled=false` — Spring does **not** auto-start Docker; run `docker compose up -d` yourself.
- **Seeding is manual.** A normal `./mvnw spring-boot:run` boot does nothing. `scripts/seed-sample-data.sh` runs the app with `--seed.run=true`, which is the only thing that activates `SampleDataSeeder`. The seeder is idempotent per collection per user and never deletes anything.
- `dev.env` is read only by the scripts that source it (`scripts/ambi.sh`, `scripts/ambi-podman.sh`, `scripts/seed-sample-data.sh`); a bare `./mvnw spring-boot:run` ignores it and falls back to the `${VAR:default}` values baked into `application.properties`. Tests use `application-test.properties` and never read `dev.env` at all.
- WebSocket support is live for live sessions: `session/transport/WebSocketConfig` registers a `/ws` STOMP endpoint with a `/topic` broker, and the Redis-backed relay fans live-session events out to it. See [live-session](../diagrams/live-session.md).
- Deck-editor and MCQ-specific gotchas (multi-correct `correctOptionIds`, hand-edits to the codegen file, primitive defaults in element payloads, Lorem Picsum image placeholders) are documented in [features/deck-editor](../features/deck-editor/README.md).
