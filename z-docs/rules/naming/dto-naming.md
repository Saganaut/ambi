# DTO / API Naming

**Rule:** Strict, mechanical naming for classes in per-feature `dto/` packages under `backend/src/main/java/com/cephadex/ambi/` (e.g. `presentation/deck/dto/`, `session/dto/`, `session/answer/dto/`, `session/event/dto/`, `media/gallery/dto/`, `auth/dto/`, `user/dto/`). There is no single flat `dto/` folder — every feature package owns its own. The point is to remove judgment — two engineers should agree on a class name without debate.

## 1. Exactly one suffix per category

Every class in a `dto/` package ends in exactly one of these — there is no `*DTO`, `*Query`, `*Info`, `*Result`, `*Envelope`, or no-suffix class. If a class fits none of these, the design is wrong, not the rule. There are two sanctioned exceptions: the `*View` read-model suffix in category 5, and the no-suffix variants of the `MeResponse` sealed interface (`VisitorMe`, `GuestMe`, `PreRegistrationMe`, `RegisteredMe` — see category 2). Outside those two documented cases, `*View` and bare no-suffix names remain banned.

| Suffix     | Direction | Purpose                                                                 | Examples                                                          |
| ---------- | --------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `Request`  | Inbound   | Any client-sent payload — POST/PUT/PATCH bodies *and* GET query objects  | `UpdateDeckRequest`, `SlideRequest`                               |
| `Response` | Outbound  | Anything returned over HTTP — resource reads *and* action result envelopes | `DeckResponse`, `GalleryResponse`, `SessionSnapshotResponse`   |
| `Page<T>`  | Outbound  | Paginated list envelope. Use `Page<T>` directly; subclass only to add summary fields | `Page<DeckResponse>`                                    |
| `View`     | Outbound  | Session read-model / projection record — see category 5                 | `SlideView`, `ParticipantView`, `ScoreboardEntry`                 |

`Response` (not `DTO`) pairs symmetrically with `Request` and signals data direction; `DTO` is redundant when the package is already `dto/`.

## 2. Records, not classes

Every type in `dto/` is a `public record`, with one deliberate exception: `MeResponse` (`auth/dto/MeResponse.java`) is a `sealed interface` implemented by `VisitorMe`, `GuestMe`, `PreRegistrationMe`, and `RegisteredMe` — a discriminated union over identity state, where each variant is itself a record carrying only the fields that exist for it. Outside that documented case: no `class`, no `@Data`/`@Value` Lombok wrappers, no abstract bases. Records make immutability and equality free and play well with Jackson and SpringDoc.

## 3. One type per file

Each `.java` file declares exactly one top-level public type. No inner records, no siblings sharing a file. Tightly-related records (e.g. `AddImageRequest`, `RenameGalleryRequest`) each get their own file — discoverability comes from naming, not co-location.

## 4. No generic envelope types

No reusable wrappers like `ValueRequest<T>`, `Wrapper<T>`, `Envelope<T>`. The only permitted generic is `Page<T>`. Write a named record per use site instead of a generic single-field wrapper.

## 5. Session read-model projections use `View` (and `ScoreboardEntry`)

`session/event/dto/` holds a deliberate family of participant/host-safe read-model projection records used to build live-session snapshots and broadcast payloads: `SlideView`, `ParticipantView`, `AxisConfigView`, `DrawingConfigView`, `GridConfigView`, `MatchingConfigView`, `McqOptionView`, `QAndAConfigView`, `QAndAQuestionView`, `ScalesConfigView`, `ScoreView`, `AnswerSettingsView`, `DrawingSubmissionView`, plus `ScoreboardEntry` (no suffix, by exception — it's a scoreboard row, not a config/settings projection). These are not `Request`/`Response`: they're shared, direction-agnostic read models consumed by `SessionSnapshotResponse` (HTTP) and by the `SessionEvent` broadcast family (STOMP) alike, so tagging them `Response` would be misleading. This is the **only** place `*View` is sanctioned — for ordinary request/response DTOs elsewhere, `*View` is still forbidden by category 1.

## 6. Pagination — prefer `Page<T>` directly

Return `Page<DeckResponse>` directly. Introduce a named `*Page` subclass only when the endpoint needs extra summary fields (histogram, aggregate counts). A `*Page` subclass that adds nothing is forbidden boilerplate.

## 7. Action results are `Response`

An action's confirmation envelope is a `*Response`. Never invent `Result`, `Outcome`, or `Confirmation`.

## 8. Query objects are `Request`

A `@RequestParam`-bound GET filter/sort/search object is `*Request`, same as a write body. There is one inbound suffix.

## 9. Live-session broadcasts are `SessionEvent` implementations, not `*Message` DTOs

STOMP broadcast payloads for live sessions are **not** `dto/` classes and are **not** suffixed `*Message`. They are `com.cephadex.ambi.session.event.SessionEvent` sealed-interface implementations, one file per event, named as bare past-tense facts — `RoundStarted`, `TallyUpdated`, `ResultsRevealed`, `ParticipantJoined`, `LiveSessionEnded`, etc. — living directly under `session/event/` (a sibling of, not inside, `session/event/dto/`). Each is participant-safe by construction (references `participantId`, never `userId`; strips authoring secrets). Polymorphism is resolved by a `@JsonTypeInfo`/`@JsonSubTypes` discriminator (`"type"`) on `SessionEvent`, not by a `Message` suffix convention. These payloads are not part of the OpenAPI schema (see `SessionEvent.java`'s Javadoc), so the frontend types the union by hand.

## 10. Nested component records still take a suffix

A record that exists only as a field inside another payload still lives in `dto/`, still gets its own file, and still ends in a suffix — chosen by the **direction the data flows**, not where it's embedded (or `View` when it's a session read-model projection per category 5). Don't invent a suffix-less "component"/"row"/"detail" type to dodge this.

## Quick decision table

| You are creating…                                                     | Suffix                                       |
| ----------------------------------------------------------------------- | --------------------------------------------- |
| A JSON body for a POST/PUT/PATCH                                       | `Request`                                    |
| A `@RequestParam`-bound query object on a GET                         | `Request`                                    |
| The JSON returned by any HTTP endpoint                                | `Response`                                   |
| A paginated list (no extra fields)                                    | `Page<XxxResponse>`                          |
| A paginated list with summary fields                                  | `XxxPage extends Page<…>`                    |
| A session read-model / projection record shared across snapshot + broadcast | `View` (category 5)                    |
| A STOMP/WebSocket live-session broadcast payload                      | `SessionEvent` implementation, no suffix, not in `dto/` (category 9) |
| A record embedded only inside other payloads                          | `Response` / `Request` by data direction (category 10) |
| Anything that doesn't fit the above                                   | Stop. Rethink. The taxonomy covers every case.|

## Enforcement

```bash
# Anything in a dto/ package that doesn't match the allowed suffix list.
# session/event/dto/ is exempted for its *View + ScoreboardEntry projection family (category 5).
find backend/src/main/java/com/cephadex/ambi -type d -name dto ! -path '*/session/event/dto' \
  | xargs -I{} sh -c 'ls {} | grep -vE "(Request|Response|Page)\.java\$"'
```

A non-empty result means a violation.
