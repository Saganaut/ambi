# Ambi — Agent Guide

An interactive presentation platform: presenters author decks of interactive slides and run them live while the audience participates from their own devices. Full-stack web app — React 19/TypeScript frontend, Java 26 + Spring Boot backend, MongoDB/Redis/S3 — built to an enterprise quality bar.

> **DO NOT TAKE SHORTCUTS.** Always follow the established rules and conventions. Do not bypass testing, documentation, or code review processes for expediency. Quality and maintainability are paramount.
>
> **Never change a test to make it pass without addressing the underlying issue.** Always fix the code or the test to ensure correctness.

---

## Feature workflow (commit + review after every feature change)

Every completed feature change follows the same three steps — do not skip the last two:

1. **Implement** the change, following the rules in [`z-docs/rules/`](z-docs/rules/README.md).
2. **Commit it** — invoke the `git-commit-author` agent to stage only the relevant files and write a convention-following message. Do not bypass the pre-commit hooks.
3. **Review it** — invoke the `code-reviewer` agent to review the resulting commit (`HEAD`) against the task's intent, the project rules/style, and functional correctness. It issues a read-only findings report; act on any blocking findings (which restarts this loop) before moving on.

A "feature change" is any self-contained unit of functional work. Trivial, non-functional edits (a typo fix, a comment) don't require the full loop — use judgement.

### Task tracking

Work is tracked on the **Ambi Dev** Trello board: <https://trello.com/b/nH50o6jt/ambi-dev> (Backlog → To Do → In Progress → Done, with P0–P3 priority labels). **Every task needs a card** — if the user didn't hand you one, create it yourself (in the right list, with a description of the task's goals) before starting work. Move a card to **In Progress** when you pick it up; when the commit + review loop passes, add a comment summarizing what was done and the landing commit hash, then move the card to **Done**. Agents drive the board via the Trello REST API — see the [Using the Trello board](z-docs/runbooks/using-the-trello-board.md) runbook for credential setup, card commands, and the full ticket-lifecycle rules.

---

## Project Layout

```text
ambi/
├── frontend/          # React 19 + TypeScript + Vite
├── backend/           # Java 26 + Spring Boot 4
├── compose.yaml       # Docker Compose (MongoDB + Redis + Garage S3)
├── z-docs/            # All project documentation — see Documentation below
└── README.md
```

Per-directory READMEs (`backend/README.MD`, `frontend/README.md`, `tools/README.md`) live next to their code and are linked from [`z-docs/infrastructure/README.md`](z-docs/infrastructure/README.md).

---

## Documentation

**All project documentation other than this file and the top-level `README.md` lives in [`z-docs/`](z-docs/README.md).** Start there for the full index. This guide stays deliberately short — it holds only the rules an agent always needs plus a quickstart; everything else is a link.

| Where to look                                               | For                                                                          |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [`z-docs/rules/`](z-docs/rules/README.md)                   | Coding conventions per layer (general / backend / frontend / style / icons)  |
| [`z-docs/features/`](z-docs/features/README.md)             | Per-feature design docs (deck editor, membership, exception handling)        |
| [`z-docs/infrastructure/`](z-docs/infrastructure/README.md) | Architecture overview, env vars, key entry points, gotchas, Docker, testing & CI |
| [`z-docs/decisions/`](z-docs/decisions/README.md)           | Architecture Decision Records                                                |
| [`z-docs/runbooks/`](z-docs/runbooks/README.md)             | Operational procedures (seeding, secret rotation, recovery)                  |
| [`z-docs/glossary.md`](z-docs/glossary.md)                  | Domain terms (deck, element, interactive session, theme, MCQ, …)             |

### Documentation rules

- **New docs belong in `z-docs/<category>/`, not at the repo root.** The root keeps only `README.md`, `AGENTS.md`, and `CLAUDE.md` as top-level docs.
- **Reachability is enforced.** Always link a new doc from the appropriate folder's `README.md`. Cross-references use standard markdown links (e.g. `[backend-rules](backend-rules.md)`); the old `@FILENAME.md` convention has been retired.
- **Two checks guard the docs**, both run by [`scripts/check-docs.sh`](scripts/check-docs.sh) (also part of the pre-commit hook):
  - `tools/doc-lint.js` — walks the link graph from the root `README.md` and fails on any `.md` file not reachable via standard markdown links.
  - `markdownlint-cli2` — markdown style/formatting (config in `.markdownlint-cli2.jsonc`).

  Run `scripts/check-docs.sh` after changing any documentation.

---

## Running the Project

```bash
# 1. Infrastructure (required first)
docker compose up -d        # MongoDB :27017, Redis :6379, Garage S3 :3900

# 2. Backend
cd backend && ./mvnw spring-boot:run
# http://localhost:8080  ·  Swagger UI: /swagger-ui/  ·  OpenAPI: /v3/api-docs

# 3. Frontend
cd frontend && npm install && npm run dev
# http://localhost:5173
```

**Regenerate the generated frontend artifacts** after backend changes (backend must be running). All are committed and **must not be hand-edited**:

```bash
cd frontend
npm run generate          # API client + validation constants + enums
```

How the codegen single source of truth works — and the individual `generate-api` / `generate-validation` / `generate-enums` scripts — is documented in [generated-artifacts](z-docs/rules/frontend/generated-artifacts.md).

**Seed sample data** (LOTR dataset; idempotent per collection per user, never destructive — stop any running backend first):

```bash
./scripts/seed-sample-data.sh
```

**Screenshot the running app** to verify UI work (infra + both servers up; one-time `npx playwright install chromium`). Uses the DEV-only `POST /api/dev/login` to reach behind-login pages; PNGs land in `frontend/.screenshots/`. See [Testing & CI](z-docs/infrastructure/testing-and-ci.md#screenshot-verification-dev-only):

```bash
cd frontend && npm run screenshot
```

---

## Where to go next

- **Architecture, env vars, entry points, gotchas** → [`z-docs/infrastructure/`](z-docs/infrastructure/README.md)
- **Auth** → Google OAuth + guest sessions, cookie-based with Spring Session backed by Redis; see [`SecurityConfig.java`](z-docs/infrastructure/key-entry-points.md).
- **Testing & CI** → [Testing & CI](z-docs/infrastructure/testing-and-ci.md)
- **Environment variables** → [Environment Variables](z-docs/infrastructure/environment-variables.md)
