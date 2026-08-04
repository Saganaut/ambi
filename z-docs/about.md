# About Ambi

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

Maturity at a glance. *Solid* = works end-to-end; *partial* = real but incomplete; *stub* =
scaffold or schema only. Per-feature detail lives in [features](features/README.md).

| Area | State |
| ---- | ----- |
| Deck editor | *Solid* — slide rail, canvas, inspector; per-type editors, auto-commit, notes, instructions |
| Rich text | *Solid* — TipTap, sanitized client-side (DOMPurify) and server-side (OWASP) on write |
| Theming | *Solid* — 16-role palettes, light/dark; "Ambi Light"/"Ambi Dark" from `tokens.css` plus 6 DB presets; per-deck override on the canvas |
| Backgrounds, media, galleries | *Solid* — layered colour/image with inherit-override, cover images, gallery picker everywhere |
| Settings hierarchy | *Solid* — points, answers, audience, invite: default → deck → slide, with "apply to deck" |
| Collaboration & sharing | *Solid* — slide comments, deck reviews, ACLs (visibility, grants, org scoping, tags) |
| Results charts | *Partial* — chart family and registry exist; only MCQ is wired end to end |
| Deck analytics | *Stub* — rollup records only, no repository, service, or caller |
| Live session lifecycle | *Solid* — create, join, start, reconnect, heartbeat, end, cancel; Redis runtime, Mongo projection |
| Rounds & phases | *Solid* — submit → locked → reveal; timers with pause/resume and host-disconnect grace ([ADR 002](decisions/002-live-session-round-timers.md)) |
| Host board | *Solid* — dedicated views for all 13 interactive content types |
| Realtime transport | *Solid* — STOMP over WebSocket, broadcast-only; writes go over REST |
| Presenter mode, chat, reactions | *Stub* — route and components scaffolded only |
| Audience join | *Partial* — QR and room code work, but the session route is registered-only, so the guest path isn't end to end |
| Interactive slide types | *Solid to partial* — every scorable kind plays; drawing and Q&A are never auto-graded, several kinds lack a chart |
| Best-answer voting | *Solid* — `VOTE` phase over the round's text/number/drawing submissions; `bestAnswerPoints` and `deceptionPoints` |
| Follow-up rounds | *Partial* — authoring, minting and board done; only `SPOT_THE_ANSWER` scores |
| Answer pipeline | *Solid* — typed payloads, server-side evaluation, live leaderboard |
| Live vs. durable tallies | *Partial* — durable per-choice counts cover MCQ, number, text and follow-up picks; map- and coordinate-shaped answers aren't collated |
| Deck stats | *Partial* — rating average/count written; play/score fields modelled, not computed |
| Auth | *Solid* — Google OAuth plus guest sessions, Redis-backed cookies, refresh rotation with reuse detection |
| Organizations | *Partial* — membership, roles, org-scoped resources; management UI is minimal |
| Membership tiers | *Partial* — free/individual/org entitlements resolve live; no payment integration (`PaymentProvider` is a placeholder) |
| Image platform | *Solid* — Garage S3, per-user and org galleries, SSRF-guarded ingestion, presigned delivery |
| Design system | *Solid* — token-driven CSS Modules, published `ds-bundle`, Figma Code Connect pipeline |

Security posture is tracked separately as a live backlog — see [security](security/README.md).

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
