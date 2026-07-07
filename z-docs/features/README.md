# Features

Per-feature design docs. One subfolder (or single file) per feature; each owns its `README.md` plus any supporting notes, mockups, or migration scripts.

## Existing

- [Axis Slides](axis-slides/README.md) — Free-form 2D placement kind: items placed anywhere on a labeled X × Y plane, graded by distance to author-set targets within a tolerance radius.
- [Scales Slides](scales-slides/README.md) — Continuous-slider redesign (spec only): drop the discrete `step`/tick model; author and players drag a marker between the two labeled ends and the position derives the value.
- [Deck Editor](deck-editor/README.md) — `/decks/$deckId/view` authoring dashboard architecture (commit pattern, cache sync, RichText, fullscreen).
- [Follow-Up Slides](follow-up-slides/README.md) — Slides chained off a scorable parent that consume its submissions at runtime: model, invariants (adjacency, one-per-slide, cascade delete), modes, editor UX.
- [Membership](membership/README.md) — Pricing page scaffolding and components.
- [Exception Handling](exceptions.md) — Centralized RFC 9457 ProblemDetail error contract, ApiException hierarchy, 5xx disclosure policy, tiered 404-vs-403.
- [Results Visualization](results-visualization.md) — Which chart suits which slide type, the ChartDatum/registry/adapter pipeline, and the still-missing visualizations (heatmap, diverging bar, image overlay, …) with build priority.
- [Invite Settings](invite-settings.md) — Sharing-preferences model (room code in header, join info on results), design rationale, and where each flag is consumed during a live session.
- [Missing Features](missing-features.md) — Running backlog of cross-cutting gaps and TODOs across features.

## Adding a new feature

1. Create `z-docs/features/<feature-name>/` with a `README.md` describing scope, models, endpoints, and an implementation checklist.
2. Add a row above so the linter can reach it.
3. Drop any supporting docs into the same folder and link them from that feature's `README.md`.
