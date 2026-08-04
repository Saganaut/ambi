# 003 — Votes are answers

**Status:** Accepted
**Date:** 2026-07-30

## Context

Live sessions grew two parallel paths for "a participant chose something". Ordinary submissions go
through the answer store; the same-round `VOTE` phase (best-answer and follow-up voting) goes through
a separate `VoteStore` in `session/redis/`, with its own key namespace and TTL config
(`SessionRedisProperties`). The two paths duplicate submit, tally, and resubmit handling, and any new
voting feature had to pick one and then re-solve problems the other had already solved.

A vote for a candidate answer is not structurally different from an answer to a question: one
participant, one round, one choice, tallied and revealed the same way.

## Decision

Voting features go through the answer store from here on. `VoteStore` and the `VOTE` phase remain
shipped and unchanged — they back live behaviour today — but are **deprecated in direction**: new
voting work must not extend them, and they are to be reworked onto the answer-store pattern or
replaced by it.

## Consequences

- One submit/tally/resubmit path to reason about, test, and fix.
- Follow-up voting already routes this way, so the shapes are proven before the migration.
- Cost: `VoteStore` lingers as live-but-frozen code until someone does the rework, which is the
  ambiguous state this record exists to make legible.
- Until the rework lands, a reader of `session/redis/` sees two stores with no in-code signal that
  one is terminal.

## Alternatives considered

- **Keep both stores permanently.** Rejected: the duplication was already producing divergent
  resubmit and tally behaviour between the two paths.
- **Migrate `VoteStore` immediately.** Rejected as scope — the `VOTE` phase works, and a live-session
  storage migration is not worth pausing feature work for. Recording the direction is enough to stop
  the divergence growing.
