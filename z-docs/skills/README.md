# Claude Code Skills

Notes on Claude Code skills used while working on Ambi. Skills are reusable agent prompts/configurations that live in `~/.claude/skills/` (user-global) or `.claude/skills/` (project-local).

## Index

- [`.claude/skills/verify/SKILL.md`](../../.claude/skills/verify/SKILL.md) — `verify`: drives the running Ambi app with Playwright to verify frontend changes end-to-end (dev login, fresh deck, editor flows, persisted-content assertions).

## What belongs here

- Documentation for any project-local skill files under `.claude/skills/`.
- Notes on how user-global skills are configured for working in this repo.
- Workflows that combine multiple skills.

The `memory/` folder at the repo root is excluded from the doc-lint chain — it stores agent state, not project docs.
