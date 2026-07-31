# Ambi — Agent Guide

An interactive presentation platform: presenters author decks of interactive slides and run them live while the audience participates from their own devices. Full-stack web app — React 19/TypeScript frontend, Java 26 + Spring Boot backend, MongoDB/Redis/S3 — built to an enterprise quality bar.

> **DO NOT TAKE SHORTCUTS.** Always follow the established rules and conventions. Do not bypass testing, documentation, or code review processes for expediency. Quality and maintainability are paramount.
>
> **Never change a test to make it pass without addressing the underlying issue.** Always fix the code or the test to ensure correctness.
>
> **MINIMIZE IN CODE COMMENTS**Only use when absolutely essential.When used keep them short and succinct

---

## Feature workflow

Every completed feature change follows the same three steps — do not skip the last two:

1. **Implement** the change, following the rules in [`z-docs/rules/`](z-docs/rules/README.md), then run [`scripts/check-feature.sh`](scripts/check-feature.sh) (typecheck, full lint, backend compile, null-analysis, docs) until it's clean — the pre-commit hook only runs the fast tier.
2. **Commit it** — invoke the `git-commit-author` agent to stage only the relevant files and write a convention-following message. Do not bypass the pre-commit hooks.
3. **Review it** — invoke the `code-reviewer` agent to review the resulting commit (`HEAD`) against the task's intent, the project rules/style, and functional correctness. It issues a read-only findings report; act on any blocking findings (which restarts this loop) before moving on.

A "feature change" is any self-contained major unit of functional work. Trivial, non-functional edits (a typo fix, a comment) don't require the full loop — use judgement.

Work is tracked on the **Ambi Dev** Trello board: <https://trello.com/b/nH50o6jt/ambi-dev>. **Every task needs a card** — if the user didn't hand you one, create it yourself before starting work. The full card lifecycle (list/label conventions, credential setup, API commands for creating/moving/commenting on cards) lives in the [Using the Trello board](z-docs/runbooks/using-the-trello-board.md) runbook.

---

## Documentation

All project documentation other than this file and the top-level `README.md` lives in [`z-docs/`](z-docs/README.md) — its README is the canonical category index, so start there rather than expecting a table here.

- **New docs belong in `z-docs/<category>/`, not at the repo root.** The root keeps only `README.md`, `AGENTS.md`, and `CLAUDE.md` as top-level docs.
- **Reachability is enforced.** Always link a new doc from the appropriate folder's `README.md`. Cross-references use standard markdown links (e.g. `[backend-rules](backend-rules.md)`).
- Run [`scripts/check-docs.sh`](scripts/check-docs.sh) after changing any documentation (reachability + markdownlint; also part of the pre-commit hook). Tooling details live in [`tools/README.md`](tools/README.md).

---

## Running the project

```bash
docker compose up -d                          # MongoDB :27017, Redis :6379, Garage S3 :3900
cd backend && ./mvnw spring-boot:run           # http://localhost:8080
cd frontend && npm install && npm run dev      # http://localhost:5173
```

After backend changes, regenerate the committed frontend codegen artifacts with `npm run generate` (never hand-edit them — see [generated-artifacts](z-docs/rules/frontend/generated-artifacts.md)). Sample-data seeding and screenshot-based UI verification are also part of the everyday loop — full commands and details live in the [Running the project](z-docs/runbooks/running-the-project.md) runbook.
