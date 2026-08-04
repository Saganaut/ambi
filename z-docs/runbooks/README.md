# Runbooks

Step-by-step procedures with concrete commands — One file per procedure, named for the action.

## Index

- [Running the project](running-the-project.md) — local startup, codegen, seeding, data inspection, screenshots.
- [Running tests & reading the reports](running-tests.md) — both suites, where failures are written to disk, `scripts/test-report.sh`.
- [Using Mongo Express](using-mongo-express.md) — browse and drop collections at `:8081`.
- [Using the observability stack](using-the-observability-stack.md) — logging conventions and the `X-Request-Id`→`traceId` check.
- [Dev login & app screenshots](dev-login-and-screenshots.md) — `POST /api/dev/login` and headless capture.
- [Using the Trello board](using-the-trello-board.md) — board structure and the Trello REST curls.

Project skills live in [`.claude/skills/`](../../.claude/skills/) — each `SKILL.md` documents
itself.

Conventions are not runbooks — those go in [Rules](../rules/README.md). One-time design decisions
go in [Decisions](../decisions/README.md).
