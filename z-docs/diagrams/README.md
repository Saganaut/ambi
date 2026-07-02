# Diagrams

Professional, feature-by-feature architecture diagrams for Ambi. Every diagram
is authored as [Mermaid](https://mermaid.js.org/) fenced code blocks so it
renders inline on GitHub and in most Markdown viewers, stays diffable in code
review, and lives next to the docs it illustrates.

## Index

| Diagram set | What it covers | Diagram types |
|---|---|---|
| [System Overview](system-overview.md) | Actors, containers, deployment, observability | context · container · deployment · flow |
| [Domain Model](domain-model.md) | All MongoDB aggregates and their relationships | ERD · class hierarchies |
| [Backend Service Map](backend-services.md) | Every controller → service → store; authz model | component · flow · tables |
| [Authentication & Sessions](authentication.md) | OAuth, guest, refresh, filter chain | state · sequence · flow |
| [Deck Authoring](deck-authoring.md) | Deck editor + backend, settings hierarchy | layering · sequence · state |
| [Non-scorable Slides](content-slide.md) | The four non-scorable display types (Title / Content / Media / Instruction): content records, codegen flow, authoring | class · flow · sequence |
| [Live Session](live-session.md) | Real-time play, lifecycle, event fan-out | state · sequence · flow |
| [Media & Gallery](media-gallery.md) | Image ingest, presigned reads, SSRF proxy | sequence · flow |
| [Collaboration](collaboration.md) | Comment threads and deck reviews | flow · sequence |
| [Frontend Architecture](frontend-architecture.md) | Feature slices, RTK Query, routing | flow · state |

## Related existing diagrams

Some flows are already illustrated elsewhere and are linked from the pages above
rather than duplicated:

- [Live Session Backend Flow](../live-session-flow.md) — transport architecture and the `startRound` publish sequence.
- [Infrastructure](../infrastructure/infrastructure.md) — local vs. planned AWS topology in prose + diagrams.

## Conventions

- **Mermaid only.** Keep diagrams as text; don't commit rendered images. If a
  diagram grows unreadable, split it rather than switching to a binary export.
- **Accuracy over completeness.** Diagrams name real classes, routes, and
  collections. When the code changes, update the diagram in the same PR.
- **One concern per diagram.** Prefer several focused diagrams (a state machine,
  a sequence, a component map) over one that tries to show everything.
- **Link, don't duplicate.** Cross-reference sibling pages and the prose feature
  docs under [`z-docs/features/`](../features/README.md) instead of repeating them.
- **Reachability.** Every new diagram file must be linked from this index so
  `tools/doc-lint.js` can reach it.
