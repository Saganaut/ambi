# Ambi

An interactive presentation platform: presenters author decks of interactive slides and run them
live while the audience participates from their own devices. React 19 + TypeScript frontend,
Java 26 + Spring Boot 4 backend, MongoDB/Redis/S3.

## Quickstart

```bash
docker compose up -d                                   # MongoDB, Redis, Garage S3
cd backend && set -a && source ../dev.env && set +a && ./mvnw spring-boot:run   # :8080
cd frontend && npm install && npm run dev              # :5173
```

`./scripts/ambi.sh` brings the whole stack up in one command. See the
[Running the project](z-docs/runbooks/running-the-project.md) runbook for details.

## Documentation

- [Documentation hub](z-docs/README.md) — rules, features, diagrams, infrastructure, decisions, and runbooks.
- [Agent guide](AGENTS.md) — project layout, conventions, and key files.
