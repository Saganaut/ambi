# Time & Date Rules

One canonical type at rest (`Instant`) and one mechanism for the standard created/updated pair (`Auditable`).

1. **Use `Instant` for every persisted timestamp** — No `LocalDateTime`, `Date`, `OffsetDateTime`, or `ZonedDateTime` in model classes. `Instant` is an unambiguous UTC point and what Mongo, JSON, and JS `Date` all want.

2. **Use `Auditable` for `createdAt` / `updatedAt`** — Extend `com.cephadex.ambi.common.Auditable` (it declares `@CreatedDate`/`@LastModifiedDate Instant` fields, auto-populated by Spring Data auditing). Never call `setCreatedAt`/`setUpdatedAt` manually, and never re-declare those fields on a subclass.

3. **Domain timestamps stay bespoke** — Timestamps with domain meaning (`sentAt`, `votedAt`, `favoritedAt`, `expiresAt`) keep their own `Instant` field, set in application code. They coexist with `Auditable` on the same document. Do **not** extend `Auditable` when the timestamp is domain-specific, carries a TTL `@Indexed(expireAfter=…)`, or the type is embedded (auditing doesn't fire on embedded documents).

4. **DTOs use `Instant` too** — Let Jackson serialize to ISO-8601 UTC strings; never convert to strings or epoch millis inside the DTO (so OpenAPI codegen produces a typed frontend field). The frontend converts to `Date` at the UI boundary if needed.

5. **Tests** — Prefer `Instant.parse("2026-01-01T00:00:00Z")` over `Instant.now()` for deterministic assertions. For audit fields, mock the auditing handler or set the field after save — never disable auditing globally.
