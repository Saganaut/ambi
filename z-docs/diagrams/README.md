# Diagrams

Feature-by-feature architecture diagrams, authored as
[Mermaid](https://mermaid.js.org/) code blocks so they render inline, stay
diffable, and can be updated in the same commit as the code they describe.

| Diagram set | What it covers |
|---|---|
| [System Overview](system-overview.md) | Actors, containers, the tech stack |
| [Domain Model](domain-model.md) | MongoDB aggregates and their relationships |
| [Backend Service Map](backend-services.md) | Controller → service → store; the authorization model |
| [Authentication & Sessions](authentication.md) | OAuth, guest, refresh, filter chain |
| [Deck Authoring](deck-authoring.md) | Deck editor + backend, settings hierarchy |
| [Live Session](live-session.md) | Real-time play, phases, Redis stores, event fan-out |
| [Media & Gallery](media-gallery.md) | Image ingest, presigned reads, the two byte proxies |
| [Collaboration](collaboration.md) | Comment threads and deck reviews |
| [Frontend Architecture](frontend-architecture.md) | Feature slices, RTK Query, routing |

Infrastructure topology lives in
[infrastructure.md](../infrastructure/infrastructure.md).
