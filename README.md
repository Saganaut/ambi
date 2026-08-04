# Ambi

## License

© [2026] [Kevin McCarthy]. All rights reserved.
This is a public repository for viewing purposes only. No permission is granted to use, copy, modify, or distribute this code.

## About

An interactive presentation platform: presenters author decks of interactive slides and run them live while the audience participates from their own devices.  

## Frontend

* **Core Framework:** React 19 + TypeScript
* **State Management:** RTK Toolkit
* **Routing:** TanStack Router
* **Styling:** CSS Modules
* **Build Tool:** Vite
* **Linting & Formatting:** Oxlint, stylelint, prettier
* **Testing:** Vitest + Playwright + storybooks
* **UI Positioning & Popovers:** FloatingUI
* **Other Libraries:** DndKit, heroicons, tiptap,

## Backend

* **Language & Runtime:** Java 26
* **Framework:** Spring Boot 4
* **Databases & Storage:** MongoDB, Redis, S3 (Garage for dev)

## Quickstart

```bash
docker compose up -d or run .                             
 # MongoDB, Redis, Garage S3
cd backend && set -a && source ../dev.env && set +a && ./mvnw spring-boot:run   # :8080
cd frontend && npm install && npm run dev              # :5173
```

`./scripts/ambi.sh` (Or `./scripts/ambi-podman.sh` if using podman) brings the whole stack up in one command. See the
[Running the project](z-docs/runbooks/running-the-project.md) runbook for details.

## Documentation

* [Documentation hub](z-docs/README.md) — rules, features, diagrams, infrastructure, decisions, and runbooks.
* [Agent guide](AGENTS.md) — project layout, conventions, and key files.
