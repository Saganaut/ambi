# Entity ↔ DTO mapping — factory methods on the records, no mapper classes

**Rule:** Mapping between domain objects and DTOs lives **on the records themselves**, not in separate mapper/assembler classes. There is no MapStruct, no `*Mapper`, no `*Assembler`.

## Outbound: `static from(...)` on the Response

Every Response record that projects a domain object exposes a static factory named `from`, taking the aggregate (plus whatever context the wire shape needs — counts, a `ViewerPermissions`):

```java
public static DeckResponse from(Deck deck, ViewerPermissions permissions) { … }
public static GalleryResponse from(Gallery gallery, long imageCount, ViewerPermissions permissions) { … }
```

Worked examples: `DeckResponse.from`, `GalleryResponse.from`, `CommentResponse.from`, `AuthorResponse.from`. Controllers/services call `XResponse.from(...)` (often via a small private `toResponse(aggregate, principal)` controller helper that also pulls in `permissionsFor`).

## Inbound: `to<Domain>()` on the Request

A Request record that hydrates a domain object exposes an instance converter named for its target type:

```java
public Slide toSlide() { … }            // SlideRequest
public Deck toDeck() { … }              // UpdateDeckRequest
public UserPreferences toPreferences() // UpdatePreferencesRequest
```

The controller calls `body.toDeck()` / `body.toSlide()` rather than assembling the domain object field-by-field at the call site.

## Why on the record

Records already own the wire shape; co-locating the projection keeps the mapping next to the fields it reads, makes it trivially testable, and avoids a parallel hierarchy of mapper beans that drift from the DTOs. This composes with the [DTO naming rules](../naming-rules.md) — the suffix tells you the direction, the factory name (`from` / `to*`) tells you which way the data flows.
