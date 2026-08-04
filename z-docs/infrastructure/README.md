# Infrastructure

The local dev stack, how it is configured, and how work is verified.

## In this folder

- [Infrastructure](infrastructure.md) — the Docker Compose services, ports, and where state lives.
- [Environment variables](environment-variables.md) — `dev.env` sourcing and the variable reference.
- [Key entry points](key-entry-points.md) — the files worth knowing first.
- [Gotchas](gotchas.md) — non-obvious behaviours (codegen, Docker, seeding, `dev.env`).
- [Testing & CI](testing-and-ci.md) — test stacks and the three local enforcement tiers.

The stack tables and package layout live in
[System Overview](../diagrams/system-overview.md).

## Per-directory READMEs (next to their code)

- [Frontend README](../../frontend/README.md) — setup, Vite, scripts.
- [Frontend STYLES.md](../../frontend/STYLES.md) — the styling source of truth that [styling-rules](../rules/styling-rules.md) summarizes.
- [Frontend SOCKJS global fix](../../frontend/SOCKJS_GLOBAL_FIX.md) — why `vite.config.ts` defines `global: "globalThis"`.
- [Tools README](../../tools/README.md) — repo tooling, including `doc-lint.js`.

## Backend package design docs (next to their code)

- [`auth`](../../backend/src/main/java/com/cephadex/ambi/auth/README.md) — identity, sessions, and the security invariants.
- [`session`](../../backend/src/main/java/com/cephadex/ambi/session/README.md) — the live-session domain.
- [Session Redis layer](../../backend/src/main/java/com/cephadex/ambi/session/redis/README.md) — per-session locks and round state.
- [`deck`](../../backend/src/main/java/com/cephadex/ambi/presentation/deck/README.md) — the `Deck` aggregate and who may view/edit/manage it.
- [`slide`](../../backend/src/main/java/com/cephadex/ambi/presentation/slide/README.md) — the embedded `Slide` model.
