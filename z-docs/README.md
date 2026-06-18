# Ambi Documentation Hub

All project documentation lives under this folder. Each subfolder owns a topic and has its own `README.md` that lists the docs inside. The repo root keeps only `README.md`, `AGENTS.md`, and `CLAUDE.md` as top-level docs.

Reachability is enforced by `tools/doc-lint.js`: every `.md` file under the repo must be reachable from the root `README.md` via a chain of standard markdown links. Each folder README is part of that chain — link new docs from the appropriate folder README so they stay visible.

## Top-level docs (outside `z-docs/`)

- [AGENTS.md](../AGENTS.md) — Agent guide: project layout, conventions, key files.
- `CLAUDE.md` — Pointer to AGENTS.md for Claude Code; excluded from the linter.

## Categories

- [Rules](rules/README.md) — Coding conventions per layer (general, backend, frontend, style, icons).
- [Infrastructure](infrastructure/README.md) — Docker, MongoDB, Redis, Garage/S3, per-directory READMEs.
- [Features](features/README.md) — Per-feature design docs (deck editor, membership, exception handling).
- [Notes](notes/README.md) — Working notes and reference snippets.
- [Decisions](decisions/README.md) — Architecture decision records (ADRs).
- [Runbooks](runbooks/README.md) — Operational procedures (seeding, secret rotation, recovery).
- [Skills](skills/README.md) — Claude Code skills used in this project.

## Single-file references

- [Glossary](glossary.md) — Domain terms (deck, element, interactive session, organization, theme, slide, MCQ, …).
- [Live Session — Open Decisions](live-session-open-decisions.md) — Pre-implementation review of the live-session feature: unresolved design decisions (transport, identity, scoring, persistence) with suggestions.
