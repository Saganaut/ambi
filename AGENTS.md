# BrainFlex — Agent Guide

A full-stack web app for competitive brain games. Learning project focused on MongoDB, Java, and Spring Boot. Built as a paired-down version of Cephadex Games.

> **DO NOT TAKE SHORTCUTS.** Always follow the established rules and conventions. Do not bypass testing, documentation, or code review processes for expediency. Quality and maintainability are paramount.

---

## Project Layout

```
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

All project documentation other than this file and the top-level `README.md` lives in **`z-docs/`**. Start at [`z-docs/README.md`](z-docs/README.md) for the full index.

| Where to look                                               | For                                                                         |
| ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| [`z-docs/rules/`](z-docs/rules/README.md)                   | Coding conventions per layer (general / backend / frontend / style / icons) |
| [`z-docs/features/`](z-docs/features/README.md)             | Per-feature design docs (auth, games, deck editor, membership, data models) |
| [`z-docs/infrastructure/`](z-docs/infrastructure/README.md) | Docker, MongoDB, Redis, Garage/S3, testing & CI                             |
| [`z-docs/to-do/`](z-docs/to-do/README.md)                   | Mentimeter/Kahoot parity roadmap (numbered chunks) + general TODO           |
| [`z-docs/decisions/`](z-docs/decisions/README.md)           | Architecture Decision Records                                               |
| [`z-docs/runbooks/`](z-docs/runbooks/README.md)             | Operational procedures (seeding, secret rotation, recovery)                 |
| [`z-docs/glossary.md`](z-docs/glossary.md)                  | Domain terms (deck, element, interactive session, theme, MCQ, …)            |

**Reachability is enforced.** `tools/doc-lint.js` walks the link graph from the root `README.md` and fails on any `.md` file that isn't reachable via standard markdown links. Always link new docs from the appropriate folder's `README.md`. Cross-references must use standard markdown links (e.g. `[BACKEND-RULES](BACKEND-RULES.md)`); the old `@FILENAME.md` convention has been retired.

New design / rule / architecture docs belong in `z-docs/<category>/`, **not** at the repo root. The root keeps only `README.md`, `AGENTS.md`, and `CLAUDE.md` as top-level docs.

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

**Regenerate the API client** after backend changes (backend must be running):

```bash
cd frontend
npx @rtk-query/codegen-openapi openapi-config.cts
# Overwrites src/store/BrainFlexApi.ts — do not edit that file manually
```

**Seed sample data** (LOTR dataset; idempotent per collection per user, never destructive — stop any running backend first):

```bash
./scripts/seed-sample-data.sh
```

---

## Architecture at a glance

### Frontend

| Concern      | Tool                                                                        |
| ------------ | --------------------------------------------------------------------------- |
| Framework    | React 19 with React Compiler                                                |
| Language     | TypeScript (strict)                                                         |
| Build        | Vite                                                                        |
| Routing      | TanStack Router (file-based, code-splitting)                                |
| State / Data | Redux Toolkit + RTK Query (RTK Query is the primary cache)                  |
| API client   | Auto-generated from OpenAPI schema                                          |
| Styling      | CSS Modules + CSS custom properties (tokens.css)                            |
| Rich text    | TipTap (see [Deck Editor](z-docs/features/deck-editor/README.md))           |
| Icons        | SVG via `vite-plugin-svgr` (see [ICONS-RULES](z-docs/rules/ICONS-RULES.md)) |

Conventions: see [FRONTEND-RULES](z-docs/rules/FRONTEND-RULES.md) and [STYLE-RULES](z-docs/rules/STYLE-RULES.md).

### Backend

| Concern         | Tool                               |
| --------------- | ---------------------------------- |
| Language        | Java 26                            |
| Framework       | Spring Boot 4                      |
| Build           | Maven (`./mvnw`)                   |
| Database        | MongoDB (Spring Data)              |
| Cache / Pub-Sub | Redis (also backs Spring Session)  |
| Auth            | Spring Security + Google OAuth 2.0 |
| API docs        | SpringDoc OpenAPI v2               |
| Boilerplate     | Lombok                             |

Package: `cephadex.ambi`. Layers: `controller/`, `service/`, `repository/`, `model/`, `dto/`, `config/`. Conventions: see [BACKEND-RULES](z-docs/rules/BACKEND-RULES.md).

### REST API

Endpoints are prefixed `/api` and documented live at **`http://localhost:8080/swagger-ui/`**. CORS allows only `http://localhost:5173` with credentials. For non-trivial flows:

- Auth (`/api/auth/**`, sessions, OAuth) → [features/auth](z-docs/features/auth/README.md)
- Sessions / Decks / Elements (`/api/decks/**`, `/api/interactive-sessions/**`) → [features/games](z-docs/features/games/README.md)
- Themes / Organizations (`/api/themes/**`, `/api/organizations/**`) → [features/data-models](z-docs/features/data-models.md) + [features/membership](z-docs/features/membership/README.md)

### Data models

User / PlayerStats / Organization / Theme MongoDB documents + DTOs + image processing tiers are documented in [features/data-models](z-docs/features/data-models.md). The sealed `DeckElement` / `AnswerPayload` hierarchies (questions, slides, answers) live in [features/games](z-docs/features/games/README.md).

### Authentication

Google OAuth + guest sessions, cookie-based with Spring Session backed by Redis. Full flow, role hierarchy, and gotchas in [features/auth](z-docs/features/auth/README.md).

---

## Environment Variables

Local dev secrets live in `dev.env` at the project root (copy from `example.env`; not committed). Backend loads them via `DotenvEnvironmentPostProcessor`. Frontend accesses `VITE_`-prefixed vars.

| Variable                                       | Used By                                        |
| ---------------------------------------------- | ---------------------------------------------- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`    | Backend (OAuth)                                |
| `MONGO_URI`                                    | Backend                                        |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | Backend                                        |
| `VITE_API_BASE_URL`                            | Frontend (defaults to `http://localhost:8080`) |

Test-profile values live in `backend/src/test/resources/application-test.properties` with test-safe defaults — see [Testing & CI](z-docs/infrastructure/testing-and-ci.md).

---

## Testing

Stacks, CI workflow, and local pre-commit / pre-push hooks: see [Testing & CI](z-docs/infrastructure/testing-and-ci.md).

**Never change a test to make it pass without addressing the underlying issue. Always fix the code or the test to ensure correctness.**

---

## Key entry points

| File                                       | Purpose                                                   |
| ------------------------------------------ | --------------------------------------------------------- |
| `frontend/src/store/BrainFlexApi.ts`       | Auto-generated RTK Query API — **do not edit**            |
| `frontend/src/routes/__root.tsx`           | Root layout (TanStack Router + shared AuthBar)            |
| `frontend/src/hooks/useCurrentUser.ts`     | Auth state machine (visitor/guest/registered)             |
| `frontend/openapi-config.cts`              | API codegen config                                        |
| `backend/.../config/SecurityConfig.java`   | Auth, CORS, public routes, OAuth2 success handler         |
| `backend/.../config/SampleDataSeeder.java` | Manual sample-data seeder (`scripts/seed-sample-data.sh`) |
| `compose.yaml`                             | Docker services (MongoDB, Redis, Garage S3)               |
| `dev.env`                                  | Local dev secrets (copy from `example.env`)               |

Feature-specific file maps live in each feature doc — e.g. [deck editor key files](z-docs/features/deck-editor/README.md#key-files), [auth key files](z-docs/features/auth/README.md#key-files).

---

## Gotchas

- `BrainFlexApi.ts` is regenerated from `http://localhost:8080/v3/api-docs` — the backend must be running when you run codegen.
- `spring.docker.compose.enabled=false` — Spring does **not** auto-start Docker; run `docker compose up -d` yourself.
- **Seeding is manual.** A normal `./mvnw spring-boot:run` boot does nothing. `scripts/seed-sample-data.sh` runs the app with `--seed.run=true`, which is the only thing that activates `SampleDataSeeder`. The seeder is idempotent per collection per user and never deletes anything.
- `DotenvEnvironmentPostProcessor` silently skips if `dev.env` is missing — tests do not rely on it at all.
- WebSocket support is a dependency but no WebSocket endpoints are implemented yet.
- Deck-editor and MCQ-specific gotchas (multi-correct `correctOptionIds`, hand-edits to the codegen file, primitive defaults in element payloads, Lorem Picsum image placeholders) are documented in [features/deck-editor](z-docs/features/deck-editor/README.md#gotchas).
