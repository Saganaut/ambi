# Features

Per-feature design docs. One subfolder (or single file) per feature; each owns its `README.md` plus any supporting notes, mockups, or migration scripts.

## Existing

- [Deck Editor](deck-editor/README.md) — `/decks/$deckId/view` authoring dashboard architecture (commit pattern, cache sync, RichText, fullscreen).
- [Follow-Up Slides](follow-up-slides/README.md) — Slides chained off a scorable parent that consume its submissions at runtime: model, invariants (adjacency, one-per-slide, cascade delete), modes, editor UX.
- [Membership](membership/README.md) — Pricing page scaffolding and components.
- [Exception Handling](exceptions.md) — Centralized RFC 9457 ProblemDetail error contract, ApiException hierarchy, 5xx disclosure policy, tiered 404-vs-403.
- [Results Visualization](results-visualization.md) — Which chart suits which slide type, the ChartDatum/registry/adapter pipeline, and the missing visualizations (word cloud, histogram, heatmap, …) with build priority.
- [Missing Features](missing-features.md) — Running backlog of cross-cutting gaps and TODOs across features.

## Adding a new feature

1. Create `z-docs/features/<feature-name>/` with a `README.md` describing scope, models, endpoints, and an implementation checklist.
2. Add a row above so the linter can reach it.
3. Drop any supporting docs into the same folder and link them from that feature's `README.md`.
