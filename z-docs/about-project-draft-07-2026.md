# About Ambi — Draft (July 2026)

> **Status: draft.** This document re-states what Ambi is, based on a July 2026 survey of the
> actual codebase. Once approved, its framing should replace the stale "learning project /
> brain games" identity that still appears in several docs (see
> [Docs that still carry the old identity](#docs-that-still-carry-the-old-identity)).

## What Ambi is

**Ambi is an interactive presentation platform.** A presenter authors a deck of slides — some
purely presentational, most interactive — and runs it live in front of an audience. Participants
join from their own devices via a room code or QR code, answer in real time, and see responses,
results, and standings unfold on the shared board. The product is built around three pillars:

- **Flexibility** — 17 slide content types span classic presentation slides (title, content,
  media, instruction) and a wide range of interactive formats: multiple choice, free text,
  numbers, ranking, scales, 2D axis placement, grids, matching, point allocation,
  place-on-image, freehand drawing, audience Q&A, and follow-up slides that build their
  question from the previous round's submissions. Decks, themes, and settings compose through
  a deck-default → per-slide override hierarchy so authors control exactly as much as they
  want to.
- **Data** — every submission is a typed, per-participant, per-round answer document. Rounds
  are evaluated and scored server-side, tallied live for the board, and projected into durable
  results for post-round charting (bar, pie, line, Pareto, dot plot, histogram, word cloud).
  Deck-level stats and an analytics rollup model (completion rates, per-slide difficulty,
  discrimination index) point at where the data story is headed.
- **Competitiveness** — sessions are hosted games as much as presentations: scored rounds with
  timers and phased reveals, a live leaderboard, best-answer voting where the audience picks
  the winning submission, and prediction follow-ups that ask players to guess the crowd's
  answer (scoring for predictions is still to come).

Ambi is **not** a learning project, and it is not a brain-training or quiz-drill app. It is
being built to an **enterprise quality bar**: reviewed commits, enforced conventions, typed
end-to-end contracts (OpenAPI codegen as the single source of truth), a token-driven design
system synced with Figma, documented ADRs, and security invariants that are tracked and
checked off rather than assumed.

## The product today

A snapshot of what exists in code as of July 2026, grouped by product area. Maturity is
called out honestly: *solid* (works end-to-end), *partial* (real but incomplete), *stub*
(scaffold or schema only).

### Authoring

- **Deck editor** *(solid)* — three-column workspace (drag-reorderable slide rail, canvas,
  inspector) with per-type content editors, debounced auto-commit, inline title editing,
  speaker notes, and participant instructions.
- **Rich text** *(solid)* — TipTap editing stored as sanitized HTML (DOMPurify client-side,
  OWASP sanitizer server-side).
- **Theming** *(solid)* — 16-role color palettes with light/dark appearance; the default
  "Ambi Light"/"Ambi Dark" looks are painted from `tokens.css`, plus 6 DB-backed built-in
  presets (Catppuccin, Dracula, One Dark, Gruvbox); a per-user global theme with a per-deck
  override on the editor canvas.
- **Backgrounds & media** *(solid)* — layered background color/image with inherit/override
  semantics, cover images, and a gallery picker backing every image field.
- **Settings hierarchy** *(solid)* — points, answers, audience, and invite settings resolve
  hardcoded default → deck default → per-slide override, with "apply to deck" promotion.
- **Collaboration & sharing** *(solid)* — per-slide threaded comments with resolution status,
  star-rated deck reviews, deck ACLs (visibility, per-user grants, org scoping, public
  listing, tags).
- **Results-chart authoring** *(partial)* — the chart family and registry exist; only MCQ is
  fully wired end-to-end today.
- **Deck analytics** *(stub)* — a rich rollup schema (completion, difficulty, discrimination
  index) with no producer yet.

### Presenting & live play

- **Live session lifecycle** *(solid)* — create, join, start, reconnect, heartbeat, end,
  cancel; Redis as the live runtime store with MongoDB as the durable projection.
- **Rounds & phases** *(solid)* — submit → locked → reveal-responses → reveal-results, driven
  by host actions; per-round auto-close timers with pause/resume and host-disconnect
  grace handling (ADR 002).
- **Host board** *(partial)* — lobby, overall results, and dedicated live board views for
  MCQ, Q&A, grid, axis, scales, matching, and drawing; number, text, ranking, allocation,
  and place-on-image still fall back to a generic placeholder.
- **Realtime transport** *(solid)* — STOMP over WebSocket, broadcast-only: writes go over
  REST, live deltas arrive as session events on a per-session topic.
- **Presenter mode** *(stub)* and **session chat/reactions** *(stub)* — routes and components
  scaffolded, not implemented.

### Audience participation

- **Join flow** *(partial)* — QR + room-code join with display names; guest join is coded but
  the session route is still registered-only, so the guest path isn't end-to-end yet.
- **Interactive slide types** *(solid to partial)* — MCQ (multi-correct), axis, drawing (with
  S3-stored submissions and results gallery), grid, matching, scales, ranking, allocation,
  number, text, and Q&A with host answers and a live word-cloud view.
- **Best-answer voting** *(solid)* — the `VOTE` phase opens voting on the *current* round's
  own free-text/number/drawing submissions; the top-voted answer earns a flat
  `bestAnswerPoints` bonus, and answers that drew votes while being wrong earn
  `deceptionPoints`.
- **Follow-up rounds** *(partial)* — a follow-up slide runs as an ordinary round built from
  the parent round's submissions (`BEST_ANSWER_VOTE` — pick the best — or `PREDICT_POPULAR`
  — guess the most-picked option); authoring, minting, and the board are done, but a
  follow-up pick awards no points in v1.

### Data & scoring

- **Answer pipeline** *(solid)* — typed payloads per slide kind, server-side evaluation and
  scoring, live leaderboard.
- **Live tallies vs. durable results** *(partial)* — Redis tallies cover most types live;
  durable per-option counts currently persist for MCQ/number/text only — a documented gap for
  post-round charting.
- **Deck stats** *(partial)* — rating average/count are written; play/score fields are modeled
  but not yet computed.

### Accounts & membership

- **Auth** *(solid)* — Google OAuth plus guest sessions, cookie-based with Redis-backed
  sessions, refresh rotation with reuse detection, and documented, checked-off security
  invariants.
- **Organizations** *(partial)* — org membership and roles with org-scoped decks, themes, and
  galleries; management UI and org CRUD are minimal.
- **Membership tiers** *(partial)* — free/individual/org tiers with live entitlement
  resolution; no payment integration yet (explicitly out of scope so far). Pricing page and
  achievements page are scaffolds.

### Media & theming infrastructure

- **Image platform** *(solid)* — self-hosted S3-compatible storage (Garage), per-user and org
  galleries, SSRF-guarded remote-image ingestion, presigned URL delivery.
- **Design system** *(solid)* — CSS-custom-property tokens and CSS Modules (no utility
  framework), a published `ds-bundle`, and a Figma Code Connect / design-sync pipeline.

## Platform

| Layer | Stack |
| ----- | ----- |
| Frontend | React 19 (React Compiler) + TypeScript strict + Vite; TanStack Router; Redux Toolkit + RTK Query over a generated OpenAPI client |
| Backend | Java 26 + Spring Boot 4, feature-based packages under `com.cephadex.ambi` |
| Data | MongoDB (durable), Redis (sessions, live-game runtime, tallies, deadlines), Garage S3 (media) |
| Realtime | STOMP over WebSocket, server broadcast-only |
| Contracts | SpringDoc OpenAPI → `npm run generate` (API client, validation constants, enums); generated artifacts committed, never hand-edited |
| Quality gates | Tiered local checks: pre-commit hook (fast oxlint, Stylelint, doc-lint), per-feature `scripts/check-feature.sh` (typecheck, type-aware lint, backend compile + null-analysis, docs), pre-push hook (full test suites on push to main) |

See [infrastructure](infrastructure/README.md) for the full picture and
[glossary](glossary.md) for domain vocabulary.

## Docs that still carry the old identity

Follow-up work once this draft is approved — replace the "learning project / brain games /
paired-down Cephadex Games" framing in:

- `AGENTS.md` (line 3) — "competitive brain games. Learning project … paired-down version of
  Cephadex Games."
- `frontend/src/pages/LandingPage/LandingPage.tsx` — live marketing copy still sells brain
  training ("Train. Compete. Conquer.", "50+ Brain Games", daily puzzles/drills). The biggest
  mismatch, since it is user-facing product copy.
- `ds-bundle/README.md` — "Ambi is a competitive brain-games web app."
- `z-docs/security-report-2026-07-12.md` — frames accepted risks as "learning project"
  trade-offs; those acceptances should be re-justified against the enterprise bar.
- `z-docs/decisions/001-observability-stack.md` and
  `z-docs/runbooks/using-the-observability-stack.md` — cost constraints argued from
  "learning project" scale.
