# Architecture at a glance

The tech stack for each layer, plus the REST API and authentication model.

## Frontend

| Concern      | Tool                                                                        |
| ------------ | --------------------------------------------------------------------------- |
| Framework    | React 19 with React Compiler                                                |
| Language     | TypeScript (strict)                                                         |
| Build        | Vite                                                                        |
| Routing      | TanStack Router (file-based, code-splitting)                                |
| State / Data | Redux Toolkit + RTK Query (RTK Query is the primary cache)                  |
| API client   | Auto-generated from OpenAPI schema                                          |
| Styling      | CSS Modules + CSS custom properties (tokens.css)                            |
| Rich text    | TipTap (see [Deck Editor](../features/deck-editor/README.md))               |
| Icons        | SVG via `vite-plugin-svgr` (see [icons-rules](../rules/icons-rules.md))     |

Conventions: see [frontend-rules](../rules/frontend-rules.md) and [styling-rules](../rules/styling-rules.md).

## Backend

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

Package: `cephadex.ambi`. Layers: `controller/`, `service/`, `repository/`, `model/`, `dto/`, `config/`. Conventions: see [backend-rules](../rules/backend-rules.md).

## REST API

Endpoints are prefixed `/api` and documented live at **`http://localhost:8080/swagger-ui/`**. CORS allows only `http://localhost:5173` with credentials.

> Per-feature backend docs (auth, games, data models) are being rewritten alongside the backend itself — the [Membership](../features/membership/README.md) frontend doc and the [Exception Handling](../features/exceptions.md) contract are what's currently checked in.

## Authentication

Google OAuth + guest sessions, cookie-based with Spring Session backed by Redis.
