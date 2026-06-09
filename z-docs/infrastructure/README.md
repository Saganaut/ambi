# Infrastructure

Notes on the local dev stack (Docker Compose, MongoDB, Redis, Garage/S3) and per-directory READMEs.

## In this folder

- [Infrastructure overview](infrastructure.md) — Full notes on Docker services, persistence, sessions, and deployment-relevant details.
- [Testing & CI](testing-and-ci.md) — Backend + frontend test stacks, CI workflow, pre-commit / pre-push git hooks.

## Per-directory READMEs (live next to their code)

- [Backend README](../../backend/README.MD) — Backend setup, Maven wrapper, profiles.
- [Backend HELP.md](../../backend/HELP.md) — Spring Initializr help file (kept around in case the generator emits new links).
- [Frontend README](../../frontend/README.md) — Frontend setup, Vite, scripts.
- [Frontend STYLES.md](../../frontend/STYLES.md) — Full styling guide (the source of truth that [styling-rules.md](../rules/styling-rules.md) summarizes).
- [Frontend SOCKJS global fix](../../frontend/SOCKJS_GLOBAL_FIX.md) — Why `vite.config.ts` defines `global: "globalThis"`.
- [Tools README](../../tools/README.md) — Repo-level tooling, including `doc-lint.js`.
- [Session Redis layer](../../backend/src/main/java/com/cephadex/ambi/session/redis/README.md) — Per-session locks and the in-flight round-state store backed by Redis.
