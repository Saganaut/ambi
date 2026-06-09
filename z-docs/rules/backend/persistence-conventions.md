# Persistence & package conventions

Mechanical conventions for documents, controllers, and feature packages. Established across every feature; the point is to remove judgment.

## Document base classes

- Every persisted document extends **`BaseDocument`** (`common/BaseDocument.java`), which supplies `@Id String id` and **identity-based `equals`/`hashCode`** (by `id`, guarded against transient nulls). Don't re-declare an id or hand-roll equality.
- Top-level documents that want the standard created/updated pair extend **`Auditable`** (which extends `BaseDocument`) — see [time-rules.md](../time-rules.md) for the full timestamp policy.

## Collection naming

`@Document(collection = …)` names are **lowercase `snake_case`, plural**: `decks`, `users`, `galleries`, `comment_threads`, `app_images`, `gallery_images`, `deck_analytics`, `round_results`. Mongo field names are likewise snake_cased via `@Field("created_at")`.

> Outlier: `LiveSessions` is PascalCase — legacy, not the pattern. New collections follow snake_case plural.

## Controller shape

- Base path is **`/api/<feature-plural>`** (`/api/decks`, `/api/galleries`, `/api/users`); sub-resources nest (`/api/decks/{deckId}/slides/{slideId}/comment-threads`).
- Methods **return the Response DTO directly** — never `ResponseEntity`. Use `void` + `@ResponseStatus(HttpStatus.NO_CONTENT)` for deletes and other body-less results. Returning the DTO directly lets `GlobalExceptionHandler` own all error mapping (see [exception-rules.md](../exception-rules.md) §6).

## Enums

Enums live in a **`<feature>/enums/`** sub-package (`presentation/deck/enums/`, `user/enums/`, `billing/enums/`); feature-agnostic enums go in `common/enums/` (e.g. `OwnershipType`). No enum is declared inside a model or service class.

## Dependency injection

Services and controllers use **plain constructor injection** — an explicit constructor with manual `this.field = field` assignment. No `@Autowired` (zero in the codebase) and **no Lombok `@RequiredArgsConstructor`** on services/controllers; Lombok is for models only (see [backend-rules.md](../backend-rules.md) §2). Spring wires the single constructor automatically.
