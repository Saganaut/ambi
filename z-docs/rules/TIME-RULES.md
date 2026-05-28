# Time & Date Rules

Rules for how time is represented in BrainFlex models, DTOs, and APIs. The goal is one canonical type at rest (`Instant`) and one canonical mechanism for the common "row was created / last modified" pair (`Auditable`).

## TL;DR

- Use **`java.time.Instant`** for every persisted timestamp. No `LocalDateTime`, `Date`, `OffsetDateTime`, or `ZonedDateTime` in model classes.
- Use **`Auditable`** for any document whose timestamp story is the standard "created when inserted, updated on every save" pair. Don't roll your own `createdAt`/`updatedAt` fields.
- Domain-specific timestamps (`sentAt`, `votedAt`, `favoritedAt`, `expiresAt`, …) live as their own `Instant` fields, set by application code. These coexist with `Auditable` on the same document.

## Use `Instant` for all timestamps

`Instant` is a single point on the timeline (UTC). It's unambiguous, comparable, and what every other system (Mongo, JSON, JS `Date`) actually wants.

- ✅ `private Instant sentAt = Instant.now();`
- ❌ `private LocalDateTime sentAt = LocalDateTime.now();` — local-time without a zone is a bug waiting to happen
- ❌ `private Date createdAt;` — legacy `java.util.Date` is banned

Frontend converts `Instant` (serialized as ISO-8601 string, e.g. `"2026-05-22T14:03:11.482Z"`) to `Date` at the UI boundary if needed.

### Migrating an existing `LocalDateTime` field

1. Change the type to `Instant`.
2. Change initialization from `LocalDateTime.now()` → `Instant.now()`.
3. Update any service / mapper code that reads the field (most call sites compile-clean because both types support `isBefore`/`isAfter`/`compareTo`).
4. Mongo stores `Instant` natively — no schema migration is required on documents already persisted as BSON datetime; the driver round-trips them.

## Use `Auditable` for `createdAt` / `updatedAt`

`Auditable` is the abstract base in `cephadex.ambi.model.Auditable`. It declares:

```java
@CreatedDate       private Instant createdAt;
@LastModifiedDate  private Instant updatedAt;
```

Spring Data Mongo's auditing (enabled by `@EnableMongoAuditing` in `AmbiApplication`) populates both fields on save. Services must **not** call `setCreatedAt` / `setUpdatedAt` manually.

### Extend `Auditable` when

- The document needs the standard "when was this row created / last modified" pair.
- The field names are exactly `createdAt` and `updatedAt`.
- Spring auto-population on save is the intended behavior.

```java
@Document
public class Deck extends Auditable {
    // own fields…
    // createdAt + updatedAt are inherited and auto-populated
}
```

### Do NOT extend `Auditable` when

- The timestamp has domain semantics (`sentAt`, `votedAt`, `favoritedAt`, `earnedAt`, …) — keep the bespoke field name and set it explicitly in application code.
- The document uses a TTL index on its creation field (e.g. `Notification.createdAt` carries `@Indexed(expireAfter = "...")`) — keep the field manual so the index annotation can live on it.
- The class is embedded (not a top-level `@Document`) — Spring auditing does not fire on embedded documents.

### Domain timestamps coexist with `Auditable`

A single document can extend `Auditable` AND declare its own domain timestamps:

```java
@Document
public class Deck extends Auditable {
    private Instant publishedAt;   // null until published
    private Instant lastPlayedAt;  // updated by play tracking
    // createdAt / updatedAt inherited from Auditable
}
```

## Never duplicate audit fields

A document that extends `Auditable` must not also declare `createdAt` or `updatedAt`. The inherited fields shadow the manual ones in confusing ways and Spring will only populate the parent's. If you find a class doing this, remove the local fields.

## DTOs and API responses

- DTOs use `Instant` for timestamp fields, same as models. The default Jackson serializer renders them as ISO-8601 UTC strings.
- Do **not** convert to strings or epoch millis inside the DTO. Let Jackson handle it so OpenAPI codegen produces a typed field on the frontend.

## Tests

- In tests, prefer `Instant.parse("2026-01-01T00:00:00Z")` over `Instant.now()` so assertions are deterministic.
- For audit field assertions, use `@MockitoBean` on the auditing handler or set the field directly after save in test setup — never disable auditing globally.

## Quick reference

| Situation                                              | Use                                        |
| ------------------------------------------------------ | ------------------------------------------ |
| Standard "row created/updated" on a top-level document | `extends Auditable`                        |
| Domain timestamp (`sentAt`, `votedAt`, `expiresAt`, …) | Own `Instant` field, set in service        |
| Embedded type with its own audit-like fields           | Own `Instant` fields (Spring auditing N/A) |
| TTL-indexed creation timestamp                         | Own `Instant` field with `@Indexed(...)`   |
| DTO / API response timestamp                           | `Instant`, let Jackson serialize           |
