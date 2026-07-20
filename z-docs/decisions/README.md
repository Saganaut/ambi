# Architecture Decisions

Short Architecture Decision Records (ADRs): "we chose X over Y because Z". One file per decision, named `NNN-short-slug.md` (e.g. `001-embedded-deck-elements.md`).

## Index

- [001 — Observability & logging stack](001-observability-stack.md) — hybrid CloudWatch (logs/metrics) + Sentry (errors/RUM, deferred), structured JSON, `X-Request-Id`→`traceId` correlation, LocalStack for local parity.
- [002 — Auto-close round timers for live sessions](002-live-session-round-timers.md) — timed rounds auto-close via a Redis ZSET deadline poll (`DeadlineScheduler`); `LiveRoundState` gains `durationMs`/`pausedAt`/`accumulatedPauseMs`; host-disconnect grace rides the same scheduler.

## Template

Use this skeleton for new ADRs:

```markdown
# NNN — Decision title

**Status:** Accepted | Superseded by [link] | Proposed
**Date:** YYYY-MM-DD

## Context
What problem we faced, what constraints applied.

## Decision
What we chose to do.

## Consequences
What this enables, what it costs, what it locks us out of.

## Alternatives considered
Briefly, and why we didn't pick them.
```
