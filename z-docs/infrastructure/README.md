# Infrastructure

Notes on the local dev stack (Docker Compose, MongoDB, Redis, Garage/S3) and per-directory READMEs.

## In this folder

- [Architecture at a glance](architecture-overview.md) — Frontend/backend tech stacks, REST API, and the authentication model.
- [Running locally & environment](environment-variables.md) — Dev secrets, `dev.env` sourcing, and the environment-variable reference.
- [Key entry points](key-entry-points.md) — The files worth knowing first when navigating the codebase.
- [Gotchas](gotchas.md) — Non-obvious behaviours (codegen, Docker, seeding, `dev.env`).
- [Infrastructure overview](infrastructure.md) — Full notes on Docker services, persistence, sessions, and deployment-relevant details.
- [Testing & CI](testing-and-ci.md) — Backend + frontend test stacks, CI status, pre-commit / pre-push git hooks.

## Per-directory READMEs (live next to their code)

- [Frontend README](../../frontend/README.md) — Frontend setup, Vite, scripts.
- [Frontend STYLES.md](../../frontend/STYLES.md) — Full styling guide (the source of truth that [styling-rules.md](../rules/styling-rules.md) summarizes).
- [Frontend SOCKJS global fix](../../frontend/SOCKJS_GLOBAL_FIX.md) — Why `vite.config.ts` defines `global: "globalThis"`.
- [Tools README](../../tools/README.md) — Repo-level tooling, including `doc-lint.js`.

## Backend package design docs (live next to their code)

- [`auth` package](../../backend/src/main/java/com/cephadex/ambi/auth/README.md) — Authoritative design + security-invariants doc for identity, sessions, and the auth rewrite.
- [`session` package](../../backend/src/main/java/com/cephadex/ambi/session/README.md) — DDD-light domain notes for a live session (deckRun) — presentation or game.
- [Session Redis layer](../../backend/src/main/java/com/cephadex/ambi/session/redis/README.md) — Per-session locks and the in-flight round-state store backed by Redis.
- [`deck` domain](../../backend/src/main/java/com/cephadex/ambi/presentation/deck/README.md) — The `Deck` aggregate, its CRUD, and who may view/edit/manage a deck.
- [`slide` domain](../../backend/src/main/java/com/cephadex/ambi/presentation/slide/README.md) — The embedded `Slide` model and its permissions within the `Deck` aggregate.
