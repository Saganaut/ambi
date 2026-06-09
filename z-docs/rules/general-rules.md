# General Rules

Cross-cutting rules that apply across the whole project, regardless of layer.

1. **Consistency** — Keep naming, formatting, and architectural patterns uniform across the codebase.
2. **Documentation** — Keep `README.md`, `AGENTS.md`, and the rule docs under `z-docs/rules/` current with significant changes.
3. **Environment variables** — Manage all secrets (API keys, connection strings) via the root env file; never commit them.
4. **Docker Compose** — Start infrastructure with `docker compose up -d` (or `./scripts/ambi.sh`, which starts everything).
5. **Git** — Use clear, concise commit messages focused on the *why*. See [commit-rules.md](commit-rules.md).
6. **No shortcuts** — Never bypass testing, documentation, or review for expediency. Quality and maintainability are paramount.
