# Ambi Documentation Hub

All project documentation lives under this folder. Each subfolder owns a topic and has its own `README.md` listing the docs inside. The repo root keeps only `README.md`, `AGENTS.md`, and `CLAUDE.md` as top-level docs.

Reachability is enforced by `tools/doc-lint.js`: every `.md` file in the repo must be reachable from the root `README.md` through a chain of markdown links, so link new docs from their folder README. How to write one is covered by [documentation-rules](rules/documentation-rules.md).

## Top-level docs (outside `z-docs/`)

- [AGENTS.md](../AGENTS.md) — Agent guide: project layout, conventions, key files.
- `CLAUDE.md` — Pointer to AGENTS.md for Claude Code; excluded from the linter.

## Categories

- [Rules](rules/README.md) — Coding conventions per layer (general, backend, frontend, style, icons).
- [Features](features/README.md) — Per-feature design docs: what each feature is, its model, and its seams.
- [Diagrams](diagrams/README.md) — Architecture diagrams (Mermaid): context, ERD, sequences, state machines.
- [Infrastructure](infrastructure/README.md) — Docker services, environment variables, testing and CI.
- [Runbooks](runbooks/README.md) — Operational procedures: local startup, data inspection, logging, the Trello board.
- [Decisions](decisions/README.md) — Architecture decision records (ADRs), plus decisions settled without one.
- [Security](security/README.md) — Security posture: audit findings, their status, and the release gates.
- [Notes](notes/README.md) — Working notes and reference snippets.

## Single-file references

- [About Ambi](about.md) — What the project is and the current feature inventory.
- [Glossary](glossary.md) — Domain terms (deck, slide, participant, round, session, theme, tally, …).
