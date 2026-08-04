# Features

Per-feature design docs. One subfolder (or single file) per feature; each owns
its `README.md` plus any supporting notes, mockups, or migration scripts.

Entries below say **what** each doc covers. Maturity and open gaps live in the
doc itself, where they can be kept current.

## Existing

- [Axis Slides](axis-slides/README.md) — free-form 2D placement: items placed anywhere on a labeled X × Y plane, graded by distance to author-set targets.
- [Place-on-Image Slides](place-on-image/README.md) — Axis's sibling: players pin points on a backing image, graded by distance to author-set target circles.
- [Drawing Slides](drawing-slide/README.md) — players freehand-draw on a shared square canvas and submit a rendered PNG.
- [Scales Slides](scales-slides/README.md) — players drag a marker along a continuous labeled scale to rate each statement.
- [Follow-Up Slides](follow-up-slides/README.md) — slides chained off a scorable parent that build their question from the parent round's submissions.
- [Deck Editor](deck-editor/README.md) — the authoring dashboard: commit pattern, cache sync, placement kit, rich text, color pickers, background layers.
- [Membership](membership/README.md) — pricing-page scaffolding ahead of a billing provider.
- [Exception Handling](exceptions.md) — the RFC 9457 ProblemDetail error contract, the `ApiException` hierarchy, 5xx disclosure, and the tiered 404-vs-403 policy.
- [Results Visualization](results-visualization.md) — which chart suits which slide type, and the `ChartDatum`/registry/adapter pipeline that renders it.
- [Image Cropping](image-cropping.md) — placement-only crops: the gallery keeps originals, cropped bytes land in the deck's own S3 namespace.
- [Invite Settings](invite-settings.md) — the deck-level sharing-preferences model and where each flag is consumed during a live session.
- [Code Connect](code-connect.md) — Figma Code Connect mappings for `Btn`/`IconBtn`.
- [Missing Features](missing-features.md) — running backlog of cross-cutting gaps and TODOs.
- [Live-Session Events](live-session-events.md) — the event envelope, sequencing, and snapshot/socket reconciliation contract.

## Adding a new feature

1. Create `z-docs/features/<feature-name>/` with a `README.md` describing scope, models, endpoints, and the seams a newcomer needs.
2. Add a one-clause row above so the linter can reach it.
3. Drop any supporting docs into the same folder and link them from that feature's `README.md`.
