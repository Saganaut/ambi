# DTO / API Naming

**Rule:** Strict, mechanical naming for classes in the per-feature `dto/` packages under `backend/src/main/java/com/cephadex/ambi/`. There is no single flat `dto/` folder — every feature package owns its own. The point is to remove judgment: two engineers should agree on a class name without debate.

## 1. Exactly one suffix per category

Every class in a `dto/` package ends in exactly one of these — no `*DTO`, `*Query`, `*Info`, `*Result`, `*Envelope`, or no-suffix class. If a class fits none of them, the design is wrong, not the rule.

| Suffix     | Direction | Purpose                                                                 | Examples                                                        |
| ---------- | --------- | ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| `Request`  | Inbound   | Any client-sent payload — POST/PUT/PATCH bodies *and* `@RequestParam`-bound GET query objects | `UpdateDeckRequest`, `SlideRequest`       |
| `Response` | Outbound  | Anything returned over HTTP — resource reads *and* action result envelopes | `DeckResponse`, `GalleryResponse`, `SessionSnapshotResponse`   |
| `Page<T>`  | Outbound  | Paginated list envelope. Use `Page<T>` directly; subclass only to add summary fields | `Page<DeckResponse>`                              |
| `View`     | Outbound  | Session read-model / projection record — see §5                         | `SlideView`, `ParticipantView`                                   |

Two exceptions are sanctioned: the `*View` family in §5, and the no-suffix `MeResponse` variants in §2.

## 2. Records, not classes

Every type in `dto/` is a `public record` — no `class`, no `@Data`/`@Value` Lombok wrapper, no abstract base. One deliberate exception: `MeResponse` (`auth/dto/MeResponse.java`) is a `sealed interface` over identity state, implemented by the records `VisitorMe`, `GuestMe`, `PreRegistrationMe`, and `RegisteredMe`.

## 3. One type per file

Each `.java` file declares exactly one top-level public type. No inner records, no siblings sharing a file — discoverability comes from naming, not co-location.

## 4. No generic envelope types

No `ValueRequest<T>`, `Wrapper<T>`, or `Envelope<T>`. `Page<T>` is the only permitted generic. Write a named record per use site instead.

## 5. Session read-model projections use `View`

Every record in `session/event/dto/` is a participant/host-safe read-model projection suffixed `*View` — plus `ScoreboardEntry` (no suffix, by exception: it's a scoreboard row, not a config/settings projection). They are direction-agnostic, consumed by `SessionSnapshotResponse` (HTTP) and the `SessionEvent` broadcast family (STOMP) alike, so tagging them `Response` would mislead. This is the **only** place `*View` is sanctioned.

## 6. Suffix edge cases

- **Pagination** — return `Page<XxxResponse>` directly; a named `*Page` subclass only when the endpoint adds summary fields (histogram, aggregate counts).
- **Action results** — an action's confirmation envelope is a `*Response`. Never `Result`, `Outcome`, or `Confirmation`.
- **Nested component records** — a record that exists only as a field inside another payload still lives in `dto/`, still gets its own file, and still takes a suffix, chosen by the direction the data flows (or `View` per §5). Don't invent a suffix-less "component"/"row"/"detail" type to dodge this.

## 7. Live-session broadcasts are not `dto/` classes

STOMP broadcast payloads are `com.cephadex.ambi.session.event.SessionEvent` implementations — one file per event under `session/event/` (a sibling of, not inside, `session/event/dto/`), named as bare past-tense facts: `RoundStarted`, `TallyUpdated`, `ResultsRevealed`. Never suffixed `*Message`. See `SessionEvent.java`'s Javadoc for the discriminator and OpenAPI exclusion.

## Enforcement

```bash
# Anything in a dto/ package that doesn't match the allowed suffix list.
# session/event/dto/ is exempt for its *View + ScoreboardEntry family (§5);
# the four *Me.java records are the sanctioned MeResponse variants (§2).
find backend/src/main/java/com/cephadex/ambi -type d -name dto ! -path '*/session/event/dto' \
  | xargs -I{} sh -c 'ls {} | grep -vE "(Request|Response|Page)\.java\$"' \
  | grep -vE '^(Visitor|Guest|PreRegistration|Registered)Me\.java$'
```

Any result is a violation. One is currently outstanding: `user/dto/AvatarSelection.java`, a nested component record of `UpdateProfileRequest` that should be `AvatarSelectionRequest` under §6.
